import { InputConfig, IConfigLayout, IBuilding, clone } from "../input-config";
import { LayoutTaskBase } from "./layout-task-base";
import { Observer, Observable, Subscription } from "rxjs";
import { exists, unlink, mkdirp } from "fs-extra";
import { resize, ResizeConfig } from "../../utils/image-util";
import { join, basename } from "path";
import { ImageSequence } from "../controllers/image-sequence";
import { VideoEncoder } from "../controllers/video-encoder";
import { IMGSequenceCmd } from "../model/img-sequence-cmd";
import { VCmd, EncodeStatusDetail, VideoEncodeType } from "../model/v-cmd";
import { ObsQueue, ObsQueueEvent } from "../../utils/obs-queue";
import { blue, cyan, bold, green, yellow } from "../../utils/log-util";
const IN_PREFIX: string = "in"
const OUT_PREFIX: string = "out"

const videoFilename = (prefix: string, ext: string) => {
    return prefix + "." + ext
}

export class BuildingTask extends LayoutTaskBase {

    private dirCheckFlag: boolean
    private buildingIndex: number
    private _in_src_path: string
    private _in_src_cmd: IMGSequenceCmd
    private _out_src_path: string

    private numVideos: number
    private videoIndex: number

    private imgSeq: ImageSequence = new ImageSequence()
    private encoder: VideoEncoder = new VideoEncoder()
    private _queue: ObsQueue = new ObsQueue()

    constructor(
        inputConfig: InputConfig,
        outputConfig: InputConfig,
        inputPath: string,
        outputPath: string
    ) {
        super(inputConfig, outputConfig, inputPath, outputPath, "Building task")
    }

    private chekDir(): Observable<boolean> {
        return Observable.create((observer: Observer<boolean>) => {
            const buildingPath: string = this.buildingDstPath
            exists(buildingPath, e => {
                if (!e)
                    mkdirp(buildingPath).then(() => {
                        observer.complete()
                    })
                else {
                    observer.complete()
                }
            })
        })
    }

    createMainImage(): Observable<boolean> {
        return Observable.create((observer: Observer<boolean>) => {
            const seqCmd = this.buildingsCMD[this.buildingIndex][0]
            let src: string = join(this.buildingSrcPath, seqCmd.files[0])
            let dst: string = join(this.layoutOutputPath, this.inputConfig.image)
            resize(
                {
                    srcPath: src,
                    dstPath: dst,
                    quality: this.jpegQuality,
                    format: "jpg",
                    width: 0, height: 0
                },
                this.layout.width, this.layout.height)
                .then((v?) => {
                    observer.complete()
                })
        })
    }

    createBuildingImage(): Observable<boolean> {
        return Observable.create((observer: Observer<boolean>) => {
            const b = this.building
            const i = this.buildingIndex
            const seqCmd = this.buildingsCMD[i][0]
            let src: string = join(this.buildingSrcPath, seqCmd.lastFrame)
            let dst: string = join(this.buildingDstPath, b.image)
            resize(
                {
                    srcPath: src,
                    dstPath: dst,
                    quality: this.jpegQuality,
                    format: "jpg",
                    width: 0, height: 0
                },
                this.layout.width, this.layout.height)
                .then((v?) => {
                    observer.complete()
                })
        })
    }

    private buildingsCMD: [IMGSequenceCmd, IMGSequenceCmd][] = []
    private buildingsSources: [string, string][] = []

    private getInSrc(): Observable<string> {
        if (this.buildingsSources[this.buildingIndex]) {
            return Observable.of<string>(this.buildingsSources[this.buildingIndex][0])
        }
        return Observable.create((observer: Observer<string>) => {

            let sub: Subscription
            let seqCmd: IMGSequenceCmd
            const done = (err?) => {
                if (sub) {
                    sub.unsubscribe()
                    sub = undefined
                }
                if (err)
                    observer.error(err)
            }
            sub = this.imgSeq.generate(
                this.buildingSrcPath,
                this.outputPath,
                videoFilename(this.building.path + "." + IN_PREFIX, "mp4"),
                this.layout.width,
                this.layout.height,
                this.framerate,
                "h264"
            ).subscribe(cmd => {
                if (cmd.status == "done") {
                    this.buildingsSources[this.buildingIndex] = [cmd.filename, null]
                    this.buildingsCMD[this.buildingIndex] = [cmd, null]
                    observer.next(cmd.filename)
                }
                else
                    this.logVCmd(cmd)
            }, done,
                () => {
                    this.endVideoTask(observer)
                })
        })
    }

    private getOutSrc(): Observable<string> {
        if (this.buildingsSources[this.buildingIndex] && this.buildingsSources[this.buildingIndex][1]) {
            return Observable.of<string>(this.buildingsSources[this.buildingIndex][1])
        }
        return Observable.create((observer: Observer<string>) => {
            this.imgSeq.reverse(
                this.buildingsCMD[this.buildingIndex][0],
                this.buildingSrcPath,
                this.outputPath,
                videoFilename(this.building.path + "." + OUT_PREFIX, "mp4"),
                this.layout.width,
                this.layout.height,
                this.framerate,
                "h264"
            ).subscribe(cmd => {
                if (cmd.status == "done") {
                    this.buildingsSources[this.buildingIndex][1] = cmd.filename
                    this.buildingsCMD[this.buildingIndex][1] = cmd
                    observer.next(cmd.filename)
                }
                else
                    this.logVCmd(cmd)
            }, observer.error, () => this.endVideoTask(observer))
        })
    }

