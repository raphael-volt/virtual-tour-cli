import * as commander from 'commander'
import { red, green, bold } from "./utils/log-util";
import { TasksConfig, isTask } from "./core/model/tasks-config";
const cdr: commander.CommanderStatic = commander

export class App {

    private tasksConfig: TasksConfig = new TasksConfig()
    private inputs: [string, string] = [null, null]
    constructor() {
        
        cdr.version("1.0.1")
        .arguments('<input> <output>')
        .action((input, output) => {
            this.inputs = [input, output]
        })
        .option('-b, --buildings', 'generate videos and images for each building.', () => this.setOption("b"))
        .option('-t, --turnaround', 'generate turn-around', () => this.setOption("t"))
        .option('-c, --carousel', 'generate carousel', () => this.setOption("c"))
        .description('Asset generator for virtual-tour project')
        .parse(process.argv)
        
    }
    
    initialize() {
        this.tasksConfig.start(this.inputs[0], this.inputs[1])
            .subscribe(
                e=>{},
                err => {
                    console.log(red(String(err)))
                    process.exit(1)
                },
            ()=>{
                console.log(green("All tasks " + bold("DONE")))
            })
    }

    private setOption = (value: any) => {
        if(isTask(value))
            this.tasksConfig.addTask(value)
    }
}