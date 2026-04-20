# litePlay.js

This repo contains the source files for litePlay.js, an experimental platform
for live coding, based on the following technologies:

- [Csound](https://csound.com/) (via `@csound/browser`)
- TypeScript / Web Audio API
- Vite

There is no need to install anything to use it — the editor runs entirely in
your browser.

## Online editor

A dedicated online editor for litePlay is available at:

**[https://guilibre.github.io/litePlay.js/](https://guilibre.github.io/litePlay.js/)**

Click anywhere on the page to start the audio engine, write your code, and hit
**RUN** or **Ctrl+Enter**. Use **STOP** or **Ctrl+.** to stop all sounds.

## Quick example

```javascript
play(C4);
```

```javascript
sequencer.add(piano, [C4, E4, G4, C5]);
sequencer.play();
```

LitePlay's [documentation](https://g-ubimus.github.io/litePlay.docs/) is
available in English and Portuguese.

## Running locally

**Prerequisites:** [Node.js](https://nodejs.org/) installed.

```bash
npm install
npm run dev
```

Then open the URL shown in the terminal.

## Building and deploying

```bash
npm run build    # compiles to dist/
npm run deploy   # builds and pushes to gh-pages
```
