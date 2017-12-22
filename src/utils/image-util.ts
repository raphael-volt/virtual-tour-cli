
import * as imagemagick from "imagemagick";
import { stat } from "fs";
export interface ResizeConfig {
    srcPath: string
    dstPath: string
    quality: number
    format: 'jpg' | 'png' | 'gif'
    width: number
    height: number
}
const getImageDimensions = (path: string): Promise<[number, number]> => {
    return new Promise((resolve, reject) => {
        imagemagick.identify(path, (err, features) => {
            resolve([features.width, features.height])
        })
    })
}

const getResizeDimensions = (maxWidth: number, maxHeight: number, naturalSize: [number, number]): [number, number] => {
    let sx: number = maxWidth / naturalSize[0]
    let sy: number = maxHeight / naturalSize[1]
    if (sy < sx)
        sx = sy
    if (sx > 1)
        return naturalSize
    return [Math.ceil(naturalSize[0]) * sx, Math.ceil(naturalSize[1] * sx)]
}
/**
 * Return the size of the resized image
 * @param config 
 * @param maxWidth 
 * @param maxHeight 
 */
const resize = (config: ResizeConfig, maxWidth: number, maxHeight: number, getSize: boolean = true): Promise<number> => {
    return new Promise<number>((resolve, reject) => {
        getImageDimensions(config.srcPath)
            .then(sizes => {
                sizes = getResizeDimensions(maxWidth, maxHeight, sizes)
                config.width = sizes[0]
                config.height = sizes[1]
                imagemagick.resize(config, (err, stdout, stdin) => {
                    if (err)
                        return reject(err)
                    if (getSize)
                        stat(config.dstPath, (err, stats) => {
                            if (err)
                                return reject(err)
                            resolve(stats.size)
                        })
                    else
                        resolve(0)
                })
            })
            .catch(reject)
    })
}

export { getImageDimensions, getResizeDimensions, resize }