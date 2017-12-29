import { TaskBase } from "./task-base";
import { IVideo, IBuilding } from "./input-config";
import { readdir, exists, unlink, mkdirp, emptyDir } from "fs-extra";
import { join } from "path";
import { Observer, Observable, Subject } from "rxjs";
import { yellow, blue, red, cyan } from "../utils/log-util";
import { resize, ResizeConfig } from "../utils/image-util";
const child_process = require('child_process')
const exec = child_process.exec;
const INPUT_VIDEO_NAME: string = "input.mp4"
const INPUT_REVERSED_VIDEO_NAME: string = "input.reversed.mp4"
const IN_VIDEO_NAME: string = "in"
const OUT_VIDEO_NAME: string = "out"

export class Video extends TaskBase {

    protected initProcess() {
        console.log(yellow("Starting Video task"))
        this.numVideos = this.inputConfig.buildings.length
        this.progressLog.total = this.numVideos * 8
        this.progressLog.progress = 0
        if (!this.inputConfig.video.bitrate)
            this.inputConfig.video.bitrate = 4000
        if (!this.inputConfig.video.framerate)
            this.inputConfig.video.framerate = 25
        this.nextBuilding()
    }
    private numVideos: number
    private currentIndex: number = 0

    private updateProgressLogMessage(filename = "") {
        let i: number = this.progressLog.progress + 1
        if (i > this.progressLog.total)
            i = this.progressLog.total
        this.progressLog.message = blue("Generate videos of "
            + this.inputConfig.buildings[this.currentIndex].name)
            + cyan(" (" + i + " of " + this.numVideos * 8 + ") " + filename)
        this.progressLog.progress = this.progressLog.progress
    }
    private _encoder: VideoEncoder
    private get encoder(): VideoEncoder {
        if (!this._encoder)
            this._encoder = new VideoEncoder()
        return this._encoder
    }
    private unlink(files: string[]): Observable<number> {
        return Observable.create(obs => {
            files = files.slice()
            let i: number = 0
            let next = () => {
                if (files.length) {
                    const src = files.shift()
                    exists(src, ex => {
                        if (ex) {
                            unlink(src).then(() => {
                                obs.next(i++)
                                next()
                            })
                        }
                        else
                            next()
                    })
                }
                else
                    obs.complete()
            }
            next()
        })
    }
    private _currentSrc: string
    private _currentDst: string
    private nextBuilding = () => {
        if (this.currentIndex < this.numVideos) {
            let done = (err?) => {
                es.unsubscribe()
                if (err)
                    console.error(red(String(err)))
                this.currentIndex++
                this.nextBuilding()
            }
            //let dest: string = join(this.outputPath, this.currentBuilding.path)
            let b: IBuilding = this.currentBuilding
            let src = join(this.inputPath, b.src)
            let dest = join(this.outputPath, b.path)
            const _in = "in"
            const _out = "out"
            const _mp4 = "mp4"
            const _webm = "webm"
            const _ogv = "ogv"
            const getIn = (ext: "mp4" | "ogv" | "webm") => {
                return _in + "." + ext
            }
            const getOut = (ext: "mp4" | "ogv" | "webm") => {
                return _out + "." + ext
            }
            const inSrc = join(dest, getIn("mp4"))
            const outSrc = join(dest, getOut("mp4"))
            const _lw: number = this.inputConfig.layout.width
            const _lh: number = this.inputConfig.layout.height
            const _br: number = this.inputConfig.video.bitrate
            const _fr: number = this.inputConfig.video.framerate
            const encoder: VideoEncoder = this.encoder
            let es = encoder.events.subscribe(cmd => {
                switch (cmd.status) {
                    case "start":

                        break;


                    case "pass1":

                        break;

                    case "pass2":

                        break;

                    case "done":

                        break;
                    case "error":

                        break;

                    default:
                        break;

                }
            })
            let s = Observable.concat(
                this.unlink([
                    join(dest, getIn("mp4")),
                    join(dest, getOut("mp4")),
                    join(dest, getIn("ogv")),
                    join(dest, getOut("ogv")),
                    join(dest, getIn("webm")),
                    join(dest, getOut("webm")),
                    join(dest, "main.jpg")
                ]),
                encoder.imgSequence(src, inSrc, _lw, _lh, _fr),
                encoder.reverse(inSrc, outSrc),
                encoder.encode("webm", inSrc,
                    join(dest, getIn("webm")),
                    _br, _lw, _lh),
                encoder.encode("webm", outSrc,
                    join(dest, getOut("webm")),
                    _br, _lw, _lh),
                encoder.encode("ogv", inSrc,
                    join(dest, getIn("ogv")),
                    _br, _lw, _lh),
                encoder.encode("ogv", outSrc,
                    join(dest, getOut("ogv")),
                    _br, _lw, _lh)
            ).subscribe(value => {

            },
                done,
                done)
        }
        else {
            this.progressLog.message = null
            delete (this.inputConfig.video.bitrate)
            delete (this.inputConfig.video.framerate)
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
    /*
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
    */
}



type EncodeStatus = "start" | "pass1" | "pass2" | "done" | "error"
type VideoCommand = "ffmpeg" | "HandBrakeCLI"
type VideoCodec = "h264"
type VideoFormat = "webm" | "mp4" | "ogv"

interface VCmd {
    name: VideoCommand
    format?: VideoFormat
    status?: EncodeStatus
    i?: string
    filename?: string
    an?: string
    vcodec?: string
    s?: string
    framerate?: number
}

interface ImageSequenceCmd extends VCmd {
    start_number?: number
}

class VideoEncoder {

    private _imageSequence: Observable<any>
    bitrate: number = 2000
    public events: Subject<VCmd> = new Subject<VCmd>()

    imgSequence(inputDir: string, videoPath: string,
        width: number, height: number, framerate: number, vcodec: VideoCodec = "h264"): Observable<ImageSequenceCmd> {
        return Observable.create((observer: Observer<ImageSequenceCmd>) => {

            let done = (err, cmd?: ImageSequenceCmd) => {
                if (err) {
                    s.unsubscribe()
                    return observer.error(err)
                }
                this.events.next(cmd)
                observer.next(cmd)
                observer.complete()
            }
            let s = ImageSequence.getCommand(inputDir).subscribe(cmd => {
                cmd.filename = videoPath
                cmd.s = width + "x" + height
                cmd.an = ""
                cmd.framerate = framerate
                cmd.vcodec = vcodec
                cmd.status = "start"
                cmd.format = "mp4"
                this.events.next(cmd)
                observer.next(cmd)

                const str = "ffmpeg -start_number " + cmd.start_number + " -i " + cmd.i
                    + " -s " + cmd.s + " -an -framerate " + framerate
                    + " -vcodec " + vcodec
                    + " " + videoPath
                exec(
                    str,
                    (err, stderr, stdout) => {
                        if (err) {
                            cmd.status = "error"
                            return done(err, cmd)
                        }
                        cmd.status = "done"
                        done(null, cmd)
                    })
            },
                done,
                () => s.unsubscribe()
            )
        })
    }

    reverse(src: string, dest: string): Observable<VCmd> {
        return Observable.create((observer: Observer<VCmd>) => {
            let cmd: VCmd = { name: "ffmpeg", status: "start", format: "mp4" }
            this.events.next(cmd)
            observer.next(cmd)
            exec(
                cmd.name + " -i " + src + " -vf reverse " + dest,
                (err, stderr, stdout) => {
                    if (err) {
                        cmd.status = "error"
                        this.events.next(cmd)
                        return observer.error(err)
                    }

                    cmd.status = "done"
                    this.events.next(cmd)
                    observer.next(cmd)
                    observer.complete()
                }
            )
        })
    }

    encode(format: VideoFormat, src: string, dst: string, bitrate: number, width?: number, height?: number): Observable<VCmd> {
        return Observable.create((observer: Observer<VCmd>) => {
            const cmd: VCmd = { name: (format == "mp4" ? "HandBrakeCLI" : "ffmpeg") }
            cmd.i = src
            cmd.filename = dst
            cmd.status = "start"
            cmd.format = format
            const cmdStr: string = cmd.name + " -i " + src
            let str: string = cmdStr
            switch (format) {

                case "webm":
                    cmd.status = "pass1"
                    const tmpFile: string = "/dev/null"
                    str += " -c:v libvpx-vp9 -b:v " + bitrate + "K -pass 1"
                        + " -speed 4 -c:a libopus -an -f webm -y " + tmpFile
                    break;

                case "ogv": {
                    str += " -codec:v libtheora -b:v " + bitrate + "K -an " + dst
                    break;
                }

                case "mp4": {
                    if (!width || !height)
                        return observer.error("missing dimensions")
                    str += `-o ${dst} -f av_mp4 -O -e x264 -b ${bitrate} -2 -a none --non-anamorphic -w ${width} -l ${height}`
                    break;
                }

                default:
                    break;
            }
            observer.next(cmd)
            this.events.next(cmd)
            const done = () => {
                cmd.status = "done"
                this.events.next(cmd)
                observer.next(cmd)
                observer.complete()
            }
            exec(
                str,
                (err, stderr, stdout) => {
                    if (err) {
                        cmd.status = "error"
                        this.events.next(cmd)
                        return observer.error(err)
                    }

                    if (format == "webm") {
                        cmd.status = "pass2"
                        this.events.next(cmd)
                        observer.next(cmd)
                        str = cmdStr + " -c:v libvpx-vp9 -b:v " + bitrate + "K -pass 2"
                            + " -speed 1 -c:a libopus -an " + dst
                        exec(
                            str,
                            (err, stre, stdo) => {
                                if (err) {
                                    cmd.status = "error"
                                    this.events.next(cmd)
                                    return observer.error(err)
                                }
                                done()
                            }
                        )
                        return
                    }
                    done()
                }
            )
        })
    }
}
import { extname } from "path";
class ImageSequence {

    static readonly getCommand = (inputDir: string): Observable<ImageSequenceCmd> => Observable.create((observer: Observer<ImageSequenceCmd>) => {
        readdir(inputDir)
            .then(files => {
                files = ImageSequence.imageFilter(files)
                if (!files.length)
                    return observer.error("No image found")
                files.sort()
                let data = ImageSequence.getImageSuiteData(files[0])
                if (!data)
                    return observer.error("Cant get a prefix or a start number from filename:" + files[0])

                const ext: string = data[3]
                files = files.filter(filename => {
                    let d = ImageSequence.getImageSuiteData(filename)
                    if (!d)
                        return false
                    if (d[0] == data[0] && d[2] == data[2] && d[3] == ext)
                        return true
                    return false
                })
                if (!files.length) {
                    return observer.error("No image found, process skiped")
                }
                observer.next({
                    name: "ffmpeg",
                    start_number: data[1],
                    i: join(inputDir, data[0] + "%0" + data[2] + "d." + ext)
                })
                observer.complete()
            })
    })

    static readonly EXTENSIONS = ["jpg", "jpeg", "png", "gif"]
    static readonly IMG_NUMBER: RegExp = /^([a-z]+)([0]+)(\d+).(\w+)+$/

    static readonly getImageNumber = (filename): number => {
        if (ImageSequence.IMG_NUMBER.test(filename)) {
            const o = ImageSequence.IMG_NUMBER.exec(filename)
            return Number(o[3])
        }
        return NaN
    }

    static readonly getImagePrefix = (filename): string => {
        if (ImageSequence.IMG_NUMBER.test(filename)) {
            const o = ImageSequence.IMG_NUMBER.exec(filename)
            return o[1]
        }
        return null
    }

    static readonly getImageSuiteData = (filename): [string, number, number, string] => {
        if (ImageSequence.IMG_NUMBER.test(filename)) {
            const o = ImageSequence.IMG_NUMBER.exec(filename)
            return [o[1], Number(o[3]), String(o[3] + o[2]).length, o[4]]
        }
        return null
    }

    static readonly imageFilter = (files: string[]): string[] => {
        return files.filter(name => {
            let ex = extname(name)
            if (!ex)
                return false
            ex = ex.toLowerCase()
            ex = ex.replace(".", "")
            return ImageSequence.EXTENSIONS.indexOf(ex) > -1
        })
    }

}
