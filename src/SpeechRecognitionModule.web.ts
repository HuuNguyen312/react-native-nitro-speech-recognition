import type {
  SpeechRecognitionNativeEventMap,
  SpeechRecognitionNativeEvents,
  SpeechRecognitionOptions,
  SpeechRecognitionResultSegment,
  SpeechRecognitionPermissionResponse,
  PermissionResponse,
  SpeechRecognitionState,
  SetCategoryOptions,
  AVAudioSessionCategoryValue,
  AVAudioSessionCategoryOptionsValue,
  AVAudioSessionModeValue,
} from "./SpeechRecognitionModule.types";

type Subscription = { remove: () => void };

let _speechRecognitionRef: globalThis.SpeechRecognition | null = null;

type NativeEventListener = (
  event: SpeechRecognitionEventMap[keyof SpeechRecognitionEventMap],
) => void;

const webToNativeEventMap: {
  [K in keyof SpeechRecognitionEventMap]: (
    ev: SpeechRecognitionEventMap[K],
  ) => SpeechRecognitionNativeEventMap[K];
} = {
  audioend: () => ({ uri: null }),
  audiostart: () => ({ uri: null }),
  end: () => null,
  error: (ev) => ({ error: ev.error, message: ev.message }),
  nomatch: () => null,
  result: (ev): SpeechRecognitionNativeEventMap["result"] => {
    const isFinal = Boolean(ev.results[ev.resultIndex]?.isFinal);

    if (isFinal) {
      const results: SpeechRecognitionNativeEventMap["result"]["results"] = [];
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
    const segments: SpeechRecognitionResultSegment[] = [];

    for (let i = ev.resultIndex; i < ev.results.length; i++) {
      const resultList = ev.results[i];
      for (let j = 0; j < resultList.length; j++) {
        const result = resultList[j];
        if (!result) continue;
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
          confidence:
            segments.reduce((acc, curr) => acc + curr.confidence, 0) /
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
  private _nativeListeners: Map<string, Set<NativeEventListener>> = new Map();
  private _clientListeners: Map<
    (event: any) => void,
    NativeEventListener
  > = new Map();
  private _listeners: Map<string, Set<(event: any) => void>> = new Map();

  addListener<K extends keyof SpeechRecognitionNativeEventMap>(
    eventName: K,
    listener: (event: SpeechRecognitionNativeEventMap[K]) => void,
  ): Subscription {
    // @ts-expect-error
    const nativeListener = (ev: SpeechRecognitionEventMap[K]) => {
      const handler =
        eventName in webToNativeEventMap
          ? webToNativeEventMap[eventName as keyof SpeechRecognitionEventMap]
          : null;
      // @ts-expect-error
      const eventPayload = handler?.(ev);
      // @ts-expect-error
      listener(eventPayload);
    };

    // @ts-expect-error
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
    this._listeners.get(eventName)!.add(listener);

    return {
      remove: () => {
        // @ts-expect-error
        this._nativeListeners.get(eventName)?.delete(nativeListener);
        this._clientListeners.delete(listener);
        this._listeners.get(eventName)?.delete(listener);
      },
    };
  }

  start(options: SpeechRecognitionOptions) {
    const SpeechRecognitionClass =
      typeof webkitSpeechRecognition !== "undefined"
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

  getStateAsync(): Promise<SpeechRecognitionState> {
    console.warn(
      "getStateAsync is not supported on web. Returning 'inactive'.",
    );
    return Promise.resolve("inactive");
  }

  requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    console.warn(
      "requestPermissionsAsync is not supported on web. Returning a granted permission response.",
    );
    return Promise.resolve({
      granted: true,
      canAskAgain: false,
      expires: "never",
      status: "granted",
    } as SpeechRecognitionPermissionResponse);
  }

  getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return this.requestPermissionsAsync();
  }

  getMicrophonePermissionsAsync(): Promise<PermissionResponse> {
    return this.requestPermissionsAsync();
  }

  requestMicrophonePermissionsAsync(): Promise<PermissionResponse> {
    return this.requestPermissionsAsync();
  }

  getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return this.requestPermissionsAsync();
  }

  requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
    return this.requestPermissionsAsync();
  }

  async getSupportedLocales() {
    console.warn(
      "getSupportedLocales is not supported on web. Returning an empty array.",
    );
    return { locales: [] as string[], installedLocales: [] as string[] };
  }

  getSpeechRecognitionServices() {
    return [] as string[];
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
    return (
      typeof webkitSpeechRecognition !== "undefined" ||
      typeof globalThis.SpeechRecognition !== "undefined"
    );
  }

  androidTriggerOfflineModelDownload() {
    console.warn(
      "androidTriggerOfflineModelDownload is not supported on web.",
    );
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

export const SpeechRecognitionModule = new SpeechRecognitionModuleWeb();