    private encode(src: string, dst: string, format: VideoEncodeType): Observable<VCmd> {
        return this.encoder.encode(
            src, dst, format,
            this.video.bitrate, this.framerate,
            this.layout.width, this.layout.height
        ).map(cmd => {
            if (cmd.status == "done")
                this.endVideoTask()
            else
                this.logVCmd(cmd)
            return cmd
        })
    }

    protected endTask(): Observable<any> {
        return Observable.create((observer: Observer<boolean>) => {
            this.outputConfig.buildings = this.inputConfig.buildings.map(b => {
                b = clone<IBuilding>(b)
                delete (b.src)
                return b
            })
            this.deleteVideoSources().subscribe(
                v => {
                    console.log("deleteVideoSources.next", v)
                },
                err => {
                    observer.error(err)
                },
                () => {
                    observer.complete()
                }
            )
        })

    }

    protected layoutTask(config: IConfigLayout): Observable<any> {
        return Observable.create((o: Observer<any>) => {
            const buildings = this.inputConfig.buildings
            const nBuilding: number = buildings.length
            this.numVideos = 2 * config.video.formats.length * nBuilding
            let bi: number
            for (bi = 0; bi < nBuilding; bi++) {
                if (!this.buildingsSources[bi])
                    this.numVideos += 2
            }
            this.videoIndex = 0
            this.buildingIndex = 0
            this.progressLog.total = this.numVideos
            console.log(blue("Generating videos ") + yellow(bold(config.name)))
            const _q = this._queue

            for (bi = 0; bi < nBuilding; bi++) {
                this.buildingIndex = bi
                _q.add = this.chekDir()
                const hasSrc = Boolean(this.buildingsSources[bi])
                if (!hasSrc)
                    _q.add = this.getInSrc()
                _q.add = this.createMainImage()
                if (!hasSrc)
                    _q.add = this.getOutSrc()
                _q.add = this.createBuildingImage()

                const srcin = this.getInSrcPath()
                const srcout = this.getOutSrcPath()
                for (let f of config.video.formats) {
                    _q.add = this.encode(
                        srcin,
                        join(
                            this.buildingDstPath,
                            videoFilename(IN_PREFIX, f)
                        ),
                        f)
                    _q.add = this.encode(
                        srcout,
                        join(
                            this.buildingDstPath,
                            videoFilename(OUT_PREFIX, f)
                        ),
                        f)
                }

                _q.add = Observable.create(obs => {
                    this.buildingIndex++
                    obs.complete()
                })
            }


            this.buildingIndex = 0
            _q.subsribe(
                val => { },
                o.error,
                () => {
                    this.progressLog.message = this.progressLog.message + " " + this.greenCheck
                    this.progressLog.progress = this.numVideos
                    this.progressLog.done()

                    // console.log("BuildingTask initTask.complete")
                    o.complete()
                }
            )
        })
    }

    deleteVideoSources(): Observable<boolean> {
        return Observable.create((obs: Observer<boolean>) => {
            let files = []
            const nBuilding = this.inputConfig.buildings.length
            for (let i = 0; i < nBuilding; i++) {
                this.buildingIndex = i
                files.push(this.getInSrcPath(), this.getOutSrcPath())
            }
            let next = () => {
                if (files.length) {
                    let f = files.shift()
                    exists(f, e => {
                        if (!e)
                            return next()
                        unlink(f)
                            .then(() => next())
                            .catch(err => obs.error(err))
                    })
                }
                else {
                    // console.log("Video sources have been deleted")
                    obs.complete()
                }
            }
            next()

        })
    }

    private logVCmd(cmd: VCmd) {
        const bn = basename(cmd.filename)

        if (typeof cmd.status == "object")
            return this.logStatusDetail(bn, cmd.status)
        let p: number = this.videoIndex
        const t: string = bold(this.numVideos.toString())
        this.log(`${blue("Encoding " + bold(bn))} ${cyan(`( ${bold((p + 1).toString())} / ${t} )`)}`, p)
    }

    private logStatusDetail(name: string, status: EncodeStatusDetail) {
        let p: number = this.videoIndex
        p += status.percent / 200
        if (status.pass > 1)
            p += .5
        const t: string = bold(this.numVideos.toString())
        this.log(
            `${blue("Encoding " + bold(name))} ${cyan(`( ${bold((this.videoIndex + 1).toString())} / ${t} )`)} [pass ${status.pass} of ${status.total}]`,
            p)
    }

    private log(message: string, progress: number) {
        this.progressLog.message = message
        this.progressLog.progress = progress
    }
    private get building(): IBuilding {
        return this.inputConfig.buildings[this.buildingIndex]
    }

    private get buildingDstPath(): string {
        return join(this.layoutOutputPath, this.building.path)
    }
    private get buildingSrcPath(): string {
        return join(this.inputPath, this.building.src)
    }

    private getInSrcPath(): string {
        return this.getSrcPath(IN_PREFIX)
    }
    private getOutSrcPath(): string {
        return this.getSrcPath(OUT_PREFIX)
    }
    private getSrcPath(prefix: string) {
        return join(this.outputPath, videoFilename(this.building.path + "." + prefix, "mp4"))
    }

    private endVideoTask(observer?: Observer<any>) {
        this.videoIndex++
        if (observer)
            observer.complete()
    }



}