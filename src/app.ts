import * as commander from 'commander'
import { join, isAbsolute, dirname } from "path";
import { readJSON, writeJSON, exists, remove } from "fs-extra";
import { InputConfig } from "./core/input-config";
import { ProgressLog, blue, yellow, red, cyan, green } from "./utils/log-util";
import { clearInterval } from 'timers';
import { TaskBase } from "./core/task-base";
import { Carousel } from "./core/carousel";
import { TurnAround } from "./core/turn-around";
import { Video } from "./core/video";

const cdr: commander.CommanderStatic = commander
type Task = "v" | "t" | "c"

const sortedTasks: Task[] = ["c", "t", "v"]
const outputConfigName = "config.json"
export class App {

    private cwd: string
    private inputConfigPath: string
    private outputConfigPath: string
    private outputPath: string
    private inputPath: string
    private tasks: Task[] = []
    private inputConfig: InputConfig
    private outputConfig: InputConfig
    /**
     * flags: string, description?: string, fn?: RegExp | ((arg1: any, arg2: any) => void), defaultValue?: any)
     */
    private setOption = (value: Task) => {
        this.tasks.push(value)
    }
    constructor() {


        cdr.version("1.0.1")
            .arguments('<input> <output>')
            .action((input, output) => {
                let cwd = process.cwd()
                if (!isAbsolute(input))
                    input = join(cwd, input)
                
                if (!isAbsolute(output))
                    output = join(cwd, output)
                this.inputPath = dirname(input)
                this.cwd = this.inputPath
                process.chdir(this.inputPath)
                this.inputConfigPath = input
                this.outputPath = output
            })
            .option('-v, --video', 'generate video', () => this.setOption("v"))
            .option('-t, --turnaround', 'generate turn-around', () => this.setOption("t"))
            .option('-c, --carousel', 'generate carousel', () => this.setOption("c"))
            .description('Asset generator for virtual-tour project')
            .parse(process.argv)

    }

    initialize() {
        if (!this.tasks.length)
            this.tasks = sortedTasks.slice()
        else {
            this.tasks.sort((a: Task, b: Task) => {
                return sortedTasks.indexOf(a) - sortedTasks.indexOf(b)
            })
        }
        exists(this.inputConfigPath, (_exists) => {
            if (_exists) {
                readJSON(this.inputConfigPath).then(json => {
                    this.inputConfig = json
                    this.outputConfigPath = join(this.outputPath, outputConfigName)
                    exists(this.outputConfigPath, _exists => {
                        if (_exists) {
                            readJSON(this.outputConfigPath)
                                .then(output => {
                                    this.outputConfig = output
                                    this.nextTask()
                                })
                                .catch(err => {
                                    console.log(red("Can not read output config"))
                                })
                        }
                        else {
                            this.outputConfig = JSON.parse(JSON.stringify(this.inputConfig))
                            this.nextTask()
                        }
                    })
                }).catch((reason) => {
                    console.log(red("Can not read input config"))
                    process.exit(1)
                })
            }
        })
    }

    private taskIndex: number = 0
    private nextTask() {
        let inputConfig = this.inputConfig
        let outputConfig = this.outputConfig
        if (this.taskIndex < this.tasks.length) {
            let task: TaskBase
            switch (this.tasks[this.taskIndex]) {
                case "c":
                    task = new Carousel(inputConfig, outputConfig, this.cwd, this.outputPath)
                    break;
                case "t":
                    task = new TurnAround(inputConfig, outputConfig, this.cwd, this.outputPath)
                    break;
                case "v":
                    task = new Video(inputConfig, outputConfig, this.cwd, this.outputPath)
                    break;

                default:
                    break;
            }
            task.start().then(success => {
                this.taskIndex++
                this.nextTask()
            })
                .catch(err => {
                    console.log(red(String(err)))
                    process.exit(1)
                })
        }
        else {
            this.outputConfig.name = this.inputConfig.name
            this.outputConfig.layout = this.inputConfig.layout
            writeJSON(this.outputConfigPath, this.outputConfig, {
                spaces: 4
            }).then(() => {
                console.log(green('All tasks DONE'))
                process.exit(0)
            })
        }
    }
}