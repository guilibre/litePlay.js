import { basicSetup } from "codemirror";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState, Prec } from "@codemirror/state";
import { javascript, javascriptLanguage } from "@codemirror/lang-javascript";
import {
    autocompletion,
    CompletionContext,
    CompletionResult,
} from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { MediaRecorder, register } from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";
import * as litePlayLang from "../litePlay.ts";
import * as constants from "../litePlay.constants.ts";

const { getCsoundNode, reset } = litePlayLang;

// ── Reusable editor factory ───────────────────────────────────────────────────

export interface LitePlayEditorOptions {
    editorContainer: HTMLElement;
    consoleEl: HTMLTextAreaElement;
    storageKey?: string;
    extraKeys?: Parameters<typeof keymap.of>[0];
}

export interface LitePlayEditor {
    run(): boolean;
    stop(): Promise<void>;
    getCode(): string;
}

const MAX_CONSOLE_LINES = 500;

export function createLitePlayEditor(
    opts: LitePlayEditorOptions
): LitePlayEditor {
    const {
        editorContainer,
        consoleEl,
        storageKey = "liteplay_code",
        extraKeys = [],
    } = opts;

    function appendToConsole(text: string): void {
        consoleEl.value += text + "\n";
        const lines = consoleEl.value.split("\n");
        if (lines.length > MAX_CONSOLE_LINES)
            consoleEl.value = lines.slice(-MAX_CONSOLE_LINES).join("\n");
        consoleEl.scrollTop = consoleEl.scrollHeight;
    }

    const originalLog = console.log;
    console.log = function (...args: unknown[]) {
        originalLog.apply(console, args);
        appendToConsole(
            args
                .map((arg) =>
                    typeof arg === "object" ? JSON.stringify(arg) : String(arg)
                )
                .join(" ")
        );
    };

    const originalError = console.error;
    console.error = function (...args: unknown[]) {
        originalError.apply(console, args);
        appendToConsole(
            "ERROR: " +
                args
                    .map((arg) =>
                        arg instanceof Error ? arg.message : String(arg)
                    )
                    .join(" ")
        );
    };

    const lpKeys = Object.keys(litePlayLang);

    function litePlayCompletions(
        context: CompletionContext
    ): CompletionResult | null {
        const word = context.matchBefore(/[a-zA-Z0-9_À-ÿ]+/);
        if (!word && !context.explicit) return null;
        return {
            from: word ? word.from : context.pos,
            options: lpKeys.map((keyword) => {
                const itemValue = (litePlayLang as Record<string, unknown>)[
                    keyword
                ];
                const jsType = typeof itemValue;
                let cmType = "variable";
                if (jsType === "function") cmType = "function";
                else if (jsType === "number" || jsType === "string")
                    cmType = "constant";
                else if (jsType === "object") cmType = "class";
                return {
                    label: keyword,
                    type: cmType,
                    detail: jsType,
                    info: "litePlay",
                };
            }),
        };
    }

    function run(): boolean {
        try {
            const currentCode = view.state.doc.toString();
            if (currentCode.trim() === "")
                throw new Error("Empty! Write something!");
            const func = new Function("lp", "constants", currentCode);
            func(litePlayLang, constants);
            return true;
        } catch (error) {
            console.error(error);
            return true;
        }
    }

    const stop = async (): Promise<void> => {
        console.log("Stopping audio...");
        litePlayLang.sequencer.stop();
        await reset();
        console.log("Audio stopped.");
    };

    const startState = EditorState.create({
        doc: localStorage.getItem(storageKey) ?? "",
        extensions: [
            basicSetup,
            oneDark,
            javascript(),
            javascriptLanguage.data.of({ autocomplete: litePlayCompletions }),
            autocompletion(),
            EditorView.updateListener.of((update) => {
                if (update.docChanged)
                    localStorage.setItem(
                        storageKey,
                        update.state.doc.toString()
                    );
            }),
            Prec.highest(
                keymap.of([
                    { key: "Mod-Enter", run },
                    {
                        key: "Mod-.",
                        run: () => {
                            stop().catch((err) =>
                                console.error("Failed to stop:", err)
                            );
                            return true;
                        },
                    },
                    ...extraKeys,
                ])
            ),
        ],
    });

    const view = new EditorView({ state: startState, parent: editorContainer });

    return {
        run,
        stop,
        getCode: () => view.state.doc.toString(),
    };
}

// ── Main editor page init (editor-only, not imported by sequencer) ────────────

const consoleOutput = document.getElementById(
    "console-output"
) as HTMLTextAreaElement | null;
const editorContainer = document.getElementById(
    "editor-container"
) as HTMLElement | null;

if (editorContainer && consoleOutput) {
    const getDatetimeString = (): string => {
        const d = new Date();
        return `${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}_${d.getHours()}-${d.getMinutes()}`;
    };

    const lp = createLitePlayEditor({
        editorContainer,
        consoleEl: consoleOutput,
    });

    let liteplayEngine: typeof litePlayLang | null = null;

    document.addEventListener(
        "pointerdown",
        async () => {
            if (!liteplayEngine) {
                try {
                    console.log("Loading litePlay engine...");
                    await litePlayLang.startEngine();
                    liteplayEngine = litePlayLang;
                    Object.assign(window, litePlayLang);
                    console.log("litePlay is ready!");
                    const runBtn = document.getElementById("run-btn");
                    if (runBtn) runBtn.classList.add("ready-green");
                    const recBtn = document.getElementById("rec-btn");
                    if (recBtn) recBtn.classList.add("ready-red");
                } catch (error) {
                    console.error("Failed to auto-start litePlay:", error);
                }
            }
        },
        { once: true }
    );

    const saveCode = (): void => {
        const text = lp.getCode();
        const blob = new Blob([text], { type: "text/javascript" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "litePlay" + getDatetimeString() + ".js";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    let mediaRecorder: InstanceType<typeof MediaRecorder> | null = null;
    let audioChunks: Blob[] = [];
    let connectedCsoundNode: AudioNode | null = null;
    let destNode: MediaStreamAudioDestinationNode | null = null;
    let encoderRegistered = false;

    async function startRecording(): Promise<void> {
        if (
            !litePlayLang.audio_context ||
            !litePlayLang.csound ||
            (mediaRecorder && mediaRecorder.state === "recording")
        ) {
            console.error("Engine not ready or already recording.");
            return;
        }
        try {
            if (!encoderRegistered) {
                await register(await connect());
                encoderRegistered = true;
            }
            connectedCsoundNode = await getCsoundNode();
            destNode =
                litePlayLang.audio_context.createMediaStreamDestination();
            connectedCsoundNode.connect(destNode);

            const resampleContext = new AudioContext({ sampleRate: 44100 });
            const sourceNode = resampleContext.createMediaStreamSource(
                destNode.stream
            );
            const resampledDest =
                resampleContext.createMediaStreamDestination();
            sourceNode.connect(resampledDest);

            mediaRecorder = new MediaRecorder(resampledDest.stream, {
                mimeType: "audio/wav",
            });
            audioChunks = [];
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
                const audioUrl = URL.createObjectURL(audioBlob);
                const link = document.createElement("a");
                link.href = audioUrl;
                link.download = "litePlay_" + getDatetimeString() + ".wav";
                document.body.appendChild(link);
                link.click();
                link.remove();
                URL.revokeObjectURL(audioUrl);
                if (connectedCsoundNode && destNode)
                    connectedCsoundNode.disconnect(destNode);
                if (resampleContext.state !== "closed") resampleContext.close();
            };
            mediaRecorder.start();
            console.log("Recording started...");
        } catch (err) {
            console.error("Failed to start recording: ", err);
        }
    }

    function stopRecording(): void {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            console.log("Recording stopped! Downloading sound file...");
        }
    }

    (document.querySelector("#run-btn") as HTMLButtonElement).addEventListener(
        "click",
        lp.run
    );
    (document.querySelector("#stop-btn") as HTMLButtonElement).addEventListener(
        "click",
        lp.stop
    );
    (document.querySelector("#save-btn") as HTMLButtonElement).addEventListener(
        "click",
        saveCode
    );
    (document.querySelector("#rec-btn") as HTMLButtonElement).addEventListener(
        "click",
        startRecording
    );
    (
        document.querySelector("#stopRec-btn") as HTMLButtonElement
    ).addEventListener("click", stopRecording);
}
