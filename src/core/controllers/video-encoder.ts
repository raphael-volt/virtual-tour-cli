import { VCmd, VideoEncodeType, VideoCodec, VideoEncodeFormat } from "../model/v-cmd";
import { Observable, Observer, Subject } from "rxjs";
import { exec, spawn } from "child_process";
export class VideoEncoder {

    public events: Subject<VCmd> = new Subject<VCmd>()

    encode(
        src: string, dst: string,
        format: VideoEncodeType, 
        bitrate: number, framerate: number,
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
            let cmd: VCmd = {
                name: "HandBrakeCLI",
                status: "start",
                filename: dst
            }
            this.events.next(cmd)
            let cp = exec(cmdstr, (e, se, so) => {

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

            cp.on("message", (message, sendHandle) => {
                console.log(String(message))
            })
        })
    }
}