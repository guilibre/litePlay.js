import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
    base: "/litePlay.js/",
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, "index.html"),
                sequencer: resolve(__dirname, "src/sequencer/index.html"),
            },
        },
    },
});
