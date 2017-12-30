import { TaskBase } from "./task-base";
import { IVideo, IBuilding } from "./input-config";
import { readdir, exists, unlink, mkdirp, emptyDir, copy, remove } from "fs-extra";
import { join, extname, basename, dirname } from "path";
import { Observer, Observable, Subject } from "rxjs";
import { yellow, blue, red, cyan } from "../utils/log-util";
import { resize, ResizeConfig } from "../utils/image-util";
const child_process = require('child_process')
const exec = child_process.exec;
const INPUT_VIDEO_NAME: string = "input.mp4"
const INPUT_REVERSED_VIDEO_NAME: string = "input.reversed.mp4"
const IN_VIDEO_NAME: string = "in"
const OUT_VIDEO_NAME: string = "out"

const unlinkFiles = (files: string[]): Observable<number> => {
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

    private updateProgressLogMessage(info = "") {
        let i: number = this.progressLog.progress
        if (i > this.progressLog.total)
            i = this.progressLog.total
        this.progressLog.message = blue("Generate videos of "
            + this.inputConfig.buildings[this.currentIndex].name)
            + cyan(" (" + i + " of " + this.numVideos * 8 + ") |" + info + "|")
        console.log(this.progressLog.message)
        this.progressLog.progress = this.progressLog.progress
    }
    private _encoder: VideoEncoder
    private get encoder(): VideoEncoder {
        if (!this._encoder)
            this._encoder = new VideoEncoder()
        return this._encoder
    }

    private _currentSrc: string
    private _currentDst: string

    private encodeHandler = cmd => {
        let name: string = basename(cmd.filename)
        let info: string = name
        switch (cmd.status) {
            case "start":
                this.progressLog.progress++
                break
            case "pass1":
                this.progressLog.progress++
            case "pass2":
                info += " " + cmd.status
                break;
            case "done":
                info = null
                break;
            case "error":
                info = null
                console.log(red("Encode error : " + cmd.filename))
                break;

            default:
                break;

        }
        if (info) {
            this.updateProgressLogMessage(info)
        }
    }
    private nextBuilding = () => {
        if (this.currentIndex < this.numVideos) {
            let done = (err?) => {
                es.unsubscribe()
                if (err)
                    console.error(red(String(err)))
                this.currentIndex++
                this.nextBuilding()
            }
            let b: IBuilding = this.currentBuilding
            const srcDir: string = join(this.inputPath, b.src)
            const destDir: string = join(this.outputPath, b.path)
            const _in: string = "in"
            const _out: string = "out"
            const getIn = (ext: "mp4" | "ogv" | "webm" | "m4v", pre: string = "") => {
                return _in + pre + "." + ext
            }
            const getOut = (ext: "mp4" | "ogv" | "webm" | "m4v", pre: string = "") => {
                return _out + pre + "." + ext
            }
            const inSrcName: string = getIn("mp4", ".tmp")
            const outSrcName: string = getOut("mp4", ".tmp")
            const inSrc = join(destDir, inSrcName)
            const outSrc = join(destDir, outSrcName)
            const _lw: number = this.inputConfig.layout.width
            const _lh: number = this.inputConfig.layout.height
            const _br: number = this.inputConfig.video.bitrate
            const _fr: number = this.inputConfig.video.framerate
            const encoder: VideoEncoder = this.encoder
            let es = encoder.events.subscribe(this.encodeHandler)
            let subs = [
                unlinkFiles([
                    join(destDir, getIn("mp4")),
                    join(destDir, getOut("mp4")),
                    join(destDir, getIn("ogv")),
                    join(destDir, getOut("ogv")),
                    join(destDir, getIn("webm")),
                    join(destDir, getOut("webm")),
                    join(destDir, "main.jpg")
                ]),
                Observable.create(obs => {
                    mkdirp(destDir).then(() => {
                        obs.next()
                        obs.complete()
                    })
                }),

                encoder.imgSequence(
                    srcDir, destDir,
                    inSrcName,
                    outSrcName,
                    _lw, _lh, _fr, _br, "h264",
                    "main.jpg", this.inputConfig.jpegQuality),

                encoder.encode("webm", inSrc,
                    join(destDir, getIn("webm")),
                    _br, _lw, _lh),
                encoder.encode("webm", outSrc,
                    join(destDir, getOut("webm")),
                    _br, _lw, _lh),

                encoder.encode("mp4", inSrc,
                    join(destDir, getIn("mp4")),
                    _br, _lw, _lh),
                encoder.encode("mp4", outSrc,
                    join(destDir, getOut("mp4")),
                    _br, _lw, _lh),

                encoder.encode("ogv", inSrc,
                    join(destDir, getIn("ogv")),
                    _br, _lw, _lh),
                encoder.encode("ogv", outSrc,
                    join(destDir, getOut("ogv")),
                    _br, _lw, _lh)

            ]
            const nextSub = () => {
                if (subs.length) {
                    let s = subs.shift().subscribe(
                        res => { },
                        done,
                        () => {
                            s.unsubscribe()
                            nextSub()
                        }
                    )
                }
                else {
                    done()
                }
            }
            nextSub()
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
}



export type EncodeStatus = "start" | "pass1" | "pass2" | "done" | "error"
export type VideoCommand = "ffmpeg" | "HandBrakeCLI"
export type VideoCodec = "h264" | "libx264"
export type VideoFormat = "webm" | "mp4" | "ogv"

export interface VCmd {
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

export interface ImageSequenceCmd extends VCmd {
    start_number?: number
    lastFrame?: string
    files?: string[]
    prefix?: string
    numInt?: number
    imgExt?: string
}

export class VideoEncoder {

    private _imageSequence: Observable<any>
    bitrate: number = 2000
    public events: Subject<VCmd> = new Subject<VCmd>()

    reverseImageSequence(cmd: ImageSequenceCmd): Observable<ImageSequenceCmd> {
        return Observable.create((observer: Observer<ImageSequenceCmd>) => {

        })
    }

    imgSequence(
        inputDir: string,
        outputDir: string,
        videoName: string,
        reversed: string,
        width: number, height: number,
        framerate: number, bitrate: number,
        vcodec: VideoCodec = "libx264",
        lastImage: string = null, jpgQuality: number = .8):
        Observable<ImageSequenceCmd> {

        return Observable.create((observer: Observer<ImageSequenceCmd>) => {
            const notify = cmd => {
                this.events.next(cmd)
                observer.next(cmd)
                observer.complete()
            }
            let done = (err, cmd?: ImageSequenceCmd) => {
                if (err) {
                    s.unsubscribe()
                    return observer.error(err)
                }
                if (lastImage) {

                    let conf: ResizeConfig = {
                        srcPath: join(inputDir, cmd.lastFrame),
                        dstPath: lastImage,
                        quality: jpgQuality,
                        format: 'jpg',
                        width: width,
                        height: height
                    }
                    resize(conf, width, height, false)
                        .then(() => {
                            notify(cmd)
                        })
                        .catch(done)
                }
                else
                    notify(cmd)
            }

            let s = ImageSequence.getCommand(inputDir).subscribe(cmd => {
                const _oldCwd: string = process.cwd()
                cmd.filename = join(outputDir, videoName)
                cmd.s = width + "x" + height
                cmd.an = ""
                cmd.framerate = framerate
                cmd.vcodec = vcodec
                cmd.status = "start"
                cmd.format = "mp4"

                this.events.next(cmd)
                observer.next(cmd)
                //  -b:v 1M -minrate 1M -maxrate 1M
                const imgSeqCmd = (cmd: ImageSequenceCmd, path: string, bitrate: number = NaN) => {
                    let br = ""
                    if (!isNaN(bitrate))
                        br = ` -b:v ${bitrate}k `
                    return `ffmpeg -start_number ${cmd.start_number} -i ${cmd.i} -s ${cmd.s} -vcodec ${vcodec}${br} -an -framerate ${framerate} ${path}`
                }
                let str = imgSeqCmd(cmd, cmd.filename)
                let dirChanged: boolean = false
                const execError = (err?) => {
                    if (!err)
                        return false
                    if (dirChanged)
                        process.chdir(_oldCwd)
                    cmd.status = "error"
                    done(err, cmd)
                    return true
                }
                exec(
                    str,
                    (err, stderr, stdout) => {
                        if (execError(err))
                            return

                        if (reversed) {

                            const _tmdDirname: string = ".tmp"
                            const _tmpPath: string = join(outputDir, _tmdDirname)
                            const _reversedPath: string = join(outputDir, reversed)
                            let i: number = 1
                            mkdirp(join(_tmpPath))
                                .then(() => {
                                    process.chdir(_tmpPath)
                                    dirChanged = true
                                    let files: string[] = cmd.files.slice()
                                    let iArg: string = cmd.prefix + "%0" + cmd.numInt + "d." + cmd.imgExt
                                    let cp = () => {
                                        if (files.length) {
                                            let src = join(inputDir, files.pop())
                                            let dst: string = i.toString()
                                            for (let j = dst.length; j < cmd.numInt; j++) {
                                                dst = "0" + dst
                                            }
                                            dst = cmd.prefix + dst + "." + cmd.imgExt
                                            copy(src, dst)
                                                .then(() => {
                                                    i++
                                                    cp()
                                                }).catch(execError)
                                        }
                                        else {
                                            cmd.i = iArg
                                            cmd.start_number = 1
                                            exec(
                                                imgSeqCmd(cmd, _reversedPath),
                                                (e, stdE, stdO) => {
                                                    process.chdir(_oldCwd)
                                                    dirChanged = false
                                                    remove(_tmdDirname)
                                                        .then(() => {
                                                            if (execError(e)) {
                                                                return
                                                            }
                                                            done(null, cmd)
                                                        })
                                                        .catch(execError)
                                                }
                                            )
                                        }
                                    }
                                    cp()
                                })
                        }
                        else {
                            cmd.status = "done"
                            done(null, cmd)
                        }
                    })
            },
                done,
                () => s.unsubscribe()
            )
        })
    }

    reverse(src: string, dest: string, bitrate: number): Observable<VCmd> {
        return Observable.create((observer: Observer<VCmd>) => {
            let cmd: VCmd = { name: "ffmpeg", status: "start", format: "mp4" }
            cmd.filename = dest
            this.events.next(cmd)
            observer.next(cmd)
            exec(
                /*+ " -maxrate " + bitrate + "K"
                    + " " + bitrate + "K" */
                cmd.name + ` -i ${src} -b:v ${bitrate}k -vf reverse ${dest}`,
                //cmd.name + ` -i ${src} -crf 28 -vf reverse ${dest}`,
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
            //const cmd: VCmd = { name: (format == "mp4" ? "HandBrakeCLI" : "ffmpeg") }
            const cmd: VCmd = { name: "ffmpeg" }
            cmd.i = src
            cmd.filename = dst
            cmd.status = "start"
            cmd.format = format
            const cmdStr: string = cmd.name + " -i " + src
            let str: string = cmdStr
            switch (format) {

                case "webm":
                    // ffmpeg -i input.mp4 -c:v libvpx-vp9 -b:v 2M output.webm
                    // str += ` -c:v libvpx-vp9 -b:v ${bitrate}K -speed 3 ${dst}`


                    // str += ` -c:v libvpx-vp9 -speed 3 ${dst}`
                    cmd.status = "pass1"
                    str += ` -c:v libvpx-vp9 -b:v ${bitrate}k -pass 1 -speed 4 -c:a libopus -f webm /dev/null`
                    break;

                case "ogv": {
                    //str += ` -codec:v libtheora -b:v ${bitrate}K -an ${dst}`
                    str += ` -codec:v libtheora -an ${dst}`
                    break;
                }

                case "mp4": {
                    if (!width || !height)
                        return observer.error("missing dimensions")
                    str += ` -o ${dst} -f av_mp4 -O -e x264 -b ${bitrate} -2 -a none --non-anamorphic -w ${width} -l ${height}`
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
                    /*
                    done()
                    */
                    if (format == "webm") {
                        cmd.status = "pass2"
                        this.events.next(cmd)
                        observer.next(cmd)
                        str = cmdStr + ` -c:v libvpx-vp9 -b:v ${bitrate}k -pass 2 -speed 2 -c:a libopus ${dst}`
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

    handBrake(src: string, dst: string,
        format: VideoFormat, bitrate: number, framerate: number, 
        width: number, height: number): Observable<VCmd> {
        return Observable.create((observer: Observer<VCmd>) => {

        })
    }
}

export class ImageSequence {

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
                    lastFrame: files[files.length - 1],
                    name: "ffmpeg",
                    start_number: data[1],
                    i: join(inputDir, data[0] + "%0" + data[2] + "d." + ext),
                    files: files,
                    imgExt: ext,
                    numInt: Number(data[2]),
                    prefix: data[0]
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
