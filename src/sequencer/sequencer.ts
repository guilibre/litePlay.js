import p5 from "p5";
import * as LitePlay from "../litePlay.ts";
import { createLitePlayEditor } from "../editor/editor.ts";

const DEFAULT_SEQ_CODE = `lp.setBpm(120);
lp.sequencer.add(lp.drums, [lp.kick, lp.O, lp.snare, lp.O], 0.8);
lp.sequencer.play();`;

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

let lastBeatMs = 0;
let rings: { r: number; alpha: number }[] = [];

new p5((sketch: p5) => {
    sketch.setup = async () => {
        await waitForStart();
        await LitePlay.startEngine();

        // ── Editor setup ──────────────────────────────────────────────────────
        const editorContainer = document.getElementById(
            "seq-editor-container"
        ) as HTMLElement;
        const consoleEl = document.getElementById(
            "seq-console"
        ) as HTMLTextAreaElement;
        const storageKey = "liteplay_seq_code";

        if (!localStorage.getItem(storageKey)) {
            localStorage.setItem(storageKey, DEFAULT_SEQ_CODE);
        }

        const editor = createLitePlayEditor({
            editorContainer,
            consoleEl,
            storageKey,
        });

        (
            document.getElementById("seq-run-btn") as HTMLButtonElement
        ).addEventListener("click", editor.run);
        (
            document.getElementById("seq-stop-btn") as HTMLButtonElement
        ).addEventListener("click", editor.stop);

        // ── Canvas setup ──────────────────────────────────────────────────────
        const canvasEl = document.getElementById("seq-canvas")!;
        const cnv = sketch.createCanvas(
            canvasEl.clientWidth,
            canvasEl.clientHeight
        );
        cnv.parent("seq-canvas");

        const onBeat = (lookaheadBeats: number): void => {
            const delayMs = LitePlay.secs(lookaheadBeats) * 1000;
            setTimeout(() => {
                lastBeatMs = sketch.millis();
                rings.push({ r: 0, alpha: 220 });
            }, delayMs);
            LitePlay.sequencer.addCallback(onBeat);
        };
        LitePlay.sequencer.addCallback(onBeat);
    };

    sketch.windowResized = () => {
        const canvas = document.getElementById("seq-canvas");
        if (canvas)
            sketch.resizeCanvas(canvas.clientWidth, canvas.clientHeight);
    };

    sketch.draw = () => {
        const bpm = LitePlay.getBpm();
        const beatDuration = (60 / bpm) * 1000;
        const elapsed = sketch.millis() - lastBeatMs;
        const phase = Math.min(elapsed / beatDuration, 1);

        const cx = sketch.width / 2;
        const cy = sketch.height / 2;

        sketch.background(30, 33, 39);

        rings = rings.filter((ring) => ring.alpha > 1);
        for (const ring of rings) {
            ring.r += 4;
            ring.alpha *= 0.93;
            sketch.noFill();
            sketch.stroke(220, 60, 60, ring.alpha);
            sketch.strokeWeight(2);
            sketch.circle(cx, cy, ring.r * 2);
        }

        const pulse = 1 - Math.pow(phase, 2);
        const baseR = 60;
        const pulseR = baseR + pulse * 20;
        sketch.noStroke();
        sketch.fill(220, 60, 60, 30 + pulse * 60);
        sketch.circle(cx, cy, pulseR * 2 + 40);
        sketch.fill(220, 60, 60, 180 + pulse * 75);
        sketch.circle(cx, cy, pulseR * 2);
    };
});
