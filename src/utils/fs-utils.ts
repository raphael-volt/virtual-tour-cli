import { join, basename, dirname, isAbsolute, extname } from "path";
import { stat, Stats, exists } from "fs-extra";

const isDir = (path: string): Promise<boolean> => {
    return new Promise((res, rej) => {
        getStat(path)
            .then(s => {
                if (!s)
                    return rej("Directory not exists.")
                res(s.isDirectory())
            })
    })
}

const isFile = (path: string): Promise<boolean> => {
    return new Promise((res, rej) => {
        getStat(path)
            .then(s => {
                if (!s)
                    return rej("File not exists.")
                res(s.isFile())
            })
    })
}

const getStat = (path: string): Promise<Stats> => {
    return new Promise((res, rej) => {
        exists(path, e => {
            if (!e)
                return res(null)
            stat(path)
                .then(s => {
                    res(s)
                })
                .catch(rej)
        })
    })
}

export { isFile, isDir, getStat }