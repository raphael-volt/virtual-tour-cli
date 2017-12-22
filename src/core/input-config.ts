export interface IBuilding {
    src?: string
    path: string
    name: string
    image: string
    items: any[]
}

export interface ITurnAroundImage {
    src: string
    size: number
}

export interface ITurnAround {
    src?: string
    path: string
    numFrames?: number,
    images?: ITurnAroundImage[]
}

export interface ICarousel {
    src?: string
    path: string
    images?: string[]
}

export interface IVideo {
    extension: string
    ffmpegOptions?: {
        framerate: number
    }
    handBrakeOptions?: {
        bitrate: number
    }
}

export interface ILayout {
    width: number
    height: number
}

export interface InputConfig {
    jpegQuality?: number
    name: string
    video: IVideo
    layout: ILayout
    carousel: ICarousel
    buildings: IBuilding[]
    turnAround: ITurnAround
}