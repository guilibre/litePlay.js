import { Instrument } from "./instrument";
import { rnd, choose } from "./core";
import { setDefInstr } from "./events";

export const grandPiano = new Instrument(0);
export const piano = grandPiano;
setDefInstr(piano);

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

export function onSomething(): Instrument {
    return new Instrument(rnd(0, 127));
}

export { choose };
