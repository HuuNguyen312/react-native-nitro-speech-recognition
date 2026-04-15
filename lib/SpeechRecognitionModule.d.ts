import type { SpeechRecognitionNativeEventMap, SpeechRecognitionOptions, SpeechRecognitionPermissionResponse, PermissionResponse, SpeechRecognitionState, AVAudioSessionCategoryValue, AVAudioSessionCategoryOptionsValue, AVAudioSessionModeValue, SetCategoryOptions } from "./SpeechRecognitionModule.types";
type Subscription = {
    remove: () => void;
};
declare class SpeechRecognitionModuleImpl {
    /**
     * Map of event name -> Set of JS listener functions.
     * When the first listener for an event is added, we register a native callback.
     * The native callback fans out to all JS listeners.
     */
    private eventListeners;
    /**
     * Whether native listeners have been registered for each event type.
     * We register all native listeners at once on first addListener call.
     */
    private nativeListenersRegistered;
    private registerAllNativeListeners;
    private dispatch;
    /**
     * Add a listener for a native speech recognition event.
     * Returns a Subscription object with a `remove()` method.
     */
    addListener<K extends keyof SpeechRecognitionNativeEventMap>(eventName: K, callback: (event: SpeechRecognitionNativeEventMap[K]) => void): Subscription;
    start(options: SpeechRecognitionOptions): void;
    stop(): void;
    abort(): void;
    requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    requestMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getSupportedLocales(options?: {
        androidRecognitionServicePackage?: string;
    }): Promise<{
        locales: string[];
        installedLocales: string[];
    }>;
    getSpeechRecognitionServices(): string[];
    getDefaultRecognitionService(): {
        packageName: string;
    };
    getAssistantService(): {
        packageName: string;
    };
    supportsOnDeviceRecognition(): boolean;
    supportsRecording(): boolean;
    isRecognitionAvailable(): boolean;
    getStateAsync(): Promise<SpeechRecognitionState>;
    androidTriggerOfflineModelDownload(options: {
        locale: string;
    }): Promise<{
        status: string;
        message: string;
    }>;
    setCategoryIOS(options: SetCategoryOptions): void;
    getAudioSessionCategoryAndOptionsIOS(): {
        category: AVAudioSessionCategoryValue;
        categoryOptions: AVAudioSessionCategoryOptionsValue[];
        mode: AVAudioSessionModeValue;
    };
    setAudioSessionActiveIOS(value: boolean, options?: {
        notifyOthersOnDeactivation: boolean;
    }): void;
}
export declare const SpeechRecognitionModule: SpeechRecognitionModuleImpl;
export {};
//# sourceMappingURL=SpeechRecognitionModule.d.ts.map