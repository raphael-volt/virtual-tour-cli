import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocha from 'mocha';
import * as env from "dotenv"
import { join } from "path";
import { readJson, remove, emptyDir, exists } from "fs-extra";

env.config({ path: join(__dirname, ".env") })

import { Carousel } from "../src/core/carousel";
import { Video, VideoEncoder } from "../src/core/video";
import { TurnAround } from "../src/core/turn-around";
import { Update } from "../src/core/update";
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
        readJson(join(INPUT_DIR, "input.config.json")).then(json => {
            _inputConfig = json
            _outputConfig = JSON.parse(JSON.stringify(_inputConfig))
            process.chdir(INPUT_DIR)
            done()
        }).catch(done)
    })

    after(done => {
        remove(OUTPUT_DIR)
            .then(done)
            .catch(done)
    })

    describe.skip('carousel', () => {

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

        it.skip('should create all', done => {
            let vid: Video = new Video(_inputConfig, _outputConfig, INPUT_DIR, OUTPUT_DIR)
            vid.start().then(success => {
                done()
            }).catch(done)
        })

        it("should create an empty output dir for first building", done => {
            emptyDir(join(OUTPUT_DIR, _inputConfig.buildings[0].path))
                .then(done)
                .catch(done)
        })

        it("should create videos IN & OUT of first building", done => {
            const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
            const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

            const s = new VideoEncoder()

            s.imgSequence(
                srcBPath, dstBPath,
                "in.mp4", "out.mp4",
                _inputConfig.layout.width,
                _inputConfig.layout.height,
                _inputConfig.video.framerate,
                _inputConfig.video.bitrate,
                "h264",
                "main.jpg",
                _inputConfig.jpegQuality
            ).subscribe(
                cmd => {
                    console.log(cmd.status, cmd.filename)
                },
                done,
                done
                )
        })

        it("should exist videos IN & OUT of first building", done => {
            exists(
                join(OUTPUT_DIR, _inputConfig.buildings[0].path, "in.mp4"),
                e => {
                    if (e) {
                        exists(
                            join(OUTPUT_DIR, _inputConfig.buildings[0].path, "out.mp4"),
                            e => {
                                if (e)
                                    done()
                                else
                                    done("OUT not exists")

                            })
                    }
                    else
                        done("IN not exists")
                })
        })

    })

    describe.skip('turn-around', () => {

        it('should create', done => {
            let ta: TurnAround = new TurnAround(_inputConfig, _outputConfig, INPUT_DIR, OUTPUT_DIR)
            ta.start().then(success => {
                done()
            }).catch(done)
        })
    })
})