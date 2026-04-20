import { audio_context } from "./engine";

interface GlobalObj {
    freeChannel: number;
    maxChannel: number;
    BPM: number;
    sampnum: number;
}

export const globalObj: GlobalObj = {
    freeChannel: 16,
    maxChannel: 100,
    BPM: 60.0,
    sampnum: 0,
};

export type Resolvable<T> = T | (() => T);
export const resolve = <T>(val: Resolvable<T>): T =>
    typeof val === "function" ? (val as () => T)() : val;

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

export const silently = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));
