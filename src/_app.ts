import * as commander from 'commander'
import * as fs from "fs"
import { mkdirp, exists, readdir, unlink, writeJSON } from "fs-extra";
import * as path from "path";
import * as readline from "readline";
import * as os from "os";
import * as imagick from "imagemagick";
import { dirname } from 'path';
export class App {

    private commander: commander.CommanderStatic
    private input: string
    private output: string
    private quality: number = 90
    private jsonName: string = "frames.json"
    private imgInputs: string[]
    private json: {
        frames: {
            img: string
            size: number
        }[]
    } = {
            frames: []
        }
    constructor() {
        this.commander = commander
    }
    private outputSizes: [number, number]
    private parseSizes = (input) => {
        let re = /^(\d+)x(\d+)$/
        if (input && re.test(input)) {
            let res = re.exec(input)
            this.outputSizes = [Number(res[1]), Number(res[2])]
        }
        console.log("output dimensions", this.outputSizes)
    }

    private cwd: string
    public initialize() {
        this.cwd = process.cwd()
        this.commander
            .version('0.0.1')
            .option('-i, --input [path]', 'input directory, default ./')
            .option('-o, --output [path]', 'output directory, default ./output/frames')
            .option('-q, --quality [n]', 'jpeg quality, default 80', parseInt)
            .option('-j, --json [value]', 'json filename, default output/frames.json')
            .option('-d, --dimensions [value]', 'image sizes as <width>x<height>, default use source sizes', this.parseSizes)
            .description('Encode images for the web and generate file listing (name and size).')

        commander.command("turnaround")
            .description("Create a cli TypeScript application.")
            .action(this.generateTurnAround)

        this.commander.parse(process.argv)
    }

    private checkPath(p: string) {
       
        if (!p)
            p = this.cwd
        else {
            if (!path.isAbsolute(p)) {
                p = path.join(this.cwd, p)
            }
        }
        return p

    }

    unlinkImages(imgs: string[], callback: () => void) {
        imgs = imgs.slice()
        let next = (file?) => {
            if (imgs.length) {
                unlink(imgs.shift()).then(next)
            }
            else {
                callback()
            }
        }
        next()
    }

    getImages(dir, callback: (files: string[]) => void) {
        readdir(dir).then(files => {
            let imgs = files.filter((f) => {
                var isFile = false
                switch (path.extname(f).toLowerCase()) {
                    case ".png":
                    case ".gif":
                    case ".jpeg":
                    case ".jpg":
                        isFile = true
                        break;
                    default:
                        break;
                }
                return isFile
            })
            imgs.sort((a, b) => {
                if (a == b)
                    return 0
                return a < b ? -1 : 1
            })
            callback(imgs)
        })
    }

    getAbsolute(dir: string, files: string[]): string[] {
        return files.map(f => {
            return path.join(dir, f)
        })
    }
    generateTurnAround = (...args) => {
        this.input = this.checkPath(this.commander.input)
        this.output = this.checkPath(path.join(this.commander.output, "frames"))
        if (this.commander.quality)
            this.quality = this.commander.quality
        if (this.commander.json)
            this.jsonName = this.commander.json

        exists(this.input, e => {
            if (!e) {
                console.log('input directory does not exists')
                process.exit(1)
            }
            this.getImages(this.input, imgs => {
                if (!imgs.length) {
                    console.log('no image found')
                    process.exit(1)
                }
                this.imgInputs = this.getAbsolute(this.input, imgs)
                exists(this.output, e => {
                    if (e)
                        this.getImages(this.output, files => {
                            files = this.getAbsolute(this.output, files)
                            this.unlinkImages(files, this.encode)
                        })
                    else {
                        mkdirp(this.output).then(this.encode)
                    }
                })
            })

        })
    }
    encode = (output?) => {
        let pOut: ProgressOutput = new ProgressOutput()
        let p: number = 1
        pOut.start("Encoding images", this.imgInputs.length, 1)
        let args = {
            srcPath: undefined,
            dstPath: undefined,
            quality: this.quality / 100,
            format: 'jpg',
            width: 0,
            height: 0
        }
        const save = () => {
            imagick.resize(args, (err, stout, stdin) => {
                if (err) {
                    console.log(err)
                    process.exit(1)
                }
                fs.stat(args.dstPath, (err, stat) => {
                    this.json.frames.push({
                        img: path.join(path.basename(this.output), path.basename(args.dstPath)),
                        size: stat.size
                    })
                    next()
                })
            })
        }
        const next = () => {
            if (this.imgInputs.length) {
                args.srcPath = this.imgInputs.shift()
                args.dstPath = path.join(this.output, "", "frame" + p + ".jpg")
                pOut.update(p ++)
                if (!this.outputSizes) {
                    imagick.identify(args.srcPath, (err, features) => {
                        args.width = features.width
                        args.height = features.height
                        save()
                    })
                }
                else {
                    args.width = this.outputSizes[0]
                    args.height = this.outputSizes[1]
                    save()
                }
            }
            else {
                writeJSON(path.join(path.dirname(this.output), this.jsonName), this.json).then(() => {
                    pOut.close("Done")
                    process.exit(0)
                })
            }
        }
        next()
    }
    _generateTurnAround(cmd, options) {
        console.log("output", options.output)
        console.log("input", options.input)
        console.log("quality", options.quality)
        console.log("json-name", options["json"])

    }
}
interface WStream {
    write: (text) => void
}
class ProgressOutput {

    private message: string
    private progress: number
    private total: number

    socket: any
    private getSocket(): WStream {
        return this.socket || process.stdout
    }

    start(message, total: number, progress: number = 0) {
        this.progress = progress
        this.message = message
        this.total = total
        this.output()
    }

    close(message: string) {
        this.clear()
        this.write(message)
        this.stop()
    }
    update = (progress: number) => {
        this.progress = progress
        this.output()
    }

    private stop() {
        this.write(os.EOL)
    }

    private clear() {
        const stdout: any = this.getSocket()
        readline.cursorTo(stdout, 0, undefined)
        readline.clearLine(stdout, 1)
    }


    private output(): void {
        this.clear()
        this.write(this.message)
    }

    private write(message: string) {
        this.getSocket().write(message + ` ${this.progress} / ${this.total}`)
    }
}