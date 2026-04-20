import { csoundProxy } from "./engine";
import { globalObj, secs, getBpm, resolve, Resolvable } from "./core";

export type EventValue = Resolvable<number>;
export type EventTuple =
    | [EventValue]
    | [EventValue, EventValue]
    | [EventValue, EventValue, EventValue]
    | [EventValue, EventValue, EventValue, EventValue]
    | [EventValue, EventValue, EventValue, EventValue, Resolvable<Instrument>];
export type SeqEvent = EventValue | EventTuple | EventTuple[];

const DRUM_INSTR: Record<number, number> = {
    29: 10.97,
    30: 10.97,
    42: 10.91,
    44: 10.91,
    46: 10.91,
    49: 10.91,
    71: 10.92,
    72: 10.92,
    73: 10.93,
    74: 10.93,
    78: 10.94,
    79: 10.94,
    80: 10.95,
    81: 10.95,
    86: 10.96,
    87: 10.96,
};

export class Instrument {
    pgm: number;
    chn: number;
    isDrums: boolean;
    what_: number;
    howLoud: number;
    howLong: number;
    on: Uint8Array;
    instr: number;

    constructor(pgm: number, isDrums = false, what = 60.0, instr = 10) {
        this.pgm = pgm;
        this.chn = globalObj.freeChannel;
        globalObj.freeChannel =
            globalObj.freeChannel < globalObj.maxChannel - 1
                ? globalObj.freeChannel + 1
                : 16;
        this.isDrums = isDrums;
        this.what_ = what;
        this.howLoud = 1;
        this.howLong = 1;
        this.on = new Uint8Array(128);
        this.instr = instr;
    }

    _clamp(v: number, min = 0, max = 1): number {
        return v < min ? min : v > max ? max : v;
    }

    what(snd: number): void {
        this.what_ = snd;
    }

    score(
        what: number,
        howLoud: number,
        when: number,
        howLong: number
    ): string {
        let prog = this.pgm;
        let instr =
            this.instr + what / 1000000 + this.chn / globalObj.maxChannel;
        if (this.isDrums) {
            if (prog == 7) csoundProxy.tableSet(26, this.chn, 2);
            else csoundProxy.tableSet(26, this.chn, 0.5);
            instr = DRUM_INSTR[what] ?? instr;
            prog = 317 + this.pgm;
        }
        if (howLong <= 0) this.on[what] = 1;
        if (howLoud <= 0) {
            instr *= -1;
            this.on[what] = 0;
        }
        return (
            "i" +
            instr +
            " " +
            secs(when) +
            " " +
            (howLong > 0 ? secs(howLong) : -1) +
            " " +
            what +
            " " +
            127 * howLoud +
            " " +
            prog +
            " " +
            this.chn +
            "\n"
        );
    }

    event(
        what: number,
        howLoud = this.howLoud,
        when = 0,
        howLong = this.howLong
    ): EventTuple {
        return [what, howLoud, when, howLong, this];
    }

    play(...evtLst: (SeqEvent | number[])[]): void {
        let amp = this.howLoud,
            dur = 0,
            when = 0,
            what: number,
            mess = "";
        if (evtLst.length == 0) {
            mess += this.score(this.what_, this.howLoud, 0, 0);
        } else {
            for (const evt of evtLst) {
                if (Array.isArray(evt)) {
                    what = resolve(evt[0] as EventValue);
                    dur = resolve((evt.length > 3 ? evt[3] : 1) as EventValue);
                    when = resolve((evt.length > 2 ? evt[2] : 0) as EventValue);
                    amp = resolve(
                        (evt.length > 1 ? evt[1] : amp) as EventValue
                    );
                } else {
                    what = resolve(evt as EventValue);
                }
                mess += this.score(what!, amp, when, dur);
            }
        }
        csoundProxy.inputMessage(mess);
    }

    stop(...evtLst: (SeqEvent | number[])[]): void {
        let mess = "";
        if (evtLst.length == 0) {
            for (let what = 0; what < 128; what++) {
                if (this.on[what]) mess += this.score(what, 0, 0, 0);
            }
        } else {
            for (const evt of evtLst) {
                let what: number,
                    when = 0;
                if (Array.isArray(evt)) {
                    what = evt[0] as number;
                    when = evt.length > 2 ? (evt[2] as number) : 0;
                } else {
                    what = evt as number;
                }
                mess += this.score(what, 0, when, 0);
            }
        }
        csoundProxy.inputMessage(mess);
    }

    bend(amount: number): void {
        csoundProxy.tableSet(14, this.chn, 2 ** (amount / 12));
    }
    reverb(amount: number): void {
        csoundProxy.tableSet(8, this.chn, amount);
    }
    cutoff(amount: number): void {
        csoundProxy.tableSet(17, this.chn, this._clamp(amount));
    }
    resonance(amount: number): void {
        csoundProxy.tableSet(18, this.chn, this._clamp(amount));
    }
    pan(amount: number): void {
        csoundProxy.tableSet(3, this.chn, this._clamp(amount) * 127);
    }
    volume(amount: number): void {
        csoundProxy.tableSet(2, this.chn, this._clamp(amount) * 127);
    }

    filterEnvelope(
        amount: number,
        att: number,
        dec: number,
        sus: number,
        rel: number
    ): void {
        csoundProxy.tableSet(19, this.chn, att);
        csoundProxy.tableSet(20, this.chn, dec);
        csoundProxy.tableSet(21, this.chn, sus);
        csoundProxy.tableSet(22, this.chn, rel);
        csoundProxy.tableSet(27, this.chn, amount);
    }

    ampEnvelope(att: number, dec: number, sus: number, rel: number): void {
        csoundProxy.tableSet(23, this.chn, att);
        csoundProxy.tableSet(24, this.chn, dec);
        csoundProxy.tableSet(25, this.chn, sus);
        csoundProxy.tableSet(26, this.chn, rel);
    }
}

export function isInstr(instr: unknown): instr is Instrument {
    return instr instanceof Instrument;
}

export interface SampleObj {
    number: number;
    fo: number;
    bpm: number;
    instr: Sampler | null;
    load(what: string, fo?: number, bpm?: number): void;
    loop(start: number, end: number): void;
    create(what?: string | null, fo?: number, bpm?: number): SampleObj;
    play(...evtList: (SeqEvent | number[])[]): void;
    instrument(what?: string | null, fo?: number, bpm?: number): Sampler;
}

async function loadToFs(src: string, dest: string): Promise<void> {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch ${src}: ${res.status}`);
    const dat = await res.arrayBuffer();
    await csoundProxy.fs.writeFile(dest, new Uint8Array(dat));
}

export const sample: SampleObj = {
    number: 0,
    fo: 60,
    bpm: 60,
    instr: null,
    load(what: string, fo = 60, bpm = 0) {
        this.fo = fo;
        this.bpm = bpm;
        loadToFs(what, "localfile").then(() => {
            csoundProxy.inputMessage(
                "i2 0 0" + ' "localfile" ' + this.fo + " " + this.number
            );
            if (bpm > 0) csoundProxy.tableSet(15, this.number, getBpm() / bpm);
        });
    },
    loop(start: number, end: number) {
        csoundProxy.tableSet(11, this.number, start);
        csoundProxy.tableSet(12, this.number, end);
    },
    create(what: string | null = null, fo = 60, bpm = 0): SampleObj {
        const e: SampleObj = Object.create(sample);
        e.number = globalObj.sampnum++;
        if (what) e.load(what, fo, bpm);
        e.instr = new Sampler(e);
        return e;
    },
    play(...evtList: (SeqEvent | number[])[]) {
        this.instr!.play(...evtList);
    },
    instrument(what: string | null = null, fo = 60, bpm = 0): Sampler {
        if (this.instr == null) return this.create(what, fo, bpm).instr!;
        else return this.instr;
    },
};

export class Sampler extends Instrument {
    sample: SampleObj;

    constructor(pgm: SampleObj, isDrums = false, what = pgm.fo) {
        super(pgm.number, isDrums, what, 12);
        this.sample = pgm;
    }

    play(...evtLst: (SeqEvent | number[])[]): void {
        if (this.sample.bpm > 0)
            csoundProxy.tableSet(
                15,
                this.sample.number,
                getBpm() / this.sample.bpm
            );
        super.play(...evtLst);
    }

    speed(val: number): void {
        csoundProxy.tableSet(16, this.chn, val);
    }
}
