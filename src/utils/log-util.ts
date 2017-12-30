
import { cursorTo, clearLine, clearScreenDown } from "readline";
import { EOL } from "os";
const colors = require('colors/safe');
export interface WStream extends NodeJS.WritableStream {

}
export class ProgressLog {
    constructor(
        public numChars: number,
        public total: number,
        public stdout?: WStream,
        public message?: string
    ) {

    }

    private getSocket(): WStream {
        return this.stdout || process.stdout
    }

    private waitTimer
    private _scaledProgress: number = 0;
    private _progress: number = 0;
    public get progress(): number {
        return this._progress;
    }
    public set progress(v: number) {
        this._progress = v;
        let s = this.numChars / this.total
        const p = Math.round(this._progress * s)
        this._scaledProgress = p
        if (!this.waitTimer) {
            let count: number = 0
            this.waitTimer = setInterval(() => {
                let s: string
                switch (count % 4) {
                    case 0:
                        s = "|"
                        break;

                    case 1:
                        s = "/"

                        break;

                    case 2:
                        s = "-"

                        break;

                    case 3:
                        s = "\\"

                        break;

                    default:
                        break;
                }
                if (s) {
                    this.clear()
                    this.waitStr = yellow(s)
                    this.output()
                }
                count++
            }, 300)
        }
        this.clear()
        this.output()
    }
    private waitStr: string = ""
    private cursorPos
    private clear() {
        const stdout: any = this.getSocket()
        if (!this.message) {
            cursorTo(stdout, 0, undefined)
            clearLine(stdout, 1)
        }
        else {
            let rows = process.stdout.rows
            cursorTo(stdout, 0, rows - 2)
            clearScreenDown(stdout)
        }

    }
    private output() {
        const stdout: any = this.getSocket()
        let output: string = ""
        if (this.message) {
            output = this.message
            if (this.waitStr && this.waitStr.length)
                output += " " + this.waitStr
            output += EOL
        }
        let str: string[] = []

        let s = this.numChars / this.total
        const p = Math.round(this._progress * s)
        let i: number

        for (i = 0; i < this._scaledProgress; i++) {
            str.push(" ")
        }
        output += colorizeBackground(str.join(""), "green", "bgGreen")
        str = []
        for (; i < this.numChars; i++) {
            str.push(' ')
        }
        output += colorizeBackground(str.join(""), "white", "bgWhite")
        output += ' ' + yellow(Math.round(this._progress / this.total * 100) + " %")

        this.getSocket().write(output)
        
    }
    done() {
        if (this.waitTimer)
            clearInterval(this.waitTimer)
        this.waitStr = ""
        this.clear()
        this.output()
        this.getSocket().write(EOL)
    }
}

type colorNames = "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" | "grey"
type backgroundNames = "bgBlack" | "bgRed" | "bgGreen" | "bgYellow" | "bgBlue" | "bgMagenta" | "bgCyan" | "bgWhite"

const colorizeBackground = (str: string, color: colorNames, background: backgroundNames): string => {
    return colors[color][background](str)
}
// console.log(colors.black.bgWhite('Background color attack!'));
const colorize = (str: string, color: colorNames): string => {
    //console.log(colors.green('hello'));
    return colors[color](str)
}

const black = (str: string): string => {
    return colorize(str, "black")
}
const red = (str: string): string => {
    return colorize(str, "red")
}
const green = (str: string): string => {
    return colorize(str, "green")
}
const yellow = (str: string): string => {
    return colorize(str, "yellow")
}
const blue = (str: string): string => {
    return colorize(str, "blue")
}
const magenta = (str: string): string => {
    return colorize(str, "magenta")
}
const cyan = (str: string): string => {
    return colorize(str, "cyan")
}
const white = (str: string): string => {
    return colorize(str, "white")
}
const gray = (str: string): string => {
    return colorize(str, "gray")
}
const grey = (str: string): string => {
    return colorize(str, "grey")
}
export { black, red, green, yellow, blue, magenta, cyan, white, gray, grey }