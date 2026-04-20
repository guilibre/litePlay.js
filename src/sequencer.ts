import { Instrument, isInstr, SeqEvent, EventValue } from "./instrument";
import { resolve, Resolvable, secs, beats, audioClock } from "./core";

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
    pause(): void;
    resume(): void;
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
    pause() {
        if (this.clickOn) this.clickOn = false;
    },
    resume() {
        if (!this.clickOn) {
            this.clickOn = true;
            this.click(audioClock());
        }
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
        this.seqList = this.seqList.filter((v) => v.id !== id);
    },
};
