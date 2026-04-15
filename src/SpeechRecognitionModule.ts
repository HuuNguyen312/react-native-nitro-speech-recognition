import { NitroModules } from "react-native-nitro-modules";
import type { SpeechRecognition } from "./specs/SpeechRecognition.nitro";
import type {
  SpeechRecognitionNativeEventMap,
  SpeechRecognitionOptions,
  SpeechRecognitionPermissionResponse,
  PermissionResponse,
  SpeechRecognitionState,
  AVAudioSessionCategoryValue,
  AVAudioSessionCategoryOptionsValue,
  AVAudioSessionModeValue,
  SetCategoryOptions,
} from "./SpeechRecognitionModule.types";

type Subscription = { remove: () => void };

let _native: SpeechRecognition | null = null;
function getNative(): SpeechRecognition {
  if (!_native) {
    _native = NitroModules.createHybridObject<SpeechRecognition>(
      "SpeechRecognition",
    );
  }
  return _native;
}

// Maps event names to their native addXxxListener method names
const eventToNativeMethod: Record<
  keyof SpeechRecognitionNativeEventMap,
  keyof SpeechRecognition
> = {
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
function toNativeOptions(
  options: SpeechRecognitionOptions,
): Parameters<SpeechRecognition["start"]>[0] {
  return {
    lang: options.lang ?? "en-US",
    interimResults: options.interimResults ?? false,
    maxAlternatives: options.maxAlternatives ?? 5,
    contextualStrings: options.contextualStrings ?? undefined,
    continuous: options.continuous ?? false,
    requiresOnDeviceRecognition: options.requiresOnDeviceRecognition ?? false,
    addsPunctuation: options.addsPunctuation ?? false,
    androidRecognitionServicePackage:
      options.androidRecognitionServicePackage ?? undefined,
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
          outputSampleRate:
            options.recordingOptions.outputSampleRate ?? undefined,
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
          intervalMillis:
            options.volumeChangeEventOptions.intervalMillis ?? 100,
        }
      : undefined,
    iosVoiceProcessingEnabled: options.iosVoiceProcessingEnabled ?? false,
  };
}

class SpeechRecognitionModuleImpl {
  /**
   * Map of event name -> Set of JS listener functions.
   * When the first listener for an event is added, we register a native callback.
   * The native callback fans out to all JS listeners.
   */
  private eventListeners = new Map<
    string,
    Set<(event: any) => void>
  >();

  /**
   * Whether native listeners have been registered for each event type.
   * We register all native listeners at once on first addListener call.
   */
  private nativeListenersRegistered = false;

  private registerAllNativeListeners(): void {
    if (this.nativeListenersRegistered) return;
    this.nativeListenersRegistered = true;

    // Register native callbacks for all event types.
    // Each callback fans out to all registered JS listeners for that event.
    const n = getNative();
    n.addResultListener((event) => {
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

    n.addErrorListener((event) => {
      this.dispatch("error", {
        error: event.error as any,
        message: event.message,
        code: event.code !== -1 ? event.code : undefined,
      });
    });

    n.addStartListener(() => this.dispatch("start", null));
    n.addEndListener(() => this.dispatch("end", null));
    n.addSpeechStartListener(() => this.dispatch("speechstart", null));
    n.addSpeechEndListener(() => this.dispatch("speechend", null));

    n.addAudioStartListener((event) => {
      this.dispatch("audiostart", { uri: event.uri ?? null });
    });
    n.addAudioEndListener((event) => {
      this.dispatch("audioend", { uri: event.uri ?? null });
    });

    n.addSoundStartListener(() => this.dispatch("soundstart", null));
    n.addSoundEndListener(() => this.dispatch("soundend", null));
    n.addNoMatchListener(() => this.dispatch("nomatch", null));

    n.addLanguageDetectionListener((event) => {
      this.dispatch("languagedetection", {
        detectedLanguage: event.detectedLanguage,
        confidence: event.confidence,
        topLocaleAlternatives: [...event.topLocaleAlternatives],
      });
    });

    n.addVolumeChangeListener((event) => {
      this.dispatch("volumechange", { value: event.value });
    });
  }

  private dispatch<K extends keyof SpeechRecognitionNativeEventMap>(
    eventName: K,
    event: SpeechRecognitionNativeEventMap[K],
  ): void {
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
  addListener<K extends keyof SpeechRecognitionNativeEventMap>(
    eventName: K,
    callback: (event: SpeechRecognitionNativeEventMap[K]) => void,
  ): Subscription {
    this.registerAllNativeListeners();

    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }
    this.eventListeners.get(eventName)!.add(callback);

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

  start(options: SpeechRecognitionOptions): void {
    this.registerAllNativeListeners();
    getNative().start(toNativeOptions(options));
  }

  stop(): void {
    getNative().stop();
  }

  abort(): void {
    getNative().abort();
  }

  // --- Permission methods ---

  requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return getNative().requestPermissionsAsync() as any;
  }

  getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return getNative().getPermissionsAsync() as any;
  }

  getMicrophonePermissionsAsync(): Promise<PermissionResponse> {
    return getNative().getMicrophonePermissionsAsync() as any;
  }

  requestMicrophonePermissionsAsync(): Promise<PermissionResponse> {
    return getNative().requestMicrophonePermissionsAsync() as any;
  }

  getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return getNative().getSpeechRecognizerPermissionsAsync() as any;
  }

  requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return getNative().requestSpeechRecognizerPermissionsAsync() as any;
  }

  // --- Query methods ---

  getSupportedLocales(options?: {
    androidRecognitionServicePackage?: string;
  }): Promise<{ locales: string[]; installedLocales: string[] }> {
    return getNative().getSupportedLocales({
      androidRecognitionServicePackage:
        options?.androidRecognitionServicePackage ?? undefined,
    }) as any;
  }

  getSpeechRecognitionServices(): string[] {
    return getNative().getSpeechRecognitionServices();
  }

  getDefaultRecognitionService(): { packageName: string } {
    return getNative().getDefaultRecognitionService();
  }

  getAssistantService(): { packageName: string } {
    return getNative().getAssistantService();
  }

  supportsOnDeviceRecognition(): boolean {
    return getNative().supportsOnDeviceRecognition();
  }

  supportsRecording(): boolean {
    return getNative().supportsRecording();
  }

  isRecognitionAvailable(): boolean {
    return getNative().isRecognitionAvailable();
  }

  getStateAsync(): Promise<SpeechRecognitionState> {
    return getNative().getStateAsync() as any;
  }

  // --- Android-specific ---

  androidTriggerOfflineModelDownload(options: {
    locale: string;
  }): Promise<{ status: string; message: string }> {
    return getNative().androidTriggerOfflineModelDownload(options) as any;
  }

  // --- iOS-specific ---

  setCategoryIOS(options: SetCategoryOptions): void {
    getNative().setCategoryIOS({
      category: options.category,
      categoryOptions: options.categoryOptions,
      mode: options.mode ?? undefined,
    });
  }

  getAudioSessionCategoryAndOptionsIOS(): {
    category: AVAudioSessionCategoryValue;
    categoryOptions: AVAudioSessionCategoryOptionsValue[];
    mode: AVAudioSessionModeValue;
  } {
    return getNative().getAudioSessionCategoryAndOptionsIOS() as any;
  }

  setAudioSessionActiveIOS(
    value: boolean,
    options?: { notifyOthersOnDeactivation: boolean },
  ): void {
    getNative().setAudioSessionActiveIOS(
      value,
      options?.notifyOthersOnDeactivation ?? true,
    );
  }
}

export const SpeechRecognitionModule = new SpeechRecognitionModuleImpl();
