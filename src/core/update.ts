import { TaskBase } from "./task-base";
import { writeJSON } from "fs-extra";
import { join } from "path";
import { yellow, green } from "../utils/log-util";

export class Update extends TaskBase { 

    protected initProcess() {
        // clean up config
        console.log(yellow("Starting Update task"))        
        const config = this.inputConfig
        delete(config.video)
        delete(config.jpegQuality)
        delete(config.carousel.src)
        delete(config.turnAround.src)
        delete(config.turnAround.images)
        delete(config.turnAround.numFrames)
        for(let b of config.buildings) {
            delete(b.src)
        }
        writeJSON(join(this.outputPath, "config.json"), this.inputConfig, {
            spaces:4
        })
        .then(()=>{
            console.log(green("Config updated"))
            this.resolve(true)
        })
        .catch(this.reject)

    }
}