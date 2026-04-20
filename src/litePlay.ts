import { Csound } from "@csound/browser";

// Minimal Csound WASM interface
interface CsoundInstance {
    midiMessage(stat: number, b1: number, b2: number): void;
    tableSet(table: number, index: number, value: number): void;
    inputMessage(score: string): Promise<void>;
    compileCSD(csd: string): Promise<number>;
    start(): Promise<void>;
    setOption(opt: string): Promise<void>;
    getAudioContext(): Promise<AudioContext>;
    getNode(): Promise<AudioNode>;
    fs: { writeFile(path: string, data: Uint8Array): Promise<void> };
}

export let csound: CsoundInstance | null = null;
export let audio_context: AudioContext | null = null;

const csoundProxy = new Proxy({} as CsoundInstance, {
    get(_: CsoundInstance, prop: string | symbol) {
        if (csound == null)
            throw new Error(
                "Csound engine not started. Call startEngine() first."
            );
        const val = (csound as unknown as Record<string | symbol, unknown>)[
            prop
        ];
        return typeof val === "function"
            ? (val as (...a: unknown[]) => unknown).bind(csound)
            : val;
    },
});

type Resolvable<T> = T | (() => T);
const resolve = <T>(val: Resolvable<T>): T =>
    typeof val === "function" ? (val as () => T)() : val;

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

const csdUrl = import.meta.env.BASE_URL + "litePlay.csd";
const sfontUrl = import.meta.env.BASE_URL + "gm.sf2";

interface GlobalObj {
    freeChannel: number;
    maxChannel: number;
    BPM: number;
    sampnum: number;
}

const globalObj: GlobalObj = {
    freeChannel: 16,
    maxChannel: 100,
    BPM: 60.0,
    sampnum: 0,
};

export async function startEngine(): Promise<void> {
    if (csound == null) {
        try {
            csound = (await Csound()) as unknown as CsoundInstance;
            audio_context = await csound!.getAudioContext();
            await csound!.setOption("-odac");
            await csound!.setOption("-M0");
            await loadToFs(sfontUrl, "gm.sf2");
            const csdText = await fetchText(csdUrl);
            const result = await csound!.compileCSD(csdText);
            if (result !== 0) throw new Error("Csound CSD compilation failed.");
            await csound!.start();
        } catch (err) {
            csound = null;
            throw err;
        }
    }
}

async function fetchText(src: string): Promise<string> {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch ${src}: ${res.status}`);
    return res.text();
}

async function loadToFs(src: string, dest: string): Promise<void> {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`Failed to fetch ${src}: ${res.status}`);
    const dat = await res.arrayBuffer();
    await csoundProxy.fs.writeFile(dest, new Uint8Array(dat));
}

export function midi(stat: number, b1: number, b2: number): void {
    if (stat < 0 || stat > 255 || b1 < 0 || b1 > 127 || b2 < 0 || b2 > 127)
        throw new RangeError(
            "MIDI values must be in range 0-127 (0-255 for status)."
        );
    csoundProxy.midiMessage(stat, b1, b2);
}

export function midiProgram(n: number, chn = 1): void {
    if (chn >= 1 && chn <= 16) csoundProxy.midiMessage(chn + 191, n, 0);
}

// Event types
export type EventValue = Resolvable<number>;
export type EventTuple =
    | [EventValue]
    | [EventValue, EventValue]
    | [EventValue, EventValue, EventValue]
    | [EventValue, EventValue, EventValue, EventValue]
    | [EventValue, EventValue, EventValue, EventValue, Resolvable<Instrument>];
export type SeqEvent = EventValue | EventTuple | EventTuple[];

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
                if (this.on[what]) {
                    mess += this.score(what, 0, 0, 0);
                }
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

interface SampleObj {
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

function isInstr(instr: unknown): instr is Instrument {
    return instr instanceof Instrument;
}

export function secs(b: number): number {
    return (b * 60.0) / globalObj.BPM;
}

export function beats(s: number): number {
    return (s * globalObj.BPM) / 60.0;
}

export function setBpm(bpm: number): void {
    globalObj.BPM = bpm;
}

export function getBpm(): number {
    return globalObj.BPM;
}

export function audioClock(): number {
    return audio_context ? audio_context.currentTime : 0;
}

interface SequenceTrack {
    id: number;
    instr: Instrument;
    what: SeqEvent[];
    amp: number;
    bbs: number;
    n: number;
    on: boolean;
    play(sched: number): void;
}

interface Sequencer {
    clickOn: boolean;
    seqList: SequenceTrack[];
    idcnt: number;
    time: number;
    callbacks: ((t: number) => void)[];
    addCallback(x: (t: number) => void): void;
    clearCallbacks(): void;
    click(ref: number): void;
    sequence(
        i: Instrument,
        w: SeqEvent[],
        a: number,
        b: number,
        j: number
    ): SequenceTrack;
    add(
        instr: Instrument,
        what: SeqEvent[],
        howLoud?: number,
        bbs?: number
    ): number;
    play(): void;
    stop(): void;
    clear(): void;
    togglePause(): void;
    toggleMute(id?: number): void;
    toggleSolo(id: number): void;
    clock(): number;
    isRunning(): boolean;
    remove(id: number): void;
}

export const sequencer: Sequencer = {
    clickOn: false,
    seqList: [],
    idcnt: 0,
    time: 0.0,
    callbacks: [],
    addCallback(x) {
        this.callbacks.push(x);
    },
    clearCallbacks() {
        this.callbacks = [];
    },
    click(ref) {
        if (!this.clickOn) return;
        try {
            const t = secs(1);
            const delta = audioClock() - (t + ref);
            if (delta >= 0) {
                this.time = t + audioClock() - delta;
                this.seqList.forEach((v) => v.play(beats(t - delta)));
                const cbs = [...this.callbacks];
                this.callbacks = [];
                cbs.forEach((v) => v(beats(t - delta)));
                setTimeout(this.click.bind(this, audioClock() - delta));
            } else {
                setTimeout(this.click.bind(this, ref));
            }
        } catch (err) {
            console.error("Sequencer error:", err);
            this.stop();
        }
    },
    sequence(i, w, a, b, j) {
        return {
            id: j,
            instr: i,
            what: w,
            amp: a,
            bbs: b,
            n: 0,
            on: true,
            play(sched) {
                const what = this.what,
                    bbs = this.bbs;
                let pp: number,
                    theInstr = this.instr,
                    dur = theInstr.isDrums ? 0 : bbs;
                for (let i = 0; i < 1 / bbs; i++) {
                    const evt = what[this.n];
                    let amp = this.amp;
                    this.n = this.n != what.length - 1 ? this.n + 1 : 0;
                    if (!Array.isArray(evt)) {
                        pp = resolve(evt as EventValue);
                        if (sched >= 0 && pp >= 0 && this.on)
                            theInstr.play([pp, amp, sched + i * bbs, dur]);
                    } else {
                        const applyEl = (el: unknown[], baseSched: number) => {
                            let elAmp = this.amp;
                            let elInstr = this.instr;
                            let elDur = elInstr.isDrums ? 0 : bbs;
                            let elSched = baseSched;
                            pp = resolve(el[0] as EventValue);
                            if (el.length > 1)
                                elAmp *= resolve(el[1] as EventValue);
                            if (el.length > 2)
                                elSched += resolve(el[2] as EventValue);
                            if (el.length > 3)
                                elDur = resolve(el[3] as EventValue);
                            if (el.length > 4) {
                                elInstr = resolve(
                                    el[4] as Resolvable<Instrument>
                                );
                                elInstr = isInstr(elInstr)
                                    ? elInstr
                                    : this.instr;
                                elDur =
                                    elDur > 0
                                        ? elDur
                                        : elInstr.isDrums
                                          ? 0
                                          : bbs;
                            }
                            if (elSched >= 0 && pp >= 0 && this.on)
                                elInstr.play([
                                    pp,
                                    elAmp,
                                    elSched + i * bbs,
                                    elDur,
                                ]);
                        };
                        if (!Array.isArray(evt[0])) {
                            applyEl(evt as unknown[], sched);
                        } else {
                            for (const el of evt as unknown[][])
                                applyEl(el, sched);
                        }
                    }
                }
            },
        };
    },
    add(instr, what, howLoud = 1, bbs = 1) {
        if (isInstr(instr)) {
            const id = this.idcnt++;
            if (bbs > 1) bbs = 1;
            this.seqList.push(this.sequence(instr, what, howLoud, bbs, id));
            return id;
        }
        return -1;
    },
    play() {
        if (!this.clickOn) {
            this.clickOn = true;
            this.click(audioClock());
        }
    },
    stop() {
        this.clickOn = false;
        this.seqList.forEach((v) => {
            v.n = 0;
        });
    },
    clear() {
        this.seqList = [];
    },
    togglePause() {
        this.clickOn = !this.clickOn;
        this.click(audioClock());
    },
    toggleMute(id = -1) {
        this.seqList.forEach((v) => {
            if (id < 0 || v.id == id) v.on = !v.on;
        });
    },
    toggleSolo(id) {
        this.seqList.forEach((v) => {
            if (v.id != id) v.on = !v.on;
        });
    },
    clock() {
        return this.time;
    },
    isRunning() {
        return this.clickOn;
    },
    remove(id) {
        this.seqList.forEach((v, i) => {
            if (v.id == id) this.seqList.splice(i, 1);
        });
    },
};

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

export async function reset(): Promise<void> {
    if (csound) await csoundProxy.inputMessage("i 200 0 0.1");
}

export async function getCsoundNode(): Promise<AudioNode> {
    return csoundProxy.getNode();
}

export const rnd = (min: number, max: number): number =>
    Math.random() * (max - min) + min;

export const rndInt = (min: number, max: number): number =>
    Math.floor(
        Math.random() * (Math.floor(max) - Math.ceil(min)) + Math.ceil(min)
    );

export const choose = <T>(array: T[]): T =>
    array[Math.floor(Math.random() * array.length)];

export const softLevel = (): number => rnd(0.01, 0.1);
export const midLevel = (): number => rnd(0.1, 0.4);
export const loudLevel = (): number => rnd(0.4, 0.9);
export const soft = softLevel;
export const midlevel = midLevel;
export const loud = loudLevel;

export const shortDuration = (): number => rnd(0.05, 0.2);
export const midDuration = (): number => rnd(0.2, 2);
export const longDuration = (): number => rnd(2, 5);
export const shortDur = shortDuration;
export const midDur = midDuration;
export const longDur = longDuration;

export const now = (): number => rnd(0.01, 0.5);
export const soon = (): number => rnd(0.5, 4);
export const later = (): number => rnd(4, 8);

export function lowPitch(): number {
    return rnd(12, 48);
}
export function midPitch(): number {
    return rnd(48, 72);
}
export function hiPitch(): number {
    return rnd(72, 96);
}
export const highPitch = hiPitch;

export const membranophoneList: number[] = [
    35, 36, 40, 41, 43, 45, 47, 48, 50, 63, 64, 65, 66,
];
export const idiophoneList: number[] = [
    29, 34, 37, 39, 42, 44, 46, 49, 51, 52, 53, 54, 55, 57, 58, 59, 67, 68, 71,
    72, 81,
];
export const membranophone = (): number => choose(membranophoneList);
export const idiophone = (): number => choose(idiophoneList);
export const rndMembranophone = membranophone;
export const rndIdiophone = idiophone;

export function onSomething(): Instrument {
    return new Instrument(rnd(0, 127));
}

// instrument collection
export const grandPiano = new Instrument(0);
export const piano = grandPiano;
let defInstr: Instrument = piano;
export const brightPiano = new Instrument(1);
export const electricGrand = new Instrument(2);
export const honkyPiano = new Instrument(3);
export const electricPiano = new Instrument(4);
export const electricPiano2 = new Instrument(5);
export const harpsichord = new Instrument(6);
export const clavinet = new Instrument(7);

export const celesta = new Instrument(8);
export const glockenspiel = new Instrument(9);
export const musicBox = new Instrument(10);
export const vibraphone = new Instrument(11);
export const marimba = new Instrument(12);
export const xylophone = new Instrument(13);
export const tubularBells = new Instrument(14);
export const dulcimer = new Instrument(15);
export const tinkleBell = new Instrument(112);

export function onStruck(): Instrument {
    const num = rnd(0, 16);
    return new Instrument(num > 15 ? 112 : num);
}

export const drawbarOrgan = new Instrument(16);
export const percussiveOrgan = new Instrument(17);
export const rockOrgan = new Instrument(18);
export const organ = rockOrgan;
export const churchOrgan = new Instrument(19);
export const reedOrgan = new Instrument(20);
export const accordion = new Instrument(21);
export const harmonic = new Instrument(22);
export const tangoAccordion = new Instrument(23);

export function onSus(): Instrument {
    return new Instrument(rnd(16, 23));
}

export const nylonAcousticGuitar = new Instrument(24);
export const guitar = nylonAcousticGuitar;
export const steelAcousticGuitar = new Instrument(25);
export const jazzElectricGuitar = new Instrument(26);
export const clearElectricGuitar = new Instrument(27);
export const mutedElectricGuitar = new Instrument(28);
export const overdrivenGuitar = new Instrument(29);
export const distortionGuitar = new Instrument(30);
export const guitarHarmonics = new Instrument(31);
export const sitar = new Instrument(105);
export const banjo = new Instrument(106);
export const shamisen = new Instrument(107);
export const koto = new Instrument(108);
export const kalimba = new Instrument(109);
export const pizzicatoStrings = new Instrument(45);
export const orchestralHarp = new Instrument(46);
export const harp = orchestralHarp;

export function onPluck(): Instrument {
    let num = rnd(24, 38);
    if (num > 31 && num < 34) num += 13;
    if (num > 33) num += 71;
    return new Instrument(num);
}

export const acousticBass = new Instrument(32);
export const fingerElectricBass = new Instrument(33);
export const pickElectricBass = new Instrument(34);
export const fretlessBass = new Instrument(35);
export const bass = fretlessBass;
export const slapBass1 = new Instrument(36);
export const slapBass2 = new Instrument(37);
export const synthBass1 = new Instrument(38);
export const synthBass2 = new Instrument(39);

export function onBass(): Instrument {
    return new Instrument(rnd(32, 39));
}

export const violin = new Instrument(40);
export const viola = new Instrument(41);
export const cello = new Instrument(42);
export const contrabass = new Instrument(43);
export const tremoloStrings = new Instrument(44);
export const fiddle = new Instrument(111);

export function onBowed(): Instrument {
    const num = rnd(40, 45);
    return new Instrument(num > 44 ? 111 : num);
}

export const stringEnsemble1 = new Instrument(48);
export const strings = stringEnsemble1;
export const stringEnsemble2 = new Instrument(49);
export const synthStrings1 = new Instrument(50);
export const synthStrings2 = new Instrument(51);

export function onEnsemble(): Instrument {
    return new Instrument(rnd(48, 51));
}

export const choirAahs = new Instrument(52);
export const voiceOohs = new Instrument(53);
export const synthVoice = new Instrument(54);

export function onVoice(): Instrument {
    return new Instrument(rnd(52, 54));
}

export const orchestralHit = new Instrument(55);

export const trumpet = new Instrument(56);
export const trombone = new Instrument(57);
export const tuba = new Instrument(58);
export const mutedTrumpet = new Instrument(59);
export const frenchHorn = new Instrument(60);
export const horn = frenchHorn;
export const brassSection = new Instrument(61);
export const brass = brassSection;
export const synthBrass1 = new Instrument(62);
export const synthBrass2 = new Instrument(63);

export function onBlow(): Instrument {
    return new Instrument(rnd(56, 63));
}

export const sopranoSax = new Instrument(64);
export const altoSax = new Instrument(65);
export const tenorSax = new Instrument(66);
export const baritoneSax = new Instrument(67);
export const oboe = new Instrument(68);
export const englishHorn = new Instrument(69);
export const bassoon = new Instrument(70);
export const clarinet = new Instrument(71);
export const piccolo = new Instrument(72);
export const flute = new Instrument(73);
export const recorder = new Instrument(74);
export const panFlute = new Instrument(75);
export const blownBottle = new Instrument(76);
export const shakuhachi = new Instrument(77);
export const whistle = new Instrument(78);
export const ocarina = new Instrument(79);
export const bagPipe = new Instrument(110);

export function onWind(): Instrument {
    const num = rnd(64, 79);
    return new Instrument(num > 79 ? 110 : num);
}

export const lead1 = new Instrument(80);
export const lead2 = new Instrument(81);
export const lead3 = new Instrument(82);
export const lead4 = new Instrument(83);
export const lead5 = new Instrument(84);
export const lead6 = new Instrument(85);
export const lead7 = new Instrument(86);
export const lead8 = new Instrument(87);

export function onLead(): Instrument {
    return new Instrument(rnd(80, 87));
}

export const pad1 = new Instrument(88);
export const pad2 = new Instrument(89);
export const pad3 = new Instrument(90);
export const pad4 = new Instrument(91);
export const pad5 = new Instrument(92);
export const synth = pad5;
export const pad6 = new Instrument(93);
export const pad7 = new Instrument(94);
export const pad8 = new Instrument(96);

export function onSynth(): Instrument {
    return new Instrument(rnd(88, 96));
}

export const fx1 = new Instrument(97);
export const fx2 = new Instrument(98);
export const fx3 = new Instrument(99);
export const fx4 = new Instrument(100);
export const fx5 = new Instrument(101);
export const fx6 = new Instrument(102);
export const fx7 = new Instrument(103);
export const fx8 = new Instrument(104);

export function onFx(): Instrument {
    return new Instrument(rnd(97, 104));
}

export const agogo = new Instrument(113);
export const steelDrums = new Instrument(114);
export const woodblock = new Instrument(115);
export const taikoDrum = new Instrument(116);
export const melodicTom = new Instrument(117);
export const synthDrum = new Instrument(118);
export const reverseCymbal = new Instrument(119);
export const guitarFretNoise = new Instrument(120);
export const breathNoise = new Instrument(121);
export const seaShore = new Instrument(122);
export const birdTweet = new Instrument(123);
export const telephoneRing = new Instrument(124);
export const helicopter = new Instrument(125);
export const applause = new Instrument(126);
export const gunshot = new Instrument(127);
export const timpani = new Instrument(47);

export function onPerc(): Instrument {
    const num = rnd(113, 128);
    return new Instrument(num > 127 ? 47 : num);
}

export const drums1 = new Instrument(2, true, 40);
export const drums = drums1;
export const drums2 = new Instrument(3, true, 40);
export const drums3 = new Instrument(4, true, 40);
export const drums4 = new Instrument(5, true, 40);
export const drums5 = new Instrument(6, true, 40);
export const drums6 = new Instrument(7, true, 40);

export function onDrums(): Instrument {
    return new Instrument(rnd(2, 7), true, rnd(35, 57));
}

export const silently = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));

// Interface em Português — Portuguese alias for play()
(
    Instrument.prototype as Instrument & {
        toque: typeof Instrument.prototype.play;
    }
).toque = Instrument.prototype.play;
export const toque = play;
export const pare = stop;
export const instrumento = instrument;
export const emAlgo = onSomething;
export const naBateria = onDrums;
export const nasTeclas = onStruck;
export const nasCordas = onPluck;
export const nosArcos = onBowed;
export const nosBaixos = onBass;
export const nosMetais = onBlow;
export const nosSopros = onWind;
export const noSintetizador = onSynth;
export const nosEfeitos = onFx;
export const naPercussão = onPerc;
export const naVoz = onVoice;
export const quieto = silently;
export const escolha = choose;

export const fraco = softLevel;
export const mezzo = midLevel;
export const forte = loudLevel;
export const curta = shortDuration;
export const média = midDuration;
export const longa = longDuration;
export const agora = now;
export const logo = soon;
export const depois = later;
export const grave = lowPitch;
export const médio = midPitch;
export const agudo = highPitch;

export const pianoDeCauda = grandPiano;
export const pianoBrilhante = brightPiano;
export const deCaudaElétrico = electricGrand;
export const pianoRachado = honkyPiano;
export const pianoElétrico = electricPiano;
export const pianoElétrico2 = electricPiano2;
export const cravo = harpsichord;
export const clavinete = clavinet;
export const cravoElétrico = clavinet;
export const caixaDeMúsica = musicBox;
export const vibrafone = vibraphone;
export const xilofone = xylophone;
export const carrilhão = tubularBells;
export const sininho = tinkleBell;
export const sino = tinkleBell;
export const órgãoElétrico = drawbarOrgan;
export const órgãoPercussivo = percussiveOrgan;
export const órgãoDeRock = rockOrgan;
export const órgão = rockOrgan;
export const órgãoLitúrgico = churchOrgan;
export const órgãoDePalhetas = reedOrgan;
export const acordeão = accordion;
export const gaita = harmonic;
export const acordeãoDeTango = tangoAccordion;
export const violão = nylonAcousticGuitar;
export const vilãoDeNáilon = nylonAcousticGuitar;
export const violãoDeAço = steelAcousticGuitar;
export const guitarraDeJazz = jazzElectricGuitar;
export const guitarraLimpa = clearElectricGuitar;
export const guitarraAbafada = mutedElectricGuitar;
export const guitarraOverdrive = overdrivenGuitar;
export const guitarraDistorcida = distortionGuitar;
export const guitarraHarmônicos = guitarHarmonics;
export const samisém = shamisen;
export const cordasPizzicato = pizzicatoStrings;
export const harpaOrquestral = orchestralHarp;
export const harpa = orchestralHarp;
export const baixoAcústico = acousticBass;
export const baixoElétrico = fingerElectricBass;
export const baixoElétricoPalhetado = pickElectricBass;
export const baixoFretless = fretlessBass;
export const baixo = fretlessBass;
export const baixoSlap1 = slapBass1;
export const baixoSlap2 = slapBass2;
export const baixoSintetizado1 = synthBass1;
export const baixoSintetizado2 = synthBass2;
export const violino = violin;
export const violoncelo = cello;
export const celo = violoncelo;
export const contrabaixo = contrabass;
export const cordasTremolo = tremoloStrings;
export const cordas = stringEnsemble1;
export const cordas2 = stringEnsemble2;
export const cordasSintetizadas1 = synthStrings1;
export const cordasSintetizadas2 = synthStrings2;
export const coralAahs = choirAahs;
export const coralOohs = voiceOohs;
export const vozSintetizada = synthVoice;
export const golpeOrquestral = orchestralHit;
export const golpe = orchestralHit;
export const trompete = trumpet;
export const trompeteAbafado = mutedTrumpet;
export const trompeteComSurdina = mutedTrumpet;
export const trompaFrancesa = frenchHorn;
export const trompa = trompaFrancesa;
export const seçãoDeMetais = brassSection;
export const metais = seçãoDeMetais;
export const metalSintetizado1 = synthBrass1;
export const metalSintetizado2 = synthBrass2;
export const saxSoprando = sopranoSax;
export const saxAlto = altoSax;
export const saxTenor = tenorSax;
export const saxBarítono = baritoneSax;
export const oboé = oboe;
export const corneInglês = englishHorn;
export const fagote = bassoon;
export const clarineta = clarinet;
export const clarinete = clarinet;
export const pícolo = piccolo;
export const flautaTransversal = flute;
export const flauta = flute;
export const flautaDoce = recorder;
export const flautaDePã = panFlute;
export const garrafaSoprada = blownBottle;
export const garrafa = garrafaSoprada;
export const assobio = whistle;
export const assovio = assobio;
export const gaitaDeFole = bagPipe;
export const efeito1 = fx1;
export const efeito2 = fx2;
export const efeito3 = fx3;
export const efeito4 = fx4;
export const efeito5 = fx5;
export const efeito6 = fx6;
export const efeito7 = fx7;
export const efeito8 = fx8;
export const agogô = agogo;
export const tamborDeAço = steelDrums;
export const blocoDeMadeira = woodblock;
export const bloco = blocoDeMadeira;
export const taiko = taikoDrum;
export const tomTom = melodicTom;
export const bateriaSintetizada = synthDrum;
export const pratoReverso = reverseCymbal;
export const trasteDeGuitarra = guitarFretNoise;
export const traste = trasteDeGuitarra;
export const respiração = breathNoise;
export const ondaDoMar = seaShore;
export const pássaro = birdTweet;
export const telefone = telephoneRing;
export const helicóptero = helicopter;
export const aplausos = applause;
export const tiro = gunshot;
export const tímpano = timpani;
export const bateria1 = drums1;
export const bateria = drums1;
export const bateria2 = drums2;
export const bateria3 = drums3;
export const bateria4 = drums4;
export const bateria5 = drums5;
export const bateria6 = drums6;
export const membranofone = membranophone;
export const idiofone = idiophone;

export * from "./litePlay.constants";
