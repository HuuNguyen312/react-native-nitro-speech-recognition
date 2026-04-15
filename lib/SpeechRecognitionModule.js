"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechRecognitionModule = void 0;
const react_native_nitro_modules_1 = require("react-native-nitro-modules");
const native = react_native_nitro_modules_1.NitroModules.createHybridObject("SpeechRecognition");
// Maps event names to their native addXxxListener method names
const eventToNativeMethod = {
    result: "addResultListener",
    error: "addErrorListener",
    start: "addStartListener",
    end: "addEndListener",
    speechstart: "addSpeechStartListener",
    speechend: "addSpeechEndListener",
    audiostart: "addAudioStartListener",
    audioend: "addAudioEndListener",
    soundstart: "addSoundStartListener",
    soundend: "addSoundEndListener",
    nomatch: "addNoMatchListener",
    languagedetection: "addLanguageDetectionListener",
    volumechange: "addVolumeChangeListener",
};
/**
 * Converts the public SpeechRecognitionOptions to the internal Nitro format.
 * Handles androidIntentOptions serialization (JSON string).
 */
function toNativeOptions(options) {
    return {
        lang: options.lang ?? "en-US",
        interimResults: options.interimResults ?? false,
        maxAlternatives: options.maxAlternatives ?? 5,
        contextualStrings: options.contextualStrings ?? undefined,
        continuous: options.continuous ?? false,
        requiresOnDeviceRecognition: options.requiresOnDeviceRecognition ?? false,
        addsPunctuation: options.addsPunctuation ?? false,
        androidRecognitionServicePackage: options.androidRecognitionServicePackage ?? undefined,
        androidIntentOptionsJson: options.androidIntentOptions
            ? JSON.stringify(options.androidIntentOptions)
            : undefined,
        audioSource: options.audioSource
            ? {
                uri: options.audioSource.uri,
                audioChannels: options.audioSource.audioChannels ?? undefined,
                audioEncoding: options.audioSource.audioEncoding ?? undefined,
                sampleRate: options.audioSource.sampleRate ?? undefined,
                chunkDelayMillis: options.audioSource.chunkDelayMillis ?? undefined,
            }
            : undefined,
        recordingOptions: options.recordingOptions
            ? {
                persist: options.recordingOptions.persist,
                outputDirectory: options.recordingOptions.outputDirectory ?? undefined,
                outputFileName: options.recordingOptions.outputFileName ?? undefined,
                outputSampleRate: options.recordingOptions.outputSampleRate ?? undefined,
                outputEncoding: options.recordingOptions.outputEncoding ?? undefined,
            }
            : undefined,
        androidIntent: options.androidIntent ?? undefined,
        iosTaskHint: options.iosTaskHint ?? undefined,
        iosCategory: options.iosCategory
            ? {
                category: options.iosCategory.category,
                categoryOptions: options.iosCategory.categoryOptions,
                mode: options.iosCategory.mode ?? undefined,
            }
            : undefined,
        volumeChangeEventOptions: options.volumeChangeEventOptions
            ? {
                enabled: options.volumeChangeEventOptions.enabled ?? false,
                intervalMillis: options.volumeChangeEventOptions.intervalMillis ?? 100,
            }
            : undefined,
        iosVoiceProcessingEnabled: options.iosVoiceProcessingEnabled ?? false,
    };
}
class SpeechRecognitionModuleImpl {
    constructor() {
        /**
         * Map of event name -> Set of JS listener functions.
         * When the first listener for an event is added, we register a native callback.
         * The native callback fans out to all JS listeners.
         */
        this.eventListeners = new Map();
        /**
         * Whether native listeners have been registered for each event type.
         * We register all native listeners at once on first addListener call.
         */
        this.nativeListenersRegistered = false;
    }
    registerAllNativeListeners() {
        if (this.nativeListenersRegistered)
            return;
        this.nativeListenersRegistered = true;
        // Register native callbacks for all event types.
        // Each callback fans out to all registered JS listeners for that event.
        native.addResultListener((event) => {
            this.dispatch("result", {
                isFinal: event.isFinal,
                results: event.results.map((r) => ({
                    transcript: r.transcript,
                    confidence: r.confidence,
                    segments: r.segments.map((s) => ({
                        startTimeMillis: s.startTimeMillis,
                        endTimeMillis: s.endTimeMillis,
                        segment: s.segment,
                        confidence: s.confidence,
                    })),
                })),
            });
        });
        native.addErrorListener((event) => {
            this.dispatch("error", {
                error: event.error,
                message: event.message,
                code: event.code !== -1 ? event.code : undefined,
            });
        });
        native.addStartListener(() => this.dispatch("start", null));
        native.addEndListener(() => this.dispatch("end", null));
        native.addSpeechStartListener(() => this.dispatch("speechstart", null));
        native.addSpeechEndListener(() => this.dispatch("speechend", null));
        native.addAudioStartListener((event) => {
            this.dispatch("audiostart", { uri: event.uri ?? null });
        });
        native.addAudioEndListener((event) => {
            this.dispatch("audioend", { uri: event.uri ?? null });
        });
        native.addSoundStartListener(() => this.dispatch("soundstart", null));
        native.addSoundEndListener(() => this.dispatch("soundend", null));
        native.addNoMatchListener(() => this.dispatch("nomatch", null));
        native.addLanguageDetectionListener((event) => {
            this.dispatch("languagedetection", {
                detectedLanguage: event.detectedLanguage,
                confidence: event.confidence,
                topLocaleAlternatives: [...event.topLocaleAlternatives],
            });
        });
        native.addVolumeChangeListener((event) => {
            this.dispatch("volumechange", { value: event.value });
        });
    }
    dispatch(eventName, event) {
        const listeners = this.eventListeners.get(eventName);
        if (listeners) {
            for (const listener of listeners) {
                listener(event);
            }
        }
    }
    /**
     * Add a listener for a native speech recognition event.
     * Returns a Subscription object with a `remove()` method.
     */
    addListener(eventName, callback) {
        this.registerAllNativeListeners();
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
        return {
            remove: () => {
                this.eventListeners.get(eventName)?.delete(callback);
                if (this.eventListeners.get(eventName)?.size === 0) {
                    this.eventListeners.delete(eventName);
                }
            },
        };
    }
    // --- Core methods ---
    start(options) {
        this.registerAllNativeListeners();
        native.start(toNativeOptions(options));
    }
    stop() {
        native.stop();
    }
    abort() {
        native.abort();
    }
    // --- Permission methods ---
    requestPermissionsAsync() {
        return native.requestPermissionsAsync();
    }
    getPermissionsAsync() {
        return native.getPermissionsAsync();
    }
    getMicrophonePermissionsAsync() {
        return native.getMicrophonePermissionsAsync();
    }
    requestMicrophonePermissionsAsync() {
        return native.requestMicrophonePermissionsAsync();
    }
    getSpeechRecognizerPermissionsAsync() {
        return native.getSpeechRecognizerPermissionsAsync();
    }
    requestSpeechRecognizerPermissionsAsync() {
        return native.requestSpeechRecognizerPermissionsAsync();
    }
    // --- Query methods ---
    getSupportedLocales(options) {
        return native.getSupportedLocales({
            androidRecognitionServicePackage: options?.androidRecognitionServicePackage ?? undefined,
        });
    }
    getSpeechRecognitionServices() {
        return native.getSpeechRecognitionServices();
    }
    getDefaultRecognitionService() {
        return native.getDefaultRecognitionService();
    }
    getAssistantService() {
        return native.getAssistantService();
    }
    supportsOnDeviceRecognition() {
        return native.supportsOnDeviceRecognition();
    }
    supportsRecording() {
        return native.supportsRecording();
    }
    isRecognitionAvailable() {
        return native.isRecognitionAvailable();
    }
    getStateAsync() {
        return native.getStateAsync();
    }
    // --- Android-specific ---
    androidTriggerOfflineModelDownload(options) {
        return native.androidTriggerOfflineModelDownload(options);
    }
    // --- iOS-specific ---
    setCategoryIOS(options) {
        native.setCategoryIOS({
            category: options.category,
            categoryOptions: options.categoryOptions,
            mode: options.mode ?? undefined,
        });
    }
    getAudioSessionCategoryAndOptionsIOS() {
        return native.getAudioSessionCategoryAndOptionsIOS();
    }
    setAudioSessionActiveIOS(value, options) {
        native.setAudioSessionActiveIOS(value, options?.notifyOthersOnDeactivation ?? true);
    }
}
exports.SpeechRecognitionModule = new SpeechRecognitionModuleImpl();
//# sourceMappingURL=SpeechRecognitionModule.js.map