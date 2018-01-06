import { VideoEncodeType } from "../core/model/v-cmd";

export interface IConfigItem { }

export interface IBuilding extends IConfigItem {
    src?: string
    path: string
    name: string
    image: string
    items: any[]
}

export interface ITurnAroundImage extends IConfigItem {
    src: string
    size: number
}

export interface ITurnAround extends IConfigItem {
    src?: string
    path: string
    numFrames?: number,
    images?: ITurnAroundImage[]
}

export interface ICarousel extends IConfigItem {
    src?: string
    path: string
    images?: string[]
}

export interface IVideo extends IConfigItem {
    bitrate: number
    formats: VideoEncodeType[]
}

export interface ILayout extends IConfigItem {
    width: number
    height: number
}

export interface IConfigLayout extends IConfigItem {
    name: string
    layout: ILayout
    video: IVideo
}

export interface InputConfig extends IConfigItem {
    name: string
    image: string
    projectVideo: string
    framerate?: number
    jpegQuality?: number
    layouts: IConfigLayout[]
    carousel: ICarousel
    buildings: IBuilding[]
    turnAround: ITurnAround
}

const validateInputConfig = (config: any): boolean => {
    if (!config)
        return false
    const o: Object = config
    let valid: boolean = true
    let p: string
    let required: string[] = ["image", "layouts", "carousel", "buildings", "turnAround"]
    for (p of required) {
        if (!o.hasOwnProperty(p) || !o[p]) {
            valid = false
            break
        }
    }
    if (valid) {
        let iconf: InputConfig = config
        const layouts: IConfigLayout[] = iconf.layouts
        for (let f of layouts) {
            if (!f || !f.name
                || !f.video
                || !f.video.formats || !f.video.formats.length
                || !f.layout || !f.layout.width || !f.layout.height) {
                valid = false
                break
            }
            for (const et of f.video.formats) {
                switch (et) {
                    case "mp4":
                    case "ogv":
                    case "webm":
                        break

                    default:
                        valid = false
                        break
                }
                if (!valid)
                    break
            }
            if (!valid)
                break
        }
        if (!valid)
            return valid
        iconf.layouts.sort(sortLayout)
        const carousel: ICarousel = iconf.carousel
        if (!carousel.src || !carousel.path) {
            return false
        }
        const turnaround: ITurnAround = iconf.turnAround
        if (!turnaround.src || !turnaround.path) {
            return false
        }
        const buildings: IBuilding[] = iconf.buildings
        if (!buildings.length) {
            return false
        }
        for (let b of buildings) {
            if (!b || !b.src || !b.path) {
                valid = false
                break
            }

        }
    }
    return valid
}

const validateOutputConfig = (config: any): boolean => {
    if (!config)
        return false
    const o: Object = config
    let valid: boolean = true
    let p: string
    let required: string[] = ["image", "layouts", "carousel", "buildings", "turnAround"]
    for (p of required) {
        if (!o.hasOwnProperty(p) || !o[p]) {
            valid = false
            break
        }
    }
    if (valid) {
        let iconf: InputConfig = config
        const layouts: IConfigLayout[] = iconf.layouts
        for (let f of layouts) {
            if (!f || !f.name
                || !f.video
                || !f.video.formats || !f.video.formats.length
                || !f.layout || !f.layout.width || !f.layout.height) {
                valid = false
                break
            }
            for (const et of f.video.formats) {
                switch (et) {
                    case "mp4":
                    case "ogv":
                    case "webm":
                        break

                    default:
                        valid = false
                        break
                }
                if (!valid)
                    break
            }
            if (!valid)
                break
        }
        if (!valid)
            return valid

        const carousel: ICarousel = iconf.carousel
        if (carousel.src || !carousel.path) {
            return false
        }
        const turnaround: ITurnAround = iconf.turnAround
        if (turnaround.src || !turnaround.path) {
            return false
        }
        const buildings: IBuilding[] = iconf.buildings
        if (!buildings.length) {
            return false
        }
        for (let b of buildings) {
            if (!b || b.src || !b.path) {
                valid = false
                break
            }

        }
    }
    return valid
}

const clone = <T extends IConfigItem>(value: Object): T => {
    return JSON.parse(JSON.stringify(value))
}

const sortLayout = (a: IConfigLayout, b: IConfigLayout): number => {
    return b.layout.width - a.layout.width
}

export { validateInputConfig, validateOutputConfig, clone }