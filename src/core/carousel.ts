import { InputConfig } from "./input-config";
import { ProgressLog } from "../utils/log-util";
import { join, extname } from "path";
import { remove, mkdirp, exists, emptyDir, readdir } from "fs-extra";
import * as imagick from "imagemagick";
import { ResizeConfig, resize } from "../utils/image-util";
import { yellow, blue, green } from "../utils/log-util";
import { TaskBase } from "./task-base";
export class Carousel extends TaskBase {

    protected initProcess() {
        // check output dir
        this.printTask("Starting Carousel task")
        this.checkOutPutDir().then(this.createFileList)
    }

    private checkOutPutDir(): Promise<void> {
        let dir = join(this.outputPath, this.inputConfig.carousel.src)
        return emptyDir(dir)
    }

    private updateEncodingProgress = (progress: number, complete: boolean = false) => {
        this.updateProgress("Encoding image", progress, this.numImages, complete)
    }

    private createFileList = () => {
        let dir = join(this.inputPath, this.inputConfig.carousel.src)
        exists(dir, exists => {
            if (!exists) {

                return this.reject("Carousel directory does not exists")
            }
            readdir(dir, (err, files: string[]) => {
                if (err)
                    return this.reject(err)
                files = this.imageFilter(files)
                this.inputConfig.carousel.images = files
                this.numImages = this.progressLog.total = files.length
                this.updateEncodingProgress(0)
                this.nextImage()
            })
        })
    }


    private numImages: number = 0
    private currentIndex: number = 0

    private nextImage() {
        const carousel = this.inputConfig.carousel
        if (this.currentIndex < this.numImages) {
            let input: string = join(
                this.inputPath,
                carousel.src,
                carousel.images[this.currentIndex]
            )
            let outFilename: string = "img" + (this.currentIndex + 1) + ".jpg"
            let output: string = join(
                this.outputPath,
                carousel.src,
                outFilename
            )

            let args: ResizeConfig = {
                srcPath: input,
                dstPath: output,
                quality: this.inputConfig.jpegQuality,
                format: 'jpg',
                width: 0,
                height: 0
            }
            resize(args, this.inputConfig.layout.width, this.inputConfig.layout.height, false)
                .then(size => {
                    carousel.images[this.currentIndex] = outFilename
                    this.currentIndex++
                    this.updateEncodingProgress(this.currentIndex)
                    this.nextImage()
                })
        }
        else {
            this.outputConfig.carousel = carousel
            delete (this.outputConfig.carousel.src)
            this.updateEncodingProgress(this.numImages, true)
            this.progressLog.done()
            // Done!
            this.resolve(true)
        }
    }
}