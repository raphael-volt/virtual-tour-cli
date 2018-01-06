import { InputConfig, IConfigLayout, ICarousel, clone } from "../input-config";
import { LayoutTaskBase } from "./layout-task-base";
import { Observer, Observable } from "rxjs";
import { exists, readdir, emptyDir } from "fs-extra";
import { resize, ResizeConfig, imageFilter } from "../../utils/image-util";
import { join } from "path";
import { blue, yellow, cyan, green, bold } from "../../utils/log-util";

export class CarouselTask extends LayoutTaskBase {

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
        super(inputConfig, outputConfig, inputPath, outputPath, "Carousel task")
    }

    protected layoutTask(config: IConfigLayout): Observable<any> {
        return Observable.create((o: Observer<any>) => {
            console.log(blue("Generate images  " + bold(yellow(config.name))))
            const _car: ICarousel = this.inputConfig.carousel
            emptyDir(join(this.layoutOutputPath, _car.path))
                .then(() => {
                    let s = this.createFileList()
                        .subscribe(
                        v => { },
                        o.error,
                        () => {
                            if (s)
                                s.unsubscribe()
                            const dst: string = join(this.layoutOutputPath, this.inputConfig.carousel.path)
                            this.outfileList = this.outputConfig.carousel.images.map(f => join(dst, f))
                            this.numImages = this.fileList.length
                            this.currentIndex = 0
                            this.updateEncodingProgress(0)
                            this.nextImage(o)
                        })
                    if (s.closed)
                        s.unsubscribe()
                })
        })
    }

    private createFileList(): Observable<string[]> {
        if (this.fileList)
            return Observable.of(this.fileList)
        return Observable.create((o: Observer<any>) => {
            const dir = join(this.inputPath, this.inputConfig.carousel.src)
            const dst = join(this.layoutOutputPath, this.inputConfig.carousel.path)
            let read = () => {
                readdir(dir, (err, files: string[]) => {
                    if (err)
                        return o.error(err)
                    files = imageFilter(files)
                    if(! files.length) {
                        return o.error("No images found.")
                    }
                    this.numImages = files.length
                    this.progressLog.total = this.numImages
                    this.fileList = files
                    let count: number = 1
                    this.outputConfig.carousel.images = files.map(f => "img" + (count++) + ".jpg")
                    o.complete()
                })
            }
            if (!this.dirCheckFlag)
                exists(dir, exists => {
                    if (!exists)
                        return o.error("Carousel input directory does not exists.")
                    this.dirCheckFlag = true
                    read()
                })
            else
                read()

        })

    }

    protected endTask(): Observable<any> {
        this.outputConfig.carousel = clone<ICarousel>(this.outputConfig.carousel)
        delete(this.outputConfig.carousel.src)
        return super.endTask()
    }

    private nextImage(o: Observer<any>) {
        if (this.currentIndex < this.numImages) {
            let input: string = join(
                this.inputPath,
                this.inputConfig.carousel.src,
                this.fileList[this.currentIndex]
            )

            let args: ResizeConfig = {
                srcPath: input,
                dstPath: this.outfileList[this.currentIndex],
                quality: this.inputConfig.jpegQuality,
                format: 'jpg',
                width: 0,
                height: 0
            }
            resize(args, this.layout.width, this.layout.height, false)
                .then(size => {
                    this.currentIndex++
                    this.updateEncodingProgress(this.currentIndex)
                    this.nextImage(o)
                })
                .catch(o.error)
        }
        else {
            this.updateEncodingProgress(this.numImages, true)
            o.complete()
        }
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