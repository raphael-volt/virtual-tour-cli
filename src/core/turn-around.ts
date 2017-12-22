import { readdir, exists, unlink, mkdirp, emptyDir, writeJSON } from "fs-extra";
import { join } from "path";
import * as imagick from "imagemagick";

import { resize, ResizeConfig } from "../utils/image-util";
import { TaskBase } from "./task-base";
import { ILayout, ITurnAround, ITurnAroundImage } from "./input-config";
import { yellow, blue, red } from "../utils/log-util";

const TURN_AROUND_IMAGE_DIR: string = "frames"
export class TurnAround extends TaskBase {

    private get layout(): ILayout {
        return this.inputConfig.layout
    }

    private get turnAround(): ITurnAround {
        return this.inputConfig.turnAround
    }

    private imageCount: number
    private inputfiles: string[] = []
    protected initProcess() {
        console.log(yellow("Starting TurnAround task"))
        this.getImageList().then(files => {
            this.progressLog.total = files.length
            this.progressLog.progress = 0
            this.inputfiles = files
            emptyDir(join(this.outputPath, this.turnAround.path, TURN_AROUND_IMAGE_DIR))
            .then(()=>{
                this.turnAround.images = []
                this.imageCount = 0
                let main = "main.jpg"
                let conf: ResizeConfig = {
                    srcPath: join(this.inputPath, this.turnAround.src, files[0]),
                    dstPath: join(this.outputPath, main),
                    quality: this.inputConfig.jpegQuality,
                    format: 'jpg',
                    width: this.inputConfig.layout.width,
                    height: this.inputConfig.layout.height
                }
                let done = () => {
                    resize(conf, this.inputConfig.layout.width, this.inputConfig.layout.height, false)
                    .then(size=>{
                        this.nextImage()
                    })
                    .catch((err) => {
                        console.log(red("Copy first image fail"))
                        this.nextImage()
                    })
                }
                exists(conf.dstPath, _exists => {
                    if(_exists) {
                        unlink(conf.dstPath)
                        .then(done)
                        .catch(err=>{
                            console.log(red("Delete first image fail"))
                            this.nextImage()
                        })
                    }
                    else done()
                })
                
            })
        }).catch(this.reject)
    }
    private nextImage() {
        let files = this.inputfiles
        if(files.length) {
            let src: string = join(this.inputPath, this.turnAround.src, files.shift())
            let localFilename: string = join(TURN_AROUND_IMAGE_DIR, "img" + (this.imageCount+1)+".jpg")
            let dst: string = join(this.outputPath, this.turnAround.path, localFilename)
            let config: ResizeConfig = {
                srcPath: src,
                dstPath: dst,
                quality: this.inputConfig.jpegQuality,
                format: 'jpg',
                width: this.layout.width,
                height: this.layout.height
            }
            resize(config, this.layout.width, this.layout.height, true)
            .then(size=>{
                this.turnAround.images.push(
                    {
                        src: localFilename,
                        size: size
                    }
                )
                this.imageCount ++
                this.progressLog.progress = this.imageCount
                this.nextImage()
            })
            .catch(this.reject)

        }
        else {
            let ta = this.turnAround
            this.progressLog.progress = this.progressLog.total
            this.progressLog.done()
            console.log(blue("Save turn-around json"))
            let json: any = {}
            json[TURN_AROUND_IMAGE_DIR] = this.turnAround.images
            writeJSON(join(this.outputPath, this.turnAround.path, TURN_AROUND_IMAGE_DIR + ".json"), json)
            .then(() => {
                delete(this.inputConfig.turnAround.src)
                delete(this.inputConfig.turnAround.images)
                delete(this.inputConfig.turnAround.numFrames)
                this.outputConfig.turnAround = this.inputConfig.turnAround
                this.resolve(true)
            })
        }
    }

    private getImageList(): Promise<string[]> {
        return new Promise<string[]>((resolve, reject) => {
            const ta = this.turnAround
            const dest = join(this.outputPath, ta.path)
            const src: string = join(this.inputPath, ta.src)

            emptyDir(dest)
                .then(() => {
                    readdir(src).then(files => {
                        files = this.imageFilter(files)
                        files.sort()
                        const fileslength: number = files.length
                        let num: number = fileslength
                        if (ta.numFrames) {
                            num = ta.numFrames
                        }
                        console.log(blue("Generate turn-around using " + num + " images"))
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
                        resolve(files)
                    })
                        .catch(reject)
                })
        })
    }
}