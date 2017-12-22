
import { ProgressLog } from "../utils/log-util";
import { InputConfig } from "./input-config";
import { extname } from "path";
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