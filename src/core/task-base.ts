
import { ProgressLog, green, yellow, blue, cyan } from "../utils/log-util";
import { InputConfig } from "./input-config";
import { extname } from "path";
import { EOL } from "os";
const extensions = ["jpg", "jpeg", "png", "gif"]
export class TaskBase {
    
    protected progressLog = new ProgressLog(40, 0)
    protected resolve: (done: boolean | PromiseLike<boolean>) => void
    protected reject: (reason?: any) => void

    constructor(
        protected inputConfig: InputConfig,
        protected outputConfig: InputConfig,
        protected inputPath: string,
        protected outputPath: string
    ) { }

    protected printTask(name: string) {
        console.log(yellow(name) + EOL)
    }

    protected get greenCheck(): string {
        return green("✓")
    }

    protected updateProgress = (message: string, progress: number, total: number = NaN, complete: boolean = false) => {
        if(isNaN(total))
            total = this.progressLog.total
        if(progress > total)
            progress = total
        let p: number = progress+1
        if(p > total)
            p = total
        message = blue(message)
        message += ` (${cyan(p + " / " + total)})`
        if (complete)
            message += " " + this.greenCheck
        this.progressLog.message = message
        this.progressLog.progress = progress
    }

    start(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.resolve = resolve
            this.reject = reject
            this.initProcess()
        })
    }
    protected initProcess() {
        throw new Error("Should be overrided")
    }

    protected imageFilter(files: string[]):string[] {
        return files.filter(name => {
            let ex = extname(name)
            if (!ex)
                return false
            ex = ex.toLowerCase()
            ex = ex.replace(".", "")
            return extensions.indexOf(ex) > -1
        })
    }
}