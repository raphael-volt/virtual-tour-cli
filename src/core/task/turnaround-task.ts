import { InputConfig, IConfigLayout, ITurnAround, ITurnAroundImage, clone } from "../input-config";
import { LayoutTaskBase } from "./layout-task-base";
import { Observer, Observable } from "rxjs";
import { exists, readdir, emptyDir, writeJson } from "fs-extra";
import { resize, ResizeConfig, imageFilter } from "../../utils/image-util";
import { join } from "path";
import { blue, yellow, cyan, green, bold } from "../../utils/log-util";

const FRAME: string = "frame"
const FRAMES_DIR: string = FRAME + "s"

export class TurnaroundTask extends LayoutTaskBase {

    private fileList: string[]
    private outfileList: string[]
    private dirCheckFlag: boolean
    private numImages: number = 0
    private currentIndex: number = 0

    constructor(
        inputConfig: InputConfig,
        outputConfig: InputConfig,
        inputPath: string,
        outputPath: string
    ) {
        super(inputConfig, outputConfig, inputPath, outputPath, "Turnaround task")
    }

    private currentTurnaround: ITurnAround
    private get turnaround(): ITurnAround {
        return this.inputConfig.turnAround
    }

    private getImageList(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            if (this.fileList)
                return resolve()
            let ta = this.turnaround
            const src: string = join(this.inputPath, ta.src)
            readdir(src)
                .then(files => {
                    files = imageFilter(files)
                    files.sort()
                    const fileslength: number = files.length
                    let num: number = fileslength
                    if (ta.numFrames) {
                        num = ta.numFrames
                    }
                    if (num < fileslength) {
                        let inc: number = fileslength / num
                        let filtered: string[] = []
                        let index: number
                        for (let i = 0; i < fileslength; i += inc) {
                            index = Math.round(i)
                            filtered.push(files[index])
                        }
                        files = filtered
                    }

                    this.progressLog.total = num
                    this.numImages = num
                    this.fileList = files
                    let i: number = 1
                    ta.images = files.map(f => {
                        return { size: 0, src: join(FRAMES_DIR, FRAME + (i++) + ".jpg") }
                    })
                    resolve(files)
                })
                .catch(reject)
        })
    }

    protected layoutTask(config: IConfigLayout): Observable<any> {
        return Observable.create((o: Observer<any>) => {
            console.log(blue("Generate imgages  " + bold(yellow(config.name))))
            const _ta: ITurnAround = this.turnaround
            const dst = join(this.layoutOutputPath, _ta.path)
            const framesDst = join(dst, FRAMES_DIR)
            this.currentIndex = 0
            emptyDir(framesDst)
                .then(() => {
                    this.getImageList()
                        .then(
                        () => {
                            this.encode()
                                .then(() => {
                                    writeJson(
                                        join(this.layoutOutputPath, _ta.path, "frames.json"),
                                        { frames: _ta.images }
                                    ).then(() => {
                                        o.complete()
                                    })
                                })
                                .catch(o.error)
                        }).catch(o.error)
                })
        })
    }

    protected endTask(): Observable<any> {
        const turnaround: ITurnAround = clone<ITurnAround>(this.outputConfig.turnAround)
        delete(turnaround.src)
        this.outputConfig.turnAround = turnaround
        return super.endTask()
    }

    private encode(): Promise<void> {
        return new Promise<void>((res, rej) => {
            let next = () => {
                if (this.currentIndex < this.numImages) {
                    let img: ITurnAroundImage = this.turnaround.images[this.currentIndex]
                    let args: ResizeConfig = {
                        srcPath: join(
                            this.inputPath,
                            this.turnaround.src,
                            this.fileList[this.currentIndex]
                        ),
                        dstPath: join(this.layoutOutputPath, this.turnaround.path, img.src),
                        quality: this.inputConfig.jpegQuality,
                        format: 'jpg',
                        width: 0,
                        height: 0
                    }
                    resize(args, this.layout.width, this.layout.height)
                        .then(size => {
                            img.size = size
                            this.currentIndex++
                            this.updateEncodingProgress(this.currentIndex)
                            next()
                        })
                        .catch(rej)
                }
                else {
                    this.progressLog.message = this.progressLog.message + " " + this.greenCheck
                    this.progressLog.progress = this.numImages
                    this.progressLog.done()
                    res()
                }
            }
            next()
        })
    }

    private updateEncodingProgress = (progress: number, complete: boolean = false) => {
        const n = Math.min(this.numImages, progress + 1)
        let str = blue("Encoding image ") + cyan(`( ${bold((n).toString())} / ${bold((this.numImages).toString())} )`)
        if (complete)
            str += " " + this.greenCheck

        this.progressLog.message = str
        this.progressLog.progress = progress
        if (complete)
            this.progressLog.done()
    }
}