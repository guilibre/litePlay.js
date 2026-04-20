import p5 from "https://esm.sh/p5";

// litePlay URL
const lpURL = "https://vlazzarini.github.io/litePlay.js/litePlay.js";
// sequencer patterns
let riff, melody, shuf, kck, snr;
// sequencer tracks
let cymbals, kicks, snares, bassline, topline;

// sequencer setup
function sequence(lp) {
    const beatDiv = 1 / 3;
    lp.setBpm(100);

    riff = [Eb3, [G3, 1, 0, 0.5], Bb3, [Db3, 2, 0.75, 0.2]];
    melody = [
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
    shuf = [[cymbal, 1, 0, 1 / 3], O, [cymbal, 0.9], [cymbal, 0.9]];
    kck = [[kick, 0.5], O, [kick, 1]];
    snr = [snare, O];

    cymbals = lp.sequencer.add(lp.drums, shuf, 0.5, beatDiv);
    kicks = lp.sequencer.add(lp.drums, kck, 0.1, beatDiv);
    snares = lp.sequencer.add(lp.drums, snr, 0.1);
    bassline = lp.sequencer.add(lp.bass, riff, 0.1);
    topline = lp.sequencer.add(lp.synth, melody, 0.1);

    lp.sequencer.play();
}

// arpeggio
function arp(lp) {
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

new p5((sketch) => {
    sketch.setup = async () => {
        const lp = await import(lpURL);
        await lp.startEngine();
        sequence(lp);

        sketch.createCanvas(400, 400);
        const heartbeat = () => {
            sketch.fill("red");
            sketch.rect(20, 20, 60, 60);
            setTimeout(() => {
                sketch.fill("grey");
                sketch.rect(20, 20, 60, 60);
            }, 100);
            lp.sequencer.addCallback(heartbeat);
        };
        lp.sequencer.addCallback(heartbeat);
    };
});
