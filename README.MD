# Assets Generator for virtual-tour project

## Requirement

`ffmpeg` and `HandBrakeCLI` must be installed :

```bash
sudo apt-get install ffmpeg
sudo apt-get install handbrake-cli
```

## Installation

To install the `virtual-tour-cli` tools localy, `cd` into the `virtual-tour-cli` project directory, then type :

```bash
npm i
npm run build
npm link 
```

## Development

### Build

```bash
npm run build
```

To automaticly build on sources changes :

```bash
npm run watch:build
```

### Test

```bash
npm run test
```

To automaticly build on sources changes :

```bash
npm run watch:test
```

To Debuging `typescript` with vscode, launch the `Debug with Mocha` task. 

## Usage

```txt

  Usage: vtt [options] <input> <output>

  Asset generator for virtual-tour project


  Options:

    -V, --version     output the version number
    -b, --buildings   generate videos and images for each building.
    -t, --turnaround  generate turn-around
    -c, --carousel    generate carousel
    -h, --help        output usage information

```

## Input config

Based on the `config.json` with options values.

Path to directories must be relative. 

Options values will be removed from the generated config file, all other properties will be kept. 

Only `src` values must be defined for `carousel`, `turnAround` and `buildings[n]` 

If the `turnAround.numFrames` is not defined, all images found in the `src` folder will be added.

`json.video.formats` must contain at least one format.

See below an example for options values :

```json
{
    "jpegQuality": 0.9,
    "framerate": 25,
    "layouts": [
        {
            "name": "hd",
            "video": {
                "bitrate": 5000,
                "formats": [
                    "mp4",
                    "webm"
                ]
            },
            "layout": {
                "width": 1920,
                "height": 1080
            }
        },
        {
            "name": "ld",
            "video": {
                "bitrate": 800,
                "formats": [
                    "mp4",
                    "webm"
                ]
            },
            "layout": {
                "width": 480,
                "height": 270
            }
        }
    ],
    "carousel": {
        "src": "carousel"
    },
    "turnAround": {
        "src": "turn-around",
        "numFrames": 300
    },
    "buildings": [
        {
            "src": "bat-a"
        }
    ]
}

``` 

## Assets directory

```txt

- assets
    -hd
        - a
            in.mp4
            out.mp4
            main.jpg
        - b ...
        - carousel
            img1.jpg ...
        - main-turn-around
            - frames
                frame1.jpg ...
            frames.json
        main.jpg
    -md ...
    config.json
```

## Videos

Create optimized videos for the web using `ffmpeg` and `HandBrakeCLI` from an image sequence.

## Turn-around

Generate the file list in `json` format using the number of frame defined in the input file.

Optimize images using the jpegQuality parameter.

```txt
assets/turn-around/frames.json
```

## Carousel

Add the file list to the `config.json`.

Optimize images using the jpegQuality parameter.

## Config

Generate the config file.

```txt
assets/config.json
```

## Test

Edit `test/.env` to set path variables to target a valid assets directory.

## Useful commands

### Extract the first image from a video

```bash
ffmpeg -i out.m4v -ss 00:00:00 -vframes 1 frame1.jpg
```

 


