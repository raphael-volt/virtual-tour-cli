
import { EOL } from "os";
import { CHECK, blue, cyan, green, yellow, grey, ProgressLog } from "../src/utils/log-util";

import { moveCursor, createInterface, ReadLine, ReadLineOptions, cursorTo, clearLine, clearScreenDown } from "readline";
let std = process.stdout
std.write(green("log-test START") + EOL)

let updateMessage = () => {
    pl.message = "Process RUNNING" + EOL + "Step " + (p+1) + " of " + n
    pl.progress = p
}

let p = 0
let n = 10
let pl: ProgressLog = new ProgressLog(20, n)

updateMessage()
let t = setInterval(() => {
    p++
    updateMessage()
    if(p == 10) {
        
        pl.message = "Process DONE" + green(" " + CHECK)
        pl.done()
        
        //pl.clear()
        done()
    }

}, 2000)

let done = () => {
    clearInterval(t)
    std.write(green("log-test DONE") + EOL)
    process.exit(0)
}
