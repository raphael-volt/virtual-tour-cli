import { Observable, Observer, Subscription } from "rxjs";

export class ObsQueueEvent {
    constructor(
        public index: number = 0,
        public total: number = 0
    ) { }
}

export class ObsQueue {

    private _obs: Observable<any>[] = []

    set add(obs: Observable<any>) {
        this._obs.push(obs)
    }

    set addList(obs: Observable<any>[]) {
        this._obs.push.apply(this._obs, obs)
    }

    append(...obs: Observable<any>[]) {
        this.addList = obs
    }

    get asObservable(): Observable<ObsQueueEvent> {
        return Observable.create((o: Observer<ObsQueueEvent>)=>{
            let sub: Subscription
            const done = (err?)=>{
                if(sub)
                    sub.unsubscribe()
                if(err)
                    return o.error(err)
                o.complete()
            }
            sub = this.subsribe(o.next, done, done)
        })
    }

    subsribe(
        next: (val) => void,
        error: (err) => void,
        complete: () => void): Subscription {
        return Observable.create((observer: Observer<any | ObsQueueEvent>) => {
            let sub: Subscription
            const _obs = this._obs
            let i: number = 0

            const nextSub = () => {
                if (sub)
                    sub.unsubscribe()
                sub = undefined
                if (_obs.length) {

                    sub = _obs.shift().subscribe(
                        val => {
                            observer.next(val)
                        }, 
                        observer.error, 
                        () => {
                            observer.next(new ObsQueueEvent(i++, _obs.length))
                            nextSub()
                        })
                    if (sub.closed) {
                        sub.unsubscribe()
                        sub = undefined
                    }
                }
                else
                    observer.complete()
            }
            nextSub()
        }).subscribe(next, error, complete)
    }
}