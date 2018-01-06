import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocha from 'mocha';
import * as env from "dotenv"
import { join } from "path";
import { readJson, remove, emptyDir, exists, unlink } from "fs-extra";
import { InputConfig } from "../src/core/input-config";
import { TurnaroundTask } from "../src/core/task/turnaround-task";
process.env.TESTING = "testing"
env.config({ path: join(__dirname, ".env") })

let _inputConfig: InputConfig
let _outputConfig: InputConfig
/**
 * get input and output from .env 
 */
const INPUT_DIR: string = process.env.INPUT_DIR
const OUTPUT_DIR: string = process.env.OUTPUT_DIR

describe('Turnaround', () => {
    before(done => {
        readJson(join(INPUT_DIR, "input.config.json")).then(json => {
            _inputConfig = json
            _outputConfig = JSON.parse(JSON.stringify(_inputConfig))
            emptyDir(OUTPUT_DIR)
            .then(done)
            .catch(done)
        })
    })

    it("should run tasks", done => {
        let task = new TurnaroundTask(
            _inputConfig, _outputConfig,
            INPUT_DIR, OUTPUT_DIR
        )
        task.start()
        .then(done)
        .catch(done)
    })
})