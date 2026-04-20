import {
    play,
    stop,
    instrument,
    onSomething,
    onDrums,
    onStruck,
    onPluck,
    onBowed,
    onBass,
    onBlow,
    onWind,
    onSynth,
    onFx,
    onPerc,
    onVoice,
    silently,
    choose,
    softLevel,
    midLevel,
    loudLevel,
    shortDuration,
    midDuration,
    longDuration,
    now,
    soon,
    later,
    lowPitch,
    midPitch,
    highPitch,
    membranophone,
    idiophone,
    grandPiano,
    brightPiano,
    electricGrand,
    honkyPiano,
    electricPiano,
    electricPiano2,
    harpsichord,
    clavinet,
    musicBox,
    vibraphone,
    xylophone,
    tubularBells,
    tinkleBell,
    drawbarOrgan,
    percussiveOrgan,
    rockOrgan,
    churchOrgan,
    reedOrgan,
    accordion,
    harmonic,
    tangoAccordion,
    nylonAcousticGuitar,
    steelAcousticGuitar,
    jazzElectricGuitar,
    clearElectricGuitar,
    mutedElectricGuitar,
    overdrivenGuitar,
    distortionGuitar,
    guitarHarmonics,
    shamisen,
    pizzicatoStrings,
    orchestralHarp,
    acousticBass,
    fingerElectricBass,
    pickElectricBass,
    fretlessBass,
    slapBass1,
    slapBass2,
    synthBass1,
    synthBass2,
    violin,
    cello,
    contrabass,
    tremoloStrings,
    stringEnsemble1,
    stringEnsemble2,
    synthStrings1,
    synthStrings2,
    choirAahs,
    voiceOohs,
    synthVoice,
    orchestralHit,
    trumpet,
    mutedTrumpet,
    frenchHorn,
    brassSection,
    synthBrass1,
    synthBrass2,
    sopranoSax,
    altoSax,
    tenorSax,
    baritoneSax,
    oboe,
    englishHorn,
    bassoon,
    clarinet,
    piccolo,
    flute,
    recorder,
    panFlute,
    blownBottle,
    whistle,
    bagPipe,
    fx1,
    fx2,
    fx3,
    fx4,
    fx5,
    fx6,
    fx7,
    fx8,
    agogo,
    steelDrums,
    woodblock,
    taikoDrum,
    melodicTom,
    synthDrum,
    reverseCymbal,
    guitarFretNoise,
    breathNoise,
    seaShore,
    birdTweet,
    telephoneRing,
    helicopter,
    applause,
    gunshot,
    timpani,
    drums1,
    drums2,
    drums3,
    drums4,
    drums5,
    drums6,
    Instrument,
} from "./litePlay";

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

export const membranofone = membranophone;
export const idiofone = idiophone;

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
