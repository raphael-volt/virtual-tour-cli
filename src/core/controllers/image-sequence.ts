import { red, yellow } from "../../utils/log-util";
import { exec } from "child_process";
import { VCmd, EncodeStatusDetail, VideoEncodeType, VideoCodec, VideoEncodeFormat } from "../model/v-cmd";
import { IMGSequenceCmd } from "../model/img-sequence-cmd";
import { Observable, Observer } from "rxjs";
import { join, extname } from "path";
import { readdir, exists, unlink, mkdirp, copy, remove } from "fs-extra";
export class ImageSequence {

    reverse(
        cmd: IMGSequenceCmd, srcDir: string, destDir: string,
        videoName: string,
        w: number, h: number, framerate: number,
        vcodec: "h264" | "libx264"): Observable<IMGSequenceCmd> {

        return Observable.create((obs: Observer<IMGSequenceCmd>) => {

            cmd.status = "start"
            cmd.filename = join(destDir, videoName)
            obs.next(cmd)

            const _tmdDirname: string = ".tmp"
            const _tmpPath: string = join(destDir, _tmdDirname)
            const _reversedPath: string = join(destDir, videoName)
            let i: number = 1
            const _oldCwd: string = process.cwd()
            let dirChanged: boolean = false
            const execError = (err?) => {
                if (!err)
                    return false
                if (dirChanged)
                    process.chdir(_oldCwd)
                dirChanged = false
                cmd.status = "error"
                obs.error(cmd)
                return true
            }

            mkdirp(_tmpPath)
                .then(() => {
                    process.chdir(_tmpPath)
                    dirChanged = true
                    let files: string[] = cmd.files.slice()
                    let iArg: string = cmd.prefix + "%0" + cmd.numInt + "d." + cmd.imgExt
                    let cp = () => {
                        if (files.length) {
                            let src = join(srcDir, files.pop())
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
                            let args = this.imgSeqCmdArgs(cmd, cmd.filename, vcodec, NaN, 1)

                            let done = (err?) => {
                                remove(_tmpPath)
                                    .then(() => {
                                        if (execError(err))
                                            return
                                        if (dirChanged)
                                            process.chdir(_oldCwd)
                                        dirChanged = false
                                        cmd.status = "done"
                                        obs.next(cmd)
                                        obs.complete()
                                    })
                            }
                            const saveSubDone = (err?) => {
                                saveSub.unsubscribe()
                                done(err)
                            }
                            let saveSub = this.saveSequence(cmd, args, w, h, framerate, vcodec)
                                .subscribe(cmd => {
                                    if (cmd.status == "done")
                                        return
                                    obs.next(cmd)
                                }, saveSubDone, saveSubDone
                                )
                        }
                    }
                    cp()
                })
        })


    }

    generate(
        srcDir: string, destDir: string,
        videoName: string,
        w: number, h: number, framerate: number,
        vcodec: "h264" | "libx264"
    ): Observable<IMGSequenceCmd> {

        return Observable.create((_o: Observer<IMGSequenceCmd>) => {
            let cmd: IMGSequenceCmd = {
                name: "ffmpeg",
                status: "start",
                filename: join(destDir, videoName)
            }
            _o.next(cmd)
            let cmdDone = (err?) => {
                sub.unsubscribe()
                if (err)
                    return _o.error(err)
            }
            let sub = this.getCommand(srcDir, cmd)
                .subscribe(c => {
                    cmd = c
                    cmd.s = w + "x" + h
                    cmd.framerate = framerate
                    cmd.vcodec = vcodec
                    cmd.format = "mp4"
                    let args = this.imgSeqCmdArgs(cmd, cmd.filename, vcodec, NaN, 1)

                    let done = (err?) => {
                        if (err)
                            return _o.error(err)

                        _o.complete()
                    }
                    const saveSubDone = (err?) => {
                        saveSub.unsubscribe()
                        done(err)
                    }
                    let saveSub = this.saveSequence(cmd, args, w, h, framerate, vcodec)
                        .subscribe(cmd => {
                            _o.next(cmd)
                        }, saveSubDone, saveSubDone)
                }, cmdDone, cmdDone)
        })

    }

    private saveSequence(cmd: VCmd, args: string[],
        w: number, h: number, framerate: number, vcodec: string): Observable<IMGSequenceCmd> {

        return Observable.create((_o: Observer<IMGSequenceCmd>) => {
            const status: EncodeStatusDetail = { pass: 1, total: 2, percent: 0 }
            cmd.status = status
            status.pass = 1
            status.total = 2
            status.percent = 0
            _o.next(cmd)
            exec(cmd.name + " " + args.join(" "), (err, stdo, stde) => {
                if (err)
                    return _o.error(err)
                status.pass = 2
                _o.next(cmd)
                args = this.imgSeqCmdArgs(cmd, cmd.filename, vcodec, this.getPreferedBitrate(w, h, framerate), 2)
                exec(cmd.name + " " + args.join(" "),
                    (err, stdo, stde) => {
                        if (err)
                            return _o.error(err)
                        cmd.status = "done"
                        _o.next(cmd)
                        _o.complete()
                    }
                )
            })
        })
    }

    getPreferedBitrate(width: number, height: number, framerate: number): number {
        // w * h * f * r = 1420
        return Math.round(.000275463 * width * height * framerate)
    }

    private imgSeqCmdArgs(cmd: IMGSequenceCmd, path: string, vcodec: string, bitrate: number = NaN, pass: number = 0): string[] {
        let args: string[] = [
            "-y",
            "-start_number", String(cmd.start_number),
            "-i", cmd.i,
            "-s", cmd.s,
            "-vcodec", vcodec
        ]
        if (!isNaN(bitrate))
            args.push("-b:v", String(bitrate) + "k")
        if (pass > 0)
            args.push("-pass", String(pass))
        if (pass == 1) {
            path = "/dev/null"
            args.push("-f", "mp4")
        }
        args.push(
            "-an",
            "-framerate", String(cmd.framerate),
            path
        )
        return args
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