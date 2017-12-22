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
  Usage: vti [options] <input> <output>

  Asset generator for virtual-tour project


  Options:

    -V, --version     output the version number
    -v, --video       generate video
    -t, --turnaround  generate turn-around
    -c, --carousel    generate carousel
    -h, --help        output usage information
```

## Input config

Based on the `config.json` with options values.

Path to directories must be relative. 

Options values will be removed from the generated config file, all other properties will be added. 

Only `src` values must be defined for `carousel`, `turnAround` and `buildings[n]` 

If the `turnAround.numFrames` is not defined, all images found in the `src` folder will be added.

See below for default options values :

```json
{
    "jpegQuality": 0.9,
    "video": {
        "extension":"m4v",
        "ffmpegOptions": {
            "framerate" : 25
        },
        "handBrakeOptions": {
            "bitrate": 4000
        }
    },
    "carousel": {
        "src": "carousel"
    },
    "turnAround": {
        "src": "turn-around",
        "numFrames": 400
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
    - batiment-a
        in.m4v
        out.m4v
        main.jpg
    - batiment-a-bis
    - batiment-b
    - batiment-c
    - carousel
        img1.jpg
        ...
    - main-turn-around
        - frames
            frame000010.jpg
            ...
        frames.json
    config.json
    main.jpg
```

## Videos

Create optimized videos from an image sequence (`in` and `out`) for each buildings.

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

### Extract the first image from a video

```bash
ffmpeg -i out.m4v -ss 00:00:00 -vframes 1 frame1.jpg
```

 


