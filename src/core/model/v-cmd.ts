export interface EncodeStatusDetail { 
    pass?: number 
    total?: number 
    percent?: number

}
export type EncodeStatus = "start" | "pass1" | "pass2" | "done" | "error" | "mixin" | EncodeStatusDetail
export type VideoCommand = "ffmpeg" | "HandBrakeCLI"
export type VideoCodec = "x264" | "x265" | "mpeg4" | "mpeg2" | "VP8" | "VP9" | "theora"
export type VideoEncodeFormat = "av_mp4" | "av_mkv"
export type VideoEncodeType = "webm" | "mp4" | "ogv"

export interface VCmd {
    name: VideoCommand
    format?: VideoEncodeType
    status?: EncodeStatus
    i?: string
    filename?: string
    an?: string
    vcodec?: string
    s?: string
    framerate?: number
    bitrate?: number
}