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

new p5((sketch: p5) => {
    sketch.setup = async () => {
        await LitePlay.startEngine();
        sequence(LitePlay);
        arp(LitePlay);

        sketch.createCanvas(400, 400);
        const heartbeat = (): void => {
            sketch.fill("red");
            sketch.rect(20, 20, 60, 60);
            setTimeout(() => {
                sketch.fill("grey");
                sketch.rect(20, 20, 60, 60);
            }, 100);
            LitePlay.sequencer.addCallback(heartbeat);
        };
        LitePlay.sequencer.addCallback(heartbeat);
    };
});
