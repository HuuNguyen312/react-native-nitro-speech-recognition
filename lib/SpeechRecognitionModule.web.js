"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechRecognitionModule = void 0;
let _speechRecognitionRef = null;
const webToNativeEventMap = {
    audioend: () => ({ uri: null }),
    audiostart: () => ({ uri: null }),
    end: () => null,
    error: (ev) => ({ error: ev.error, message: ev.message }),
    nomatch: () => null,
    result: (ev) => {
        const isFinal = Boolean(ev.results[ev.resultIndex]?.isFinal);
        if (isFinal) {
            const results = [];
            for (let i = 0; i < ev.results[ev.resultIndex].length; i++) {
                const result = ev.results[ev.resultIndex][i];
                results.push({
                    transcript: result.transcript,
                    confidence: result.confidence,
                    segments: [],
                });
            }
            return { isFinal: true, results };
        }
        let transcript = "";
        const segments = [];
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const resultList = ev.results[i];
            for (let j = 0; j < resultList.length; j++) {
                const result = resultList[j];
                if (!result)
                    continue;
                segments.push({
                    confidence: result.confidence,
                    segment: result.transcript,
                    startTimeMillis: 0,
                    endTimeMillis: 0,
                });
                if (!isFinal) {
                    transcript += result.transcript;
                }
            }
        }
        return {
            isFinal: false,
            results: [
                {
                    transcript,
                    confidence: segments.reduce((acc, curr) => acc + curr.confidence, 0) /
                        segments.length,
                    segments,
                },
            ],
        };
    },
    soundstart: () => null,
    speechend: () => null,
    speechstart: () => null,
    start: () => null,
    soundend: () => null,
};
class SpeechRecognitionModuleWeb {
    constructor() {
        this._nativeListeners = new Map();
        this._clientListeners = new Map();
        this._listeners = new Map();
    }
    addListener(eventName, listener) {
        // @ts-expect-error
        const nativeListener = (ev) => {
            const handler = eventName in webToNativeEventMap
                ? webToNativeEventMap[eventName]
                : null;
            // @ts-expect-error
            const eventPayload = handler?.(ev);
            // @ts-expect-error
            listener(eventPayload);
        };
        _speechRecognitionRef?.addEventListener(eventName, nativeListener);
        if (!this._nativeListeners.has(eventName)) {
            this._nativeListeners.set(eventName, new Set());
        }
        // @ts-expect-error
        this._nativeListeners.get(eventName)?.add(nativeListener);
        // @ts-expect-error
        this._clientListeners.set(listener, nativeListener);
        if (!this._listeners.has(eventName)) {
            this._listeners.set(eventName, new Set());
        }
        this._listeners.get(eventName).add(listener);
        return {
            remove: () => {
                // @ts-expect-error
                this._nativeListeners.get(eventName)?.delete(nativeListener);
                this._clientListeners.delete(listener);
                this._listeners.get(eventName)?.delete(listener);
            },
        };
    }
    start(options) {
        const SpeechRecognitionClass = typeof webkitSpeechRecognition !== "undefined"
            ? webkitSpeechRecognition
            : globalThis.SpeechRecognition;
        _speechRecognitionRef = new SpeechRecognitionClass();
        _speechRecognitionRef.lang = options.lang ?? "en-US";
        _speechRecognitionRef.interimResults = options.interimResults ?? false;
        _speechRecognitionRef.maxAlternatives = options.maxAlternatives ?? 1;
        _speechRecognitionRef.continuous = options.continuous ?? false;
        this._nativeListeners.forEach((listeners, eventName) => {
            for (const listener of listeners) {
                _speechRecognitionRef?.removeEventListener(eventName, listener);
                _speechRecognitionRef?.addEventListener(eventName, listener);
            }
        });
        _speechRecognitionRef.start();
    }
    stop() {
        _speechRecognitionRef?.stop();
    }
    abort() {
        _speechRecognitionRef?.abort();
    }
    getStateAsync() {
        console.warn("getStateAsync is not supported on web. Returning 'inactive'.");
        return Promise.resolve("inactive");
    }
    requestPermissionsAsync() {
        console.warn("requestPermissionsAsync is not supported on web. Returning a granted permission response.");
        return Promise.resolve({
            granted: true,
            canAskAgain: false,
            expires: "never",
            status: "granted",
        });
    }
    getPermissionsAsync() {
        return this.requestPermissionsAsync();
    }
    getMicrophonePermissionsAsync() {
        return this.requestPermissionsAsync();
    }
    requestMicrophonePermissionsAsync() {
        return this.requestPermissionsAsync();
    }
    getSpeechRecognizerPermissionsAsync() {
        return this.requestPermissionsAsync();
    }
    requestSpeechRecognizerPermissionsAsync() {
        return this.requestPermissionsAsync();
    }
    async getSupportedLocales() {
        console.warn("getSupportedLocales is not supported on web. Returning an empty array.");
        return { locales: [], installedLocales: [] };
    }
    getSpeechRecognitionServices() {
        return [];
    }
    getDefaultRecognitionService() {
        return { packageName: "" };
    }
    getAssistantService() {
        return { packageName: "" };
    }
    supportsOnDeviceRecognition() {
        return false;
    }
    supportsRecording() {
        return false;
    }
    isRecognitionAvailable() {
        return (typeof webkitSpeechRecognition !== "undefined" ||
            typeof globalThis.SpeechRecognition !== "undefined");
    }
    androidTriggerOfflineModelDownload() {
        console.warn("androidTriggerOfflineModelDownload is not supported on web.");
        return Promise.resolve({
            status: "opened_dialog",
            message: "Offline model download is not supported on web.",
        });
    }
    setCategoryIOS() {
        console.warn("setCategoryIOS is not supported on web.");
    }
    getAudioSessionCategoryAndOptionsIOS() {
        console.warn("getAudioSessionCategoryAndOptionsIOS is not supported on web.");
        return {
            category: "playAndRecord",
            categoryOptions: ["defaultToSpeaker", "allowBluetooth"],
            mode: "measurement",
        };
    }
    setAudioSessionActiveIOS() {
        console.warn("setAudioSessionActiveIOS is not supported on web.");
    }
}
exports.SpeechRecognitionModule = new SpeechRecognitionModuleWeb();
//# sourceMappingURL=SpeechRecognitionModule.web.js.map