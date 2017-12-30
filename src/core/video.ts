import { TaskBase } from "./task-base";
import { IVideo, IBuilding } from "./input-config";
import { readdir, exists, unlink, mkdirp, emptyDir, copy, remove } from "fs-extra";
import { join, extname, basename, dirname } from "path";
import { Observer, Observable, Subject } from "rxjs";
import { yellow, blue, red, cyan, green } from "../utils/log-util";
import { resize, ResizeConfig } from "../utils/image-util";
import { EOL } from "os";
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

    private getEncode(format: VideoEncodeType): boolean {
        const formats = this.videoConfig.formats
        if (formats) {
            return formats.indexOf(format) > -1
        }
        return false
    }
    get encodeMp4(): boolean {
        return this.getEncode("mp4")
    }

    get encodeOgv(): boolean {
        return this.getEncode("ogv")
    }

    get encodeWebm(): boolean {
        return this.getEncode("webm")
    }

    protected initProcess() {
        this.printTask("Starting Video task")
        this.numVideos = this.inputConfig.buildings.length

        let numVid: number = 2
        if (this.encodeMp4)
            numVid += 2
        if (this.encodeOgv)
            numVid += 2
        if (this.encodeWebm)
            numVid += 2
        if (numVid == 2) {
            return this.reject("Missing output format")
        }
        this.progressLog.total = this.numVideos * numVid
        this.progressLog.progress = 0

        if (!this.inputConfig.video.bitrate)
            this.inputConfig.video.bitrate = 4000
        if (!this.inputConfig.video.framerate)
            this.inputConfig.video.framerate = 25
        this.nextBuilding()
    }
    private numVideos: number
    private currentIndex: number = 0

    private updateProgressLogMessage(info = null, complete: boolean = false) {
        let message: string = "Generate videos"
        if (this.inputConfig.buildings[this.currentIndex]) {
            message += " of "
                + this.inputConfig.buildings[this.currentIndex].name
                + (info ? " " + info : "")
        }
        this.updateProgress(message, this.progressLog.progress, this.progressLog.total, complete)
        if (process.env.TESTING == "testing")
            console.log(this.progressLog.message)
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
        //console.log(yellow("encodeHandler"), cmd.status, name)
        switch (cmd.status) {
            case "start":
                break
            case "pass1":
            case "pass2":
                info += " " + cmd.status
                break;
            case "done":
                info = null
                this.progressLog.progress++
                break;
            case "error":
                info = null
                console.log(red("Encode error : " + cmd.filename))
                break;

            default:
                break;

        }
        if (info) {
            this.updateProgressLogMessage(yellow(info))
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
            const getVid = (pre, ext) => {
                return pre + "." + ext
            }
            const getIn = (ext: "mp4" | "ogv" | "webm" | "m4v") => {
                return getVid(_in, ext)
            }
            const getOut = (ext: "mp4" | "ogv" | "webm" | "m4v") => {
                return getVid(_out, ext)
            }
            const inSrcName: string = "." + getIn("mp4")
            const outSrcName: string = "." + getOut("mp4")
            const inSrc = join(destDir, inSrcName)
            const outSrc = join(destDir, outSrcName)
            const _lw: number = this.inputConfig.layout.width
            const _lh: number = this.inputConfig.layout.height
            const _br: number = this.inputConfig.video.bitrate
            const _fr: number = this.inputConfig.video.framerate
            const encoder: VideoEncoder = this.encoder
            let es = encoder.events.subscribe(this.encodeHandler)
            let deleteFiles: string[] = [inSrc, outSrc, join(destDir, "main.jpg")]

            if (this.encodeMp4)
                deleteFiles.push(
                    join(destDir, getIn("mp4")),
                    join(destDir, getOut("mp4"))
                )

            if (this.encodeWebm)
                deleteFiles.push(
                    join(destDir, getIn("webm")),
                    join(destDir, getOut("webm"))
                )

            if (this.encodeOgv)
                deleteFiles.push(
                    join(destDir, getIn("ogv")),
                    join(destDir, getOut("ogv"))
                )

            let subs = [

                unlinkFiles(deleteFiles),

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
                    "main.jpg", this.inputConfig.jpegQuality)
            ]
            if (this.encodeMp4)
                subs.push(
                    encoder.handBrake(
                        inSrc, join(destDir, getIn("mp4")),
                        "mp4",
                        _br, _fr, _lw, _lh),

                    encoder.handBrake(
                        outSrc, join(destDir, getOut("mp4")),
                        "mp4",
                        _br, _fr, _lw, _lh)
                )
            if (this.encodeOgv)
                subs.push(
                    encoder.handBrake(
                        inSrc, join(destDir, getIn("ogv")),
                        "ogv",
                        _br, _fr, _lw, _lh),

                    encoder.handBrake(
                        outSrc, join(destDir, getOut("ogv")),
                        "ogv",
                        _br, _fr, _lw, _lh)
                )    
            if (this.encodeWebm)
                subs.push(
                    encoder.handBrake(
                        inSrc, join(destDir, getIn("webm")),
                        "webm",
                        _br, _fr, _lw, _lh),

                    encoder.handBrake(
                        outSrc, join(destDir, getOut("webm")),
                        "webm",
                        _br, _fr, _lw, _lh)
                )
            subs.push(unlinkFiles([inSrc, outSrc]))
            
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

            this.updateProgressLogMessage(null, true)
            this.progressLog.done()
            delete (this.inputConfig.video.bitrate)
            delete (this.inputConfig.video.framerate)
            for (let b of this.inputConfig.buildings)
                delete (b.src)
            this.outputConfig.buildings = this.inputConfig.buildings
            this.outputConfig.video = this.inputConfig.video
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
export type VideoCodec = "x264" | "x265" | "mpeg4" | "mpeg2" | "VP8" | "VP9" | "theora"
export type VideoEncodeFormat = "av_mp4" | "av_mkv"
export type VideoEncodeType = "webm" | "mp4" | "ogv"

export interface VCmd {
    name: VideoCommand
    format?: VideoEncodeType
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
        vcodec: string = "libx264",
        lastImage: string = null, jpgQuality: number = .8):
        Observable<ImageSequenceCmd> {

        return Observable.create((observer: Observer<ImageSequenceCmd>) => {
            const notify = cmd => {
                cmd.status = "done"
                this.events.next(cmd)
                observer.next(cmd)
                observer.complete()
            }
            let done = (err, cmd?: ImageSequenceCmd) => {
                if (err) {
                    s.unsubscribe()
                    return observer.error(err)
                }
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
                        const checkReversed = () => {
                            if (reversed) {
                                cmd.status = "done"
                                this.events.next(cmd)
                                cmd.filename = join(outputDir, reversed)
                                cmd.status = "start"
                                this.events.next(cmd)

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
                                                        remove(_tmpPath)
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
                        }
                        if (lastImage) {
                            resize({
                                srcPath: join(inputDir, cmd.lastFrame),
                                dstPath: join(outputDir, lastImage),
                                quality: jpgQuality,
                                format: 'jpg',
                                width: width,
                                height: height
                            }, width, height, false)
                                .then(checkReversed)
                                .catch(done)
                        }
                        else
                            checkReversed()
                    })
            },
                done,
                () => s.unsubscribe()
            )
        })
    }

    handBrake(src: string, dst: string,
        format: VideoEncodeType, bitrate: number, framerate: number,
        width: number, height: number): Observable<boolean> {
        return Observable.create((observer: Observer<boolean>) => {
            let v: VideoEncodeFormat = "av_mp4"
            let fv: string = ""
            let ev: VideoCodec
            switch (format) {
                case "mp4":
                    ev = "x264"
                    break;

                case "webm":
                    v = "av_mkv"
                    ev = "VP8"
                    break;

                case "ogv":
                    v = "av_mkv"
                    ev = "theora"
                    break;

                default:
                    break;
            }
            let cmdstr: string = `HandBrakeCLI -i ${src} -o ${dst} -f ${v} -O -e ${ev} -b ${bitrate} -2 -a none --non-anamorphic -w ${width} -l ${height}`
            // console.log(cmdstr)
            let cmd: VCmd = {
                name: "HandBrakeCLI",
                status: "start",
                filename: dst
            }
            this.events.next(cmd)
            exec(cmdstr, (e, se, so) => {

                if (e) {
                    cmd.status = "error"
                    this.events.next(cmd)
                    return observer.error(e)
                }
                cmd.status = "done"
                this.events.next(cmd)
                observer.next(true)
                observer.complete()
            })
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
                    filename: "",
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
