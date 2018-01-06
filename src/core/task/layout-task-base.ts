
import { extname, join } from "path";
import { exists, mkdirp } from "fs-extra";
import { EOL } from "os";
import { ProgressLog, green, yellow, blue, cyan, bold, CHECK } from "../../utils/log-util";
import { InputConfig, IConfigLayout, ILayout, IVideo } from "../input-config";
import { ObsQueue, ObsQueueEvent } from "../../utils/obs-queue";
import { Observable, Observer, Subscription } from "rxjs";

export class LayoutTaskBase {

    protected progressLog = new ProgressLog(40, 0)
    private resolve: () => void
    private reject: (reason?: any) => void

    private _layoutIndex: number
    
    constructor(
        protected inputConfig: InputConfig,
        protected outputConfig: InputConfig,
        protected inputPath: string,
        protected outputPath: string,
        private taskName: string
    ) { }

    protected get framerate(): number {
        return this.inputConfig.framerate
    }

    protected get layoutConfig(): IConfigLayout {
        return this.inputConfig.layouts[this._layoutIndex]
    }

    protected get layout(): ILayout {
        return this.layoutConfig.layout
    }

    protected get video(): IVideo {
        return this.layoutConfig.video
    }

    protected get layoutName(): string {
        return this.layoutConfig.name
    }

    protected get jpegQuality(): number {
        return this.inputConfig.jpegQuality
    }

    protected printTask(name: string) {
        console.log(yellow(bold(name)))
    }

    protected get greenCheck(): string {
        return green(CHECK)
    }

    start(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.resolve = () => {
                resolve()
            }
            this.reject = err => {
                reject(err)
            }   
            this.initProcess()
        })
    }
    private _layoutOutputPath: string
    protected get layoutOutputPath(): string {
        return this._layoutOutputPath
    }
    private initProcess() {
        this._layoutIndex = 0
        this.printTask(this.taskName)
        let q: ObsQueue = new ObsQueue()
        q.add = this.startTask()
        for (let layout of this.inputConfig.layouts) {
            q.add = Observable.create(o => {
                let dir: string = join(this.outputPath, layout.name)
                this._layoutOutputPath = dir
                exists(dir, e => {
                    if (e)
                        o.complete()
                    else
                        mkdirp(dir)
                            .then(()=>{
                                o.complete()
                            })
                            .catch(err=>{
                                o.error(err)
                            })
                })
            })
            q.add = this.layoutTask(layout)
            q.add = Observable.create(o => { 
                this._layoutIndex ++
                o.complete()
            })
        }
        q.add = this.endTask()
        let qs: Subscription
        const queueDone = (err?) => {
            if(qs)
                qs.unsubscribe()
            if(err)
                this.reject(err)
            else
                this.resolve()
        }
        qs = q.subsribe(
            val => { },
            queueDone,
            queueDone
        )
        if(qs.closed)
            qs.unsubscribe()
    }

    protected layoutTask(config: IConfigLayout): Observable<any> {
        throw new Error("LayoutTaskBase.initTask must be overrided")
    }
    protected endTask(): Observable<any> {
        return Observable.of(true)
    }
    protected startTask(): Observable<any> {
        return Observable.of(true)
    }
}