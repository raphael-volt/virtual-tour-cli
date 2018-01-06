import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocha from 'mocha';
import * as env from "dotenv"
import { join, basename, dirname, isAbsolute, extname } from "path";
import { readJson, writeJson, remove, emptyDir, exists, unlink } from "fs-extra";
import { InputConfig, IConfigLayout, validateInputConfig, validateOutputConfig, clone } from "../src/core/input-config";
import { CarouselTask } from "../src/core/task/carousel-task";
import { TurnaroundTask } from "../src/core/task/turnaround-task";
import { BuildingTask } from "../src/core/task/building-task";
import { TasksConfig, Task, TaskList } from "../src/core/model/tasks-config";

process.env.TESTING = "testing"
env.config({ path: join(__dirname, ".env") })

let _inputConfig: InputConfig
let _outputConfig: InputConfig
let appConfig: TasksConfig
/**
 * get input and output from .env 
 */
const INPUT_DIR: string = process.env.INPUT_DIR
const OUTPUT_DIR: string = process.env.OUTPUT_DIR

describe("TasksConfig", () => {

    it('should add | remove tasks', () => {
        let tasks: TasksConfig = new TasksConfig()
        tasks.addTask("v")
        tasks.addTask("c")
        let l = tasks.sortedTasks
        chai.expect(l.length).eq(2)
        chai.expect(l[0]).eq("c")
        chai.expect(l[1]).eq("v")

        tasks.removeTask("c")
        tasks.removeTask("v")
        l = tasks.sortedTasks
        chai.expect(l.length).eq(0)

        tasks.addTask("v")
        tasks.addTask("c")
        tasks.addTask("t")

        l = tasks.sortedTasks
        chai.expect(l.length).eq(3)
        chai.expect(l[0]).eq("c")
        chai.expect(l[1]).eq("t")
        chai.expect(l[2]).eq("v")
        appConfig = tasks
    })

    it("should run all tasks", done => {
        appConfig.start(
            join(INPUT_DIR, "input.config.json"),
            OUTPUT_DIR
        ).subscribe(e => {
            console.log(e.index + "/" + e.total)
        }, err => {
            done(err)
        }, () => {
            done()
        })
    })
})

describe.skip('App', () => {

    describe("init", () => {

        it('should load input config', done => {
            readJson(join(INPUT_DIR, "input.config.json")).then(json => {
                _inputConfig = json
                _outputConfig = clone<InputConfig>(_inputConfig)
                done()
            }).catch(done)
        })

        it('should validate input config', () => {
            chai.expect(validateInputConfig(_inputConfig)).be.true
        })

        it('should clear output path', done => {
            emptyDir(OUTPUT_DIR)
                .then(done)
                .catch(done)
        })

    })

    describe('run tasks', () => {

        it("should run Carousel task", done => {
            new CarouselTask(
                _inputConfig, _outputConfig,
                INPUT_DIR, OUTPUT_DIR
            ).start()
                .then(done)
                .catch(done)
        })

        it("should run TurnAround task", done => {
            new TurnaroundTask(
                _inputConfig, _outputConfig,
                INPUT_DIR, OUTPUT_DIR
            ).start()
                .then(done)
                .catch(done)
        })

        it("should run Building task", done => {
            new BuildingTask(
                _inputConfig, _outputConfig,
                INPUT_DIR, OUTPUT_DIR
            ).start()
                .then(done)
                .catch(done)
        })
    })

    describe('update config', () => {

        it("should validate", () => {
            const config = _outputConfig
            delete (config.framerate)
            delete (config.jpegQuality)
            config.layouts = _inputConfig.layouts.map(l => {
                l = clone<IConfigLayout>(l)
                delete (l.video.bitrate)
                return l
            })
            chai.expect(validateOutputConfig(config)).be.true
        })

        it("should save", done => {
            writeJson(join(OUTPUT_DIR, "config.json"), _outputConfig, { spaces: 4 })
                .then(done)
                .catch(done)
        })
    })
})