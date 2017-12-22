import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocha from 'mocha';
import * as env from "dotenv"
import { join } from "path";
import { readJson, remove } from "fs-extra";

env.config({path: __dirname})

import { Carousel } from "../src/core/carousel";
import { Video } from "../src/core/video";
import { TurnAround } from "../src/core/turn-around";
import { Update } from "../src/core/update";
import { getImageSuiteData } from "../src/core/video";
import { InputConfig } from "../src/core/input-config";
let _carousel: Carousel
let _inputConfig: InputConfig
let _outputConfig: InputConfig
/**
 * get input and output from .env 
 */
const INPUT_DIR: string = process.env.INPUT_DIR
const OUTPUT_DIR: string = process.env.OUTPUT_DIR

describe('Tasks', () => {
    
    before(done => {
        readJson(join(INPUT_DIR, "input.config.json")).then(json=>{
            _inputConfig = json
            _outputConfig = JSON.parse(JSON.stringify(_inputConfig))
            process.chdir(INPUT_DIR)
            done()
        }).catch(done)
    })

    after(done => {
        remove(OUTPUT_DIR).then(done)
    })

    describe('carousel', () => {

        it('should create', (done) => {
            let conf = _inputConfig
            _carousel = new Carousel(
                conf, _outputConfig, INPUT_DIR, OUTPUT_DIR
            )
            _carousel.start().then(success => {
                done()
            }).catch(done)
        })
    })

    describe('videos', () => {

        it('should create', done => {
            let vid: Video = new Video(_inputConfig, _outputConfig, INPUT_DIR, OUTPUT_DIR)
            vid.start().then(success=>{
                done()
            }).catch(done)
        })
    })

    describe('turn-around', () => {
        
        it('should get turnaround file names options', () => {
            let name = "frame000012.jpg"
            let data = getImageSuiteData(name)
            chai.expect(data[0]).eq("frame")
            chai.expect(data[1]).eq(12)
            chai.expect(data[2]).eq(6)
            chai.expect(data[3]).eq("jpg")
        })

        it('should create', done => {
            let ta: TurnAround = new TurnAround(_inputConfig, _outputConfig, INPUT_DIR, OUTPUT_DIR)
            ta.start().then(success=>{
                done()
            }).catch(done)
        })
    })
})