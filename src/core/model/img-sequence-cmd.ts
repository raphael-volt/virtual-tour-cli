import { VCmd } from "./v-cmd";

export interface IMGSequenceCmd extends VCmd {
    start_number?: number
    lastFrame?: string
    files?: string[]
    prefix?: string
    numInt?: number
    imgExt?: string
}