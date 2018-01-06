import { VCmd, EncodeStatusDetail, VideoEncodeType, VideoCodec, VideoEncodeFormat } from "../model/v-cmd";
import { Observable, Observer } from "rxjs";
import { exec, spawn } from "child_process";
export class VideoEncoder {

    encode(
        src: string, dst: string,
        format: VideoEncodeType,
        bitrate: number, framerate: number,
        width: number, height: number): Observable<VCmd> {
        return Observable.create((observer: Observer<VCmd>) => {
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
            let cmd: VCmd = {
                name: "HandBrakeCLI",
                status: "start",
                filename: dst
            }
            observer.next(cmd)
            let cp = exec(cmdstr, (e, se, so) => {

                if (e) {
                    cmd.status = "error"
                    return observer.error(e)
                }
                cmd.status = "done"
                observer.next(cmd)
                observer.complete()
            })
            if (cp.stdout) {
                const taskRe: RegExp = /task (\d+)\s+of\s+(\d+)/m
                const percentRe: RegExp = /(\d*)(\.?)(\d*)\s*%/m
                const status: EncodeStatusDetail = {}
                cmd.status = status
                cp.stdout.addListener("data", data => {
                    let m: string[]
                    const str = data.toString()
                    if (taskRe.test(str) && percentRe.test(str)) {
                        m = taskRe.exec(str)
                        status.pass = Number(m[1])
                        status.total = Number(m[2])
                        m = percentRe.exec(str)
                        status.percent = Number(m[1] + "." + m[3])
                        observer.next(cmd)
                    }
                })
            }
        })
    }
}