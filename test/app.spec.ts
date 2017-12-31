import * as chai from 'chai';
import * as sinon from 'sinon';
import * as mocha from 'mocha';
import * as env from "dotenv"
import { join } from "path";
import { readJson, remove, emptyDir, exists, ensureDir, mkdirp } from "fs-extra";

env.config({ path: join(__dirname, ".env") })

import { Carousel } from "../src/core/carousel";
import { Video, VideoEncoder } from "../src/core/video";
import { TurnAround } from "../src/core/turn-around";
import { Update } from "../src/core/update";
import { InputConfig } from "../src/core/input-config";

import { ImageSequence } from "../src/core/controllers/image-sequence";

let imgSeq: ImageSequence = new ImageSequence()
let _carousel: Carousel
let _inputConfig: InputConfig
let _outputConfig: InputConfig
/**
 * get input and output from .env 
 */
process.env.TESTING = "testing"
const INPUT_DIR: string = process.env.INPUT_DIR
const OUTPUT_DIR: string = process.env.OUTPUT_DIR
const in_src_name = ".in.mp4"
const out_src_name = ".out.mp4"
let in_src_path: string
let out_src_path: string
describe('Tasks', () => {

    before(done => {
        readJson(join(INPUT_DIR, "input.config.json")).then(json => {
            _inputConfig = json
            _outputConfig = JSON.parse(JSON.stringify(_inputConfig))
            in_src_path = join(OUTPUT_DIR, _inputConfig.buildings[0].path, in_src_name)
            out_src_path = join(OUTPUT_DIR, _inputConfig.buildings[0].path, out_src_name)

            process.chdir(INPUT_DIR)
            remove(OUTPUT_DIR)
                .then(done)
                .catch(done)
        }).catch(done)
    })
/*
    after(done => {
        remove(OUTPUT_DIR)
            .then(done)
            .catch(done)
    })
*/
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
        describe("encoding", () => {
            it("should ensure dir", done => {
                console.log(join(OUTPUT_DIR, _inputConfig.buildings[0].path))
                mkdirp(join(OUTPUT_DIR, _inputConfig.buildings[0].path))
                    .then(() => done())
                    .catch(err => {
                        done(String(err))
                    })
            })
            it("should create IN", done => {

                const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
                const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

                let s = imgSeq.events.subscribe(
                    cmd => {
                        console.log("cmd.status", cmd.status)
                        switch (cmd.status) {
                            case "error":
                                s.unsubscribe()
                                done("encode FAIL")
                                break;
                            case "done":
                                s.unsubscribe()
                                done()
                                break;

                            default:
                                break;
                        }
                    }
                )
                imgSeq.encode(srcBPath, dstBPath, ".in.mp4",
                    _inputConfig.layout.width, _inputConfig.layout.height,
                    _inputConfig.video.framerate, _inputConfig.video.bitrate, "h264")

            })
            it.skip("should encode IN", done => {

            })
        })
        it.skip('should create all', done => {
            let vid: Video = new Video(_inputConfig, _outputConfig, INPUT_DIR, OUTPUT_DIR)
            vid.start().then(success => {
                done()
            }).catch(done)
        })

        it.skip("should create an empty output dir for first building", done => {
            emptyDir(join(OUTPUT_DIR, _inputConfig.buildings[0].path))
                .then(done)
                .catch(done)
        })

        it.skip("should create videos IN & OUT of first building", done => {
            const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
            const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

            const s = new VideoEncoder()

            s.imgSequence(
                srcBPath, dstBPath,
                in_src_name, out_src_name,
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

        it.skip("should exist videos IN & OUT of first building", done => {
            exists(
                in_src_path,
                e => {
                    if (e) {
                        exists(
                            out_src_path,
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


        it.skip("should create mp4 IN & OUT of first building", done => {
            const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
            const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

            const s = new VideoEncoder()
            s.handBrake(
                in_src_path, join(dstBPath, "in.mp4"),
                "mp4", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                _inputConfig.layout.width, _inputConfig.layout.height)
                .subscribe(success => {
                    if (!success)
                        return done("IN generation fail")
                    s.handBrake(
                        out_src_path, join(dstBPath, "out.mp4"),
                        "mp4", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                        _inputConfig.layout.width, _inputConfig.layout.height)
                        .subscribe(success => {
                            if (!success)
                                return done("OUT generation fail")
                            done()
                        }, done)
                },
                e => done("IN generation fail" + String(e)))
        })

        it.skip("should exist mp4 IN & OUT of first building", done => {
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

        it.skip("should create webm IN & OUT of first building", done => {
            const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
            const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

            const s = new VideoEncoder()
            s.handBrake(
                in_src_path, join(dstBPath, "in.webm"),
                "webm", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                _inputConfig.layout.width, _inputConfig.layout.height)
                .subscribe(success => {
                    if (!success)
                        return done("IN generation fail")
                    s.handBrake(
                        out_src_path, join(dstBPath, "out.webm"),
                        "webm", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                        _inputConfig.layout.width, _inputConfig.layout.height)
                        .subscribe(success => {
                            if (!success)
                                return done("OUT generation fail")
                            done()
                        }, err => done(String(err)))
                },
                e => done("IN generation fail" + String(e)))
        })

        it.skip("should exist webm IN & OUT of first building", done => {
            exists(
                join(OUTPUT_DIR, _inputConfig.buildings[0].path, "in.webm"),
                e => {
                    if (e) {
                        exists(
                            join(OUTPUT_DIR, _inputConfig.buildings[0].path, "out.webm"),
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

        it.skip("should create ogv IN & OUT of first building", done => {
            const srcBPath: string = join(INPUT_DIR, _inputConfig.buildings[0].src)
            const dstBPath: string = join(OUTPUT_DIR, _inputConfig.buildings[0].path)

            const s = new VideoEncoder()
            s.handBrake(
                in_src_path, join(dstBPath, "in.ogv"),
                "ogv", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                _inputConfig.layout.width, _inputConfig.layout.height)
                .subscribe(success => {
                    if (!success)
                        return done("IN generation fail")
                    s.handBrake(
                        out_src_path, join(dstBPath, "out.ogv"),
                        "ogv", _inputConfig.video.bitrate, _inputConfig.video.framerate,
                        _inputConfig.layout.width, _inputConfig.layout.height)
                        .subscribe(success => {
                            if (!success)
                                return done("OUT generation fail")
                            done()
                        }, done)
                },
                e => done("IN generation fail" + String(e)))
        })

        it.skip("should exist ogv IN & OUT of first building", done => {
            exists(
                join(OUTPUT_DIR, _inputConfig.buildings[0].path, "in.ogv"),
                e => {
                    if (e) {
                        exists(
                            join(OUTPUT_DIR, _inputConfig.buildings[0].path, "out.ogv"),
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