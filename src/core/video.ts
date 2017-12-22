import { TaskBase } from "./task-base";
import { IVideo, IBuilding } from "./input-config";
import { readdir, exists, unlink, mkdirp, emptyDir } from "fs-extra";
import { join } from "path";
import { Observer, Observable } from "rxjs";
import { yellow, blue, red, cyan } from "../utils/log-util";
import { resize, ResizeConfig } from "../utils/image-util";
const child_process = require('child_process')
const spawn = child_process.spawn;
const exec = child_process.exec;

const IMG_NUMBER: RegExp = /^([a-z]+)([0]+)(\d+).(\w+)+$/

const getImageNumber = (filename): number => {
    if (IMG_NUMBER.test(filename)) {
        const o = IMG_NUMBER.exec(filename)
        return Number(o[3])
    }
    return NaN
}
const getImagePrefix = (filename): string => {
    if (IMG_NUMBER.test(filename)) {
        const o = IMG_NUMBER.exec(filename)
        return o[1]
    }
    return null
}

const getImageSuiteData = (filename): [string, number, number, string] => {
    if (IMG_NUMBER.test(filename)) {
        const o = IMG_NUMBER.exec(filename)
        return [o[1], Number(o[3]), String(o[3] + o[2]).length, o[4]]
    }
    return null
}
export { IMG_NUMBER, getImagePrefix, getImageNumber, getImageSuiteData }
const INPUT_VIDEO_NAME: string = "input.mp4"
const INPUT_REVERSED_VIDEO_NAME: string = "input.reversed.mp4"
const IN_VIDEO_NAME: string = "in"
const OUT_VIDEO_NAME: string = "out"

export class Video extends TaskBase {

    protected initProcess() {
        console.log(yellow("Starting Video task"))
        this.numVideos = this.inputConfig.buildings.length
        this.progressLog.total = this.numVideos * 4
        this.progressLog.progress = 0
        if (!this.inputConfig.video.handBrakeOptions)
            this.inputConfig.video.handBrakeOptions = {
                bitrate: 4000
            }
        if (!this.inputConfig.video.extension)
            this.inputConfig.video.extension = "m4v"
        if (!this.inputConfig.video.ffmpegOptions.framerate)
            this.inputConfig.video.ffmpegOptions.framerate = 25
        this.nextBuilding()
    }
    private numVideos: number
    private currentIndex: number = 0

    private updateProgressLogMessage() {
        let i: number = this.progressLog.progress + 1
        if (i > this.progressLog.total)
            i = this.progressLog.total
        this.progressLog.message = blue("Generate videos of "
            + this.inputConfig.buildings[this.currentIndex].name)
            + cyan(" (" + i + " of " + this.numVideos * 4 + ")")
        this.progressLog.progress = this.progressLog.progress
    }
    private nextBuilding = () => {
        if (this.currentIndex < this.numVideos) {
            let done = (err?) => {
                if (err)
                    console.error(red(String(err)))
                this.currentIndex++
                this.nextBuilding()
            }
            let dest: string = join(this.outputPath, this.currentBuilding.path)
            emptyDir(dest)
                .then(() => {
                    if (this.currentIndex == 0)
                        this.progressLog.done()
                    this.updateProgressLogMessage()
                    this.generateInput()
                        .then(() => {
                            this.progressLog.progress++
                            this.updateProgressLogMessage()
                            this.generateReversed()
                                .then(() => {
                                    this.progressLog.progress++
                                    this.updateProgressLogMessage()
                                    this.generateIn()
                                        .then(() => {
                                            this.progressLog.progress++
                                            this.updateProgressLogMessage()
                                            this.generateOut()
                                                .then(() => {
                                                    this.progressLog.progress++
                                                    this.updateProgressLogMessage()
                                                    done()
                                                })
                                                .catch(done)
                                        })
                                        .catch(done)
                                })
                                .catch(done)
                        })
                        .catch(done)
                })
        }
        else {
            this.progressLog.message = null
            delete (this.inputConfig.video.ffmpegOptions)
            delete (this.inputConfig.video.handBrakeOptions)
            for (let b of this.inputConfig.buildings)
                delete (b.src)
            this.outputConfig.buildings = this.inputConfig.buildings
            this.outputConfig.video = this.inputConfig.video
            this.progressLog.done()
            this.resolve(true)
        }
    }

    private get videoConfig(): IVideo {
        return this.inputConfig.video
    }

    private get currentBuilding(): IBuilding {
        return this.inputConfig.buildings[this.currentIndex]
    }

    private generateInput(): Promise<void> {
        return new Promise((resolve, reject) => {
            let b: IBuilding = this.currentBuilding
            let src = join(this.inputPath, b.src)
            let dest = join(this.outputPath, b.path)
            exists(src, _exists => {
                if (!_exists)
                    return reject("Input directory does not exists")
                exists(dest, _exists => {
                    let next = () => {
                        this._generateInput()
                            .then(resolve)
                            .catch(reject)
                    }
                    if (!_exists) {
                        mkdirp(dest)
                            .then(next)
                    }
                    else
                        next()
                })
            })
        })
    }
    private _generateInput(): Promise<void> {
        return new Promise((resolve, reject) => {
            let b: IBuilding = this.currentBuilding
            let src = join(this.inputPath, b.src)
            let dest = join(this.outputPath, b.path)

            readdir(src)
                .then(files => {
                    files = this.imageFilter(files)
                    if (!files.length) {
                        console.log(red("No image found, process skiped"))
                        return resolve()
                    }
                    files.sort()
                    let data = getImageSuiteData(files[0])
                    if (!data)
                        return this.reject("Cant get a prefix or a start number from filename:" + files[0])

                    const ext: string = data[3]
                    files = files.filter(filename => {
                        let d = getImageSuiteData(filename)
                        if (!d)
                            return false
                        if (d[0] == data[0] && d[2] == data[2] && d[3] == ext)
                            return true
                        return false
                    })
                    let optionsMap: any = {}
                    optionsMap["framerate"] = this.videoConfig.ffmpegOptions.framerate

                    if (!files.length) {
                        console.log(red("No image found, process skiped"))
                        return resolve()
                    }

                    let options: any[] = [
                        ["start_number", data[1]],
                        ["i", join(b.src, data[0] + "%0" + data[2] + "d." + ext)],
                        ["s", this.inputConfig.layout.width + "x" + this.inputConfig.layout.height],
                        ["an", ""],
                        ["framerate", this.videoConfig.ffmpegOptions.framerate],
                        ["vcodec", "h264"],
                        ["", join(this.outputPath, b.path, IN_VIDEO_NAME + ".mp4")]
                    ]

                    let done = () => {
                        let last = files[files.length - 1]
                        b.image = "main.jpg"
                        let conf: ResizeConfig = {
                            srcPath: join(src, last),
                            dstPath: join(dest, b.image),
                            quality: this.inputConfig.jpegQuality,
                            format: 'jpg',
                            width: this.inputConfig.layout.width,
                            height: this.inputConfig.layout.height
                        }
                        resize(conf, this.inputConfig.layout.width, this.inputConfig.layout.height, false)
                            .then(() => {
                                this.exec("ffmpeg", options)
                                    .subscribe(
                                    message => { },
                                    reject,
                                    resolve
                                    )
                            })
                    }
                    exists(INPUT_VIDEO_NAME, _exists => {
                        if (_exists) {
                            unlink(INPUT_VIDEO_NAME)
                                .then(done)
                                .catch(reject)
                        }
                        else
                            done()
                    })

                }).catch(reject)
        })
    }

    private generateReversed(): Promise<void> {
        return new Promise((resolve, reject) => {
            let b: IBuilding = this.currentBuilding
            let dest = join(this.outputPath, b.path, OUT_VIDEO_NAME + ".mp4")
            let src = join(this.outputPath, b.path, IN_VIDEO_NAME + ".mp4")
            let done = () => {
                this.exec("ffmpeg", [
                    ["i", src],
                    ["vf", null],
                    ["", "reverse"],
                    ["", dest]
                ]).subscribe(
                    message => { },
                    reject,
                    resolve
                    )
            }
            exists(dest, _exists => {
                if (_exists) {
                    unlink(dest)
                        .then(done)
                        .catch(reject)
                }
                else
                    done()
            })
        })
    }

    private generateIn(): Promise<void> {
        let src: string = join(this.outputPath, this.currentBuilding.path, IN_VIDEO_NAME + ".mp4")
        const filename = join(this.outputPath, this.currentBuilding.path, IN_VIDEO_NAME + "." + this.videoConfig.extension)
        return this.encode(src, filename)
    }

    private generateOut(): Promise<void> {
        let src: string = join(this.outputPath, this.currentBuilding.path, OUT_VIDEO_NAME + ".mp4")
        const filename = join(this.outputPath, this.currentBuilding.path, OUT_VIDEO_NAME + "." + this.videoConfig.extension)
        return this.encode(src, filename)
    }

    private encode(input: string, output: string): Promise<void> {
        return new Promise((resolve, reject) => {
            let cmd: string = `HandBrakeCLI -i ${input} -o ${output} -f av_mp4 -O -e x264 -b ${this.inputConfig.video.handBrakeOptions.bitrate} -2 -a none --non-anamorphic -w ${this.inputConfig.layout.width} -l ${this.inputConfig.layout.height}`
            exec(cmd, (err, stderr, stdout) => {
                if (err) {
                    return reject(err)
                }
                unlink(input).then(resolve)
            })
        })
    }

    private exec(command: string, options: [string, any][]): Observable<string> {
        return Observable.create((observer: Observer<string>) => {

            let o: any[] = []
            for (let cmd of options) {
                if (cmd[0].length) {
                    o.push("-" + cmd[0])
                    if (cmd[1])
                        o.push(cmd[1])
                }
                else
                    o.push(cmd[1])
            }
            let cmd: string = command + " " + o.join(" ")
            exec(cmd, (err, stderr, stdout) => {
                if (err) {
                    return observer.error(err)
                }
                observer.next(stdout)
                observer.complete()
            })
        })
    }
}
