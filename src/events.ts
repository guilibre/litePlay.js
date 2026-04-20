import { csoundProxy } from "./engine";
import { Instrument, isInstr, SeqEvent, EventValue } from "./instrument";
import { resolve, Resolvable } from "./core";

interface ScoreResult {
    score: string;
    play(): void;
}

interface EventListObj {
    events: SeqEvent[];
    maxdur: number;
    play(when?: number, evtLst?: SeqEvent[]): number;
    create(...evtLst: SeqEvent[]): EventListObj;
    score(when?: number, evtLst?: SeqEvent[]): ScoreResult;
    repeat(times?: number, when?: number): number;
    add(...evtLst: SeqEvent[]): void;
    clear(): void;
    remove(ndx?: number): void;
    insert(pos: number, ...evtLst: SeqEvent[]): void;
}

export let defInstr: Instrument;

export function setDefInstr(i: Instrument): void {
    defInstr = i;
}

export const eventList: EventListObj = {
    events: [],
    maxdur: 0,
    play(this: EventListObj, when = 0, evtLst = this.events) {
        this.score(when, evtLst).play();
        this.events = evtLst;
        return this.maxdur + when;
    },
    create(this: EventListObj, ...evtLst: SeqEvent[]) {
        const e: EventListObj = Object.create(eventList);
        e.events = evtLst;
        return e;
    },
    score(this: EventListObj, when = 0, evtLst = this.events) {
        let mess = "";
        let instr: Instrument,
            amp: number,
            dur: number,
            etime = 0,
            time = when,
            what: number;
        this.maxdur = 0;
        for (const evt of evtLst) {
            if (Array.isArray(evt)) {
                what = resolve(evt[0] as EventValue);
                instr = resolve(
                    (evt.length > 4
                        ? evt[4]
                        : defInstr) as Resolvable<Instrument>
                );
                instr = isInstr(instr) ? instr : defInstr;
                dur = resolve(
                    (evt.length > 3 ? evt[3] : instr.howLong) as EventValue
                );
                etime = resolve((evt.length > 2 ? evt[2] : 0) as EventValue);
                time = etime + when;
                amp = resolve(
                    (evt.length > 1 ? evt[1] : instr.howLoud) as EventValue
                );
            } else {
                what = resolve(evt as EventValue);
                instr = defInstr;
                amp = instr.howLoud;
                dur = instr.howLong;
                etime = time;
            }
            const totdur = etime + dur!;
            if (what! >= 0) mess += instr!.score(what!, amp!, time, dur!);
            if (totdur > this.maxdur) this.maxdur = totdur;
            time += dur!;
        }
        return {
            score: mess,
            play() {
                csoundProxy.inputMessage(this.score);
            },
        };
    },
    repeat(times = 1, when = 0) {
        let next = when;
        for (let i = 0; i < times; i++) next = this.play(next);
        return next;
    },
    add(...evtLst) {
        for (const evt of evtLst) this.events.push(evt);
    },
    clear() {
        this.events = [];
    },
    remove(ndx = -1) {
        if (ndx < 0) this.events.pop();
        else this.events.splice(ndx, 1);
    },
    insert(pos, ...evtLst) {
        for (const evt of evtLst) this.events.splice(pos, 0, evt);
    },
};

export function play(
    ...theList: (SeqEvent | Instrument)[]
): SeqEvent[] | Instrument {
    if (typeof theList[0] === "function")
        return play(...(theList[0] as unknown as () => SeqEvent[])());
    if (isInstr(theList[0])) {
        theList[0].play();
        return theList[0];
    }
    if (theList.length > 0) {
        eventList.create().play(0, theList as SeqEvent[]);
        return theList as SeqEvent[];
    }
    defInstr.play();
    return defInstr;
}

export function instrument(instr: Instrument | SeqEvent[]): Instrument {
    if (Array.isArray(instr) && typeof instr[0] === "function")
        return instrument((instr[0] as unknown as () => Instrument)());
    if (isInstr(instr)) defInstr = instr;
    return defInstr;
}

export function stop(): void {
    defInstr.stop();
}
