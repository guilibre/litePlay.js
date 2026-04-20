import { Csound } from "@csound/browser";

export interface CsoundInstance {
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

export const csoundProxy = new Proxy({} as CsoundInstance, {
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

const csdUrl = import.meta.env.BASE_URL + "litePlay.csd";
const sfontUrl = import.meta.env.BASE_URL + "gm.sf2";

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

export async function reset(): Promise<void> {
    if (csound) await csoundProxy.inputMessage("i 200 0 0.1");
}

export async function getCsoundNode(): Promise<AudioNode> {
    return csoundProxy.getNode();
}
