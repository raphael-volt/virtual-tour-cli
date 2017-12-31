import { Observable, Observer } from "rxjs";
import { spawn, exec, fork } from "child_process";

export type CLIEvent = {
    event: "message" | "exit" | "close" | "data"
    message?: string
    sendHandle? : any
    code?: number
    signal?: string
    data?: any
}

export class IExec {

    /*
var spawn = require('child_process').spawn;

var cp1 = spawn('/bin/command1', ['arg1', 'arg2'], {stdio: 'pipe'});
var cp2 = spawn('/bin/command2', ['arg1', 'arg2'], {stdio: [cp1.stdout, 'pipe', 'pipe']});
var cp3 = spawn('/bin/command3', ['arg1', 'arg2'], {stdio: [cp2.stdout, 'pipe', 'pipe']});

var result = '';
cp3.stdout.on('data', data => result += data);
cp3.on('close', () => console.log(result));

cp1.stdin.end('mydata');
    */
    spawn(cmd: string, args: string[]): Observable<CLIEvent> {
        return Observable.create((observer: Observer<CLIEvent>) => {
            
            var results = []
            let s = spawn(cmd, args, {
                detached: false,
                stdio: [process.stdin, process.stdout, process.stderr]
            })
            s.on('close', (c, s) => {
                observer.complete()
            })
            s.on('message', (m, sh)=>{
                console.log("message")

            })
            s.stdout.on('data', (...args)=>{
                console.log("stdout data", args)
            })
            
            s.stdout.on('readable', (...args)=>{
                console.log("stdout readable", args)
            })

            s.stdin.on('drain', (...args)=>{
                console.log("stdin drain", args)
            })
            
            s.stdin.on('pipe', (...args)=>{
                console.log("stdin pipe", args)
            })
            
            s.stdin.on('unpipe', (...args)=>{
                console.log("stdin unpipe", args)
            })



            // let s = spawn(cmd , args)
            /*
            let s = spawn(cmd + " " + args.join(" "))
            s.stdout.on("data", (chunk) => {
                results.push(chunk)
                observer.next({
                    event: "data",
                    data: chunk
                })
            })
            s.stdin.on("data", (chunk) => {
                results.push(chunk)
                observer.next({
                    event: "data",
                    data: chunk
                })
            })
            s.on('error', err => {
                observer.error(String(err))
            })
            .on('close', (code, signal) => {
                observer.next({
                    event: "close",
                    code: code,
                    signal: signal
                })
                observer.complete()
            })
            .on("disconnect", ()=>{
                console.log("disconnect")
            })
            */
        })
    }

    exec(cmd: string) {

    }
}