import { red, yellow } from "../../utils/log-util";
import { IExec, CLIEvent } from "./i-exec";
import { VCmd, VideoEncodeType, VideoCodec, VideoEncodeFormat } from "../model/v-cmd";
import { IMGSequenceCmd } from "../model/img-sequence-cmd";
import { Observable, Observer, Subject } from "rxjs";
import { join, extname } from "path";
import { readdir, exists, unlink } from "fs-extra";
export class ImageSequence extends IExec {
    
    events: Subject<IMGSequenceCmd> = new Subject<IMGSequenceCmd>()
    
    encode(
        srcDir: string, destDir: string,
        videoName: string,
        w: number, h: number, framerate: number, bitrate: number,
        vcodec: "h264" | "libx264"
    ) {
        
        let cmd: IMGSequenceCmd = {
            name: "ffmpeg",
            status: "start",
            filename: join(destDir, videoName)
        }
        this.notify(cmd)
        let start = () => {
            this.getCommand(srcDir, cmd)
                .subscribe(c => {
                    cmd = c
                    cmd.s = w + "x" + h
                    cmd.framerate = framerate
                    cmd.vcodec = vcodec
                    cmd.status = "pass1"
                    cmd.format = "mp4"
                    this.notify(cmd)
                    let args = this.imgSeqCmdArgs(cmd, cmd.filename, vcodec, bitrate)
                    let _closed = false
                    let _exit = false
                   
                    this.spawn(cmd.name, args)
                        .subscribe(event => {
                            console.log(event.event, event.code, event.signal)
                            switch (event.event) {
                                case "close": {
                                    _closed = true
                                    break
                                }
                                case "exit": {
                                    _exit = true
                                    break
                                }
                                case "message": {
                                    console.log("[MESSAGE]")
                                    console.log(event)
                                    break
                                }
                                
                                case "data": {
                                    console.log("[DATA]")
                                    console.log(event.data)
                                    break
                                }

                            }
                            if (_closed && _exit) {
                                cmd.status = "done"
                                this.notify(cmd)
                            }
                        },
                        err => {
                            cmd.status = "error"
                            this.notify(cmd)
                        })
                })
        }
        exists(cmd.filename, e => {
            if (e)
                unlink(cmd.filename)
                    .then(start)
            else
                start()
        })

    }

    private imgSeqCmdArgs(cmd: IMGSequenceCmd, path: string, vcodec: string, bitrate: number = NaN): string[] {
        let args: string[] = [
            "-start_number", String(cmd.start_number),
            "-i", cmd.i,
            "-s", cmd.s,
            "-vcodec", vcodec
        ]
        if (!isNaN(bitrate))
            args.push("-b:v", String(bitrate))
        args.push(
            "-an",
            "-framerate", String(cmd.framerate),
            path
        )
        return args
    }

    private notify(cmd) {
        this.events.next(cmd)
    }

    private getCommand(inputDir: string, cmd: IMGSequenceCmd): Observable<IMGSequenceCmd> {
        return Observable.create((observer: Observer<IMGSequenceCmd>) => {
            readdir(inputDir)
                .then(files => {
                    files = this.imageFilter(files)
                    if (!files.length)
                        return observer.error("No image found")
                    files.sort()
                    let data = this.getImageSuiteData(files[0])
                    if (!data)
                        return observer.error("Cant get a prefix or a start number from filename:" + files[0])

                    const ext: string = data[3]
                    files = files.filter(filename => {
                        let d = this.getImageSuiteData(filename)
                        if (!d)
                            return false
                        if (d[0] == data[0] && d[2] == data[2] && d[3] == ext)
                            return true
                        return false
                    })
                    if (!files.length) {
                        return observer.error("No image found, process skiped")
                    }
                    cmd.lastFrame = files[files.length - 1]
                    cmd.start_number = data[1]
                    cmd.i = join(inputDir, data[0] + "%0" + data[2] + "d." + ext)
                    cmd.files = files
                    cmd.imgExt = ext
                    cmd.numInt = Number(data[2])
                    cmd.prefix = data[0]
                    observer.next(cmd)
                    observer.complete()
                })
        })
    }

    readonly EXTENSIONS = ["jpg", "jpeg", "png", "gif"]
    readonly IMG_NUMBER: RegExp = /^([a-z]+)([0]+)(\d+).(\w+)+$/

    getImageNumber(filename): number {
        if (this.IMG_NUMBER.test(filename)) {
            const o = this.IMG_NUMBER.exec(filename)
            return Number(o[3])
        }
        return NaN
    }

    getImagePrefix(filename): string {
        if (this.IMG_NUMBER.test(filename)) {
            const o = this.IMG_NUMBER.exec(filename)
            return o[1]
        }
        return null
    }

    getImageSuiteData(filename): [string, number, number, string] {
        if (this.IMG_NUMBER.test(filename)) {
            const o = this.IMG_NUMBER.exec(filename)
            return [o[1], Number(o[3]), String(o[3] + o[2]).length, o[4]]
        }
        return null
    }

    imageFilter(files: string[]): string[] {
        return files.filter(name => {
            let ex = extname(name)
            if (!ex)
                return false
            ex = ex.toLowerCase()
            ex = ex.replace(".", "")
            return this.EXTENSIONS.indexOf(ex) > -1
        })
    }

}