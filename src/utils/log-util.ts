
import { cursorTo, clearLine, clearScreenDown, moveCursor } from "readline";
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

    private waitTimer = undefined
    private _scaledProgress: number = 0;
    private _progress: number = 0;
    private _numLines: number = 0;
    public get progress(): number {
        return this._progress;
    }

    private waitAnimCount: number = 0

    private waitAnimTick = () => {
        let s: string
        switch (this.waitAnimCount % 4) {
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
            this.waitStr = yellow(s)
            this.update()
        }
        this.waitAnimCount++
    }

    public set progress(v: number) {
        this._progress = v;
        let s = this.numChars / this.total
        const p = Math.round(this._progress * s)
        this._scaledProgress = p

        this.update()
    }
    update() {
        if (!this.waitTimer) {
            this.waitTimer = setInterval(this.waitAnimTick, 250)
            return this.waitAnimTick()
        }
        const str = this.getCurrentMessage()
        if (str == this.lastOutput)
            return
        this.clearLines()
        this.lastOutput = str
        let n: number = 1
        if (this.message) {
            let l = this.message.split(EOL)
            n += l.length
        }
        this._numLines = n
        this.getSocket().write(str)
    }
    private getCurrentMessage(): string {
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
        return output
    }
    private waitStr: string = ""
    private clearLines() {
        const stdout: any = this.getSocket()
        if (this._numLines > 0) {
            let n = this._numLines
            while (n > 1) {
                clearLine(stdout, 0)
                moveCursor(stdout, 0, -1)
                n--
            }
            clearLine(stdout, 0)
            cursorTo(stdout, 0, undefined)
        }
    }
    private lastOutput: string
    private clearWaitAnim() {
        this.waitStr = ""
        if (this.waitTimer)
        clearInterval(this.waitTimer)
        this.waitTimer = undefined
    }
    clear() {
        this.clearWaitAnim()
        this.clearLines()
        this._numLines = 0
    }
    done() {
        this.waitStr = ""
        this.update()
        this.clearWaitAnim()
        this._numLines = 0
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
const bold = (str: string): string => {
    return colors.bold(str)
}
const CHECK: string = "✓"
export { CHECK, black, red, green, yellow, blue, magenta, cyan, white, gray, grey, bold }