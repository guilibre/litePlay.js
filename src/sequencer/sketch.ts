import p5 from "p5";
import * as LitePlay from "../litePlay.ts";
import {
    Eb3,
    G3,
    Bb3,
    Db3,
    Eb5,
    Bb5,
    G6,
    F5,
    Ab5,
    Db6,
    G5,
    C6,
    Eb7,
    Bb6,
    Eb6,
    cymbal,
    kick,
    snare,
    O,
} from "../litePlay.constants.ts";

type LP = typeof LitePlay;

function sequence(lp: LP): void {
    const beatDiv = 1 / 3;
    lp.setBpm(100);

    const riff = [Eb3, [G3, 1, 0, 0.5], Bb3, [Db3, 2, 0.75, 0.2]];
    const melody = [
        [
            [Eb5, 3, 0, 2, lp.organ],
            [Bb5, 3, 0, 2, lp.organ],
            [G6, 1, 0, 2],
        ],
        [
            [F5, 3, 0, 2, lp.organ],
            [Ab5, 3, 0, 2, lp.organ],
            [Db6, 1, 0, 3.5],
        ],
        O,
        [Bb5, 1, 0.5, 0.5],
        [[Eb5, 3, 0, 1, lp.organ], [G5, 3, 0, 1, lp.organ], [C6]],
        O,
        Bb5,
        Ab5,
    ];
    const shuf = [[cymbal, 1, 0, 1 / 3], O, [cymbal, 0.9], [cymbal, 0.9]];
    const kck = [[kick, 0.5], O, [kick, 1]];
    const snr = [snare, O];

    lp.sequencer.add(lp.drums, shuf as LitePlay.SeqEvent[], 0.5, beatDiv);
    lp.sequencer.add(lp.drums, kck as LitePlay.SeqEvent[], 0.1, beatDiv);
    lp.sequencer.add(lp.drums, snr as LitePlay.SeqEvent[], 0.1);
    lp.sequencer.add(lp.bass, riff as LitePlay.SeqEvent[], 0.1);
    lp.sequencer.add(lp.synth, melody as LitePlay.SeqEvent[], 0.1);
    lp.sequencer.play();
}

function arp(lp: LP): void {
    const eList = lp.eventList.create(
        lp.piano.event(Eb7, 0.1, 0, 1),
        lp.piano.event(Bb6, 0.1, 0.25, 1),
        lp.piano.event(G6, 0.1, 0.75, 1),
        lp.piano.event(Eb6, 0.1, 1, 1)
    );
    lp.sequencer.addCallback((t) => {
        eList.play(t);
    });
}

function waitForStart(): Promise<void> {
    return new Promise((resolve) => {
        const overlay = document.getElementById("start-overlay")!;
        const btn = document.getElementById("start-btn")!;
        btn.addEventListener(
            "click",
            () => {
                overlay.style.display = "none";
                resolve();
            },
            { once: true }
        );
    });
}

// ── Visual state ─────────────────────────────────────────────────────────────

let beatCount = 0;
let lastBeatMs = 0;
let rings: { r: number; alpha: number }[] = [];

new p5((sketch: p5) => {
    sketch.setup = async () => {
        await waitForStart();
        await LitePlay.startEngine();
        sequence(LitePlay);
        arp(LitePlay);

        const cnv = sketch.createCanvas(
            sketch.windowWidth,
            sketch.windowHeight - 44
        );
        cnv.style("display", "block");

        const onBeat = (lookaheadBeats: number): void => {
            const delayMs = LitePlay.secs(lookaheadBeats) * 1000;
            setTimeout(() => {
                beatCount++;
                lastBeatMs = sketch.millis();
                rings.push({ r: 0, alpha: 220 });
            }, delayMs);
            LitePlay.sequencer.addCallback(onBeat);
        };
        LitePlay.sequencer.addCallback(onBeat);
    };

    sketch.windowResized = () => {
        sketch.resizeCanvas(sketch.windowWidth, sketch.windowHeight - 44);
    };

    sketch.draw = () => {
        const bpm = LitePlay.getBpm();
        const beatDuration = (60 / bpm) * 1000; // ms
        const elapsed = sketch.millis() - lastBeatMs;
        const phase = Math.min(elapsed / beatDuration, 1); // 0→1 between beats

        const cx = sketch.width / 2;
        const cy = sketch.height / 2;

        sketch.background(30, 33, 39);

        // ── Expanding rings ───────────────────────────────────────────────────
        rings = rings.filter((ring) => ring.alpha > 1);
        for (const ring of rings) {
            ring.r += 4;
            ring.alpha *= 0.93;
            sketch.noFill();
            sketch.stroke(220, 60, 60, ring.alpha);
            sketch.strokeWeight(2);
            sketch.circle(cx, cy, ring.r * 2);
        }

        // ── Central pulse circle ──────────────────────────────────────────────
        const pulse = 1 - Math.pow(phase, 2); // fast attack, slow decay
        const baseR = 60;
        const pulseR = baseR + pulse * 20;
        sketch.noStroke();
        sketch.fill(220, 60, 60, 30 + pulse * 60);
        sketch.circle(cx, cy, pulseR * 2 + 40);
        sketch.fill(220, 60, 60, 180 + pulse * 75);
        sketch.circle(cx, cy, pulseR * 2);
    };
});
