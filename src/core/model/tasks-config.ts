import { ObsQueue, ObsQueueEvent } from "../../utils/obs-queue";
import { isFile, isDir } from "../../utils/fs-utils";
import { Observable, Observer, Subscription } from "rxjs";
import { exists, mkdirp, readJson, writeJson, stat } from "fs-extra";
import { join, dirname, basename, isAbsolute, normalize } from "path";
import { isNullOrUndefined } from "../../utils/object-utils";
import { clone, validateInputConfig, validateOutputConfig, InputConfig } from "../../core/input-config";
import { LayoutTaskBase } from "../task/layout-task-base";
import { BuildingTask } from "../task/building-task";
import { CarouselTask } from "../task/carousel-task";
import { TurnaroundTask } from "../task/turnaround-task";
const OUTPUT_CONFIG_NAME: string = "config.json"

type Task = "b" | "t" | "c"
type TaskList = {[K in Task]?: boolean }
const sortedTasks: Task[] = ["c", "t", "b"]
const sortTasks = (a: Task, b: Task): number => {
    const ai: number = sortedTasks.indexOf(a)
    const bi: number = sortedTasks.indexOf(b)
    return ai - bi
}

const isTask = (x: any): x is Task => {
    return sortedTasks.indexOf(x) > -1
}
export { Task, TaskList, isTask, OUTPUT_CONFIG_NAME }

export class TasksConfig {

    private tasks: TaskList = {}

    addTask(t: Task) {
        this.tasks[t] = true
    }

    removeTask(t: Task) {
        this.tasks[t] = false
    }

    get sortedTasks(): Task[] {
        const res: Task[] = []
        for (const t in this.tasks) {
            if (this.tasks[t])
                res.push(<Task>t)
        }
        res.sort(sortTasks)
        return res
    }

    private _inputConfigPath: string
    private _inputConfigDir: string
    private _inputConfig: InputConfig

    private _outputConfig: InputConfig
    private _outputConfigPath: string
    private _outputConfigDir: string

    start(input: string, output: string): Observable<ObsQueueEvent> {
        return Observable.create((o: Observer<ObsQueueEvent>) => {
            const tasks = this.sortedTasks
            if (!tasks.length) {
                tasks.push("c", "t", "b")
            }
            let n: number = tasks.length + 2
            let count: number = 1
            let notyfy = () => {
                o.next(new ObsQueueEvent(count++, n))
            }
            this.checkPath(input, output)
                .subscribe(v => {

                }, o.error, () => {
                    notyfy()
                    let nextTask = (v?) => {
                        if (tasks.length) {
                            let t = tasks.shift()
                            let lt: LayoutTaskBase
                            let cls: any
                            switch (t) {
                                case "c":
                                    cls = CarouselTask
                                    break;
                                case "t":
                                    cls = TurnaroundTask
                                    break;
                                case "b":
                                    cls = BuildingTask
                                    break;

                                default:
                                    cls = null
                                    break;
                            }
                            if (!cls) // ???
                                return nextTask()
                            lt = new cls(
                                this._inputConfig, this._outputConfig,
                                this._inputConfigDir, this._outputConfigDir)
                            lt.start()
                                .then((v?) => {
                                    notyfy()
                                    nextTask()
                                })
                                .catch(o.error)
                        }
                        else {
                            writeJson(this._outputConfigPath, this._inputConfig, { spaces: 4 })
                                .then((v?) => {
                                    notyfy()
                                    o.complete()
                                })
                                .catch(o.error)
                        }
                    }
                    nextTask()
                })
        })
    }
    _start(input: string, output: string): Observable<ObsQueueEvent> {
        const tasks = this.sortedTasks
        if (!tasks.length)
            return Observable.create(o => {
                o.error("No task provided")
            })
        const q: ObsQueue = new ObsQueue()
        q.add = this.checkPath(input, output)
        q.add = Observable.create((observer: Observer<any>) => {
            let nextTask = (v?) => {
                if (tasks.length) {
                    let t = tasks.shift()
                    let lt: LayoutTaskBase
                    let cls: any
                    switch (t) {
                        case "c":
                            cls = CarouselTask
                            break;
                        case "t":
                            cls = TurnaroundTask
                            break;
                        case "b":
                            cls = BuildingTask
                            break;

                        default:
                            cls = null
                            break;
                    }
                    if (!cls) // ???
                        return nextTask()
                    lt = new cls(
                        this._inputConfig, this._outputConfig,
                        this._inputConfigDir, this._outputConfigDir)
                    lt.start()
                        .then(nextTask)
                        .catch(observer.error)
                }
                else
                    observer.complete()
            }
            nextTask()
        })
        q.add = Observable.create((observer: Observer<any>) => {
            writeJson(this._outputConfigPath, this._inputConfig, { spaces: 4 })
                .then((v?) => observer.complete())
                .catch(observer.error)
        })
        return q.asObservable
    }

    private _initCwd: string
    private checkPath(input: string, output: string): Observable<[string, string]> {
        return Observable.create((o: Observer<[string, string]>) => {
            if (isNullOrUndefined(input) || isNullOrUndefined(output))
                return o.error("input or output is not valid")
            const missingConfFile = (err?) => {
                o.error("Missing config file.")
            }
            const res = () => {
                o.next([input, output])
                process.chdir(this._inputConfigDir)
                o.complete()
            }
            const done = (v?) => {
                this._inputConfigPath = input
                this._inputConfigDir = dirname(input)

                this._outputConfigDir = output
                this._outputConfigPath = join(output, OUTPUT_CONFIG_NAME)

                const cloneInput = (v?) => {
                    this._outputConfig = clone<InputConfig>(this._inputConfig)
                    res()
                }
                isFile(this._outputConfigPath)
                    .then(v => {
                        if (!v)
                            return cloneInput()
                        readJson(this._outputConfigPath)
                            .then(json => {
                                if (validateInputConfig(json)) {
                                    this._outputConfig = json
                                    res()
                                }
                                else
                                    cloneInput()

                            }).catch(cloneInput)
                    }).catch(cloneInput)

            }
            input = normalize(input)
            output = normalize(output)
            let cwd: string = process.cwd()
            this._initCwd = cwd
            if (!isAbsolute(input))
                input = join(cwd, input)

            if (!isAbsolute(output))
                output = join(cwd, output)
            isFile(input)
                .then(v => {
                    if (v) {
                        readJson(input)
                            .then(json => {
                                if (validateInputConfig(json)) {
                                    this._inputConfig = json
                                    isDir(output)
                                        .then(v => {
                                            if (!v)
                                                return o.error('Output parameter must be a directory')

                                            done()
                                        })
                                        .catch(err => {
                                            // dir not exists
                                            mkdirp(output)
                                                .then(done)
                                                .catch(err => {
                                                    o.error('Can not create output directory.')
                                                })
                                        })
                                }
                                else
                                    o.error("Not a valid config file.")
                            })
                            .catch(err => {
                                o.error("Can not read config.")
                            })
                    }
                    else // not a file
                        missingConfFile()
                }) // file not exists
                .catch(missingConfFile)
        })
    }

}
