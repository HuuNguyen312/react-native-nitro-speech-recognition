import type { SpeechRecognitionNativeEventMap, SpeechRecognitionOptions, SpeechRecognitionPermissionResponse, PermissionResponse, SpeechRecognitionState } from "./SpeechRecognitionModule.types";
type Subscription = {
    remove: () => void;
};
declare class SpeechRecognitionModuleWeb {
    private _nativeListeners;
    private _clientListeners;
    private _listeners;
    addListener<K extends keyof SpeechRecognitionNativeEventMap>(eventName: K, listener: (event: SpeechRecognitionNativeEventMap[K]) => void): Subscription;
    start(options: SpeechRecognitionOptions): void;
    stop(): void;
    abort(): void;
    getStateAsync(): Promise<SpeechRecognitionState>;
    requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    requestMicrophonePermissionsAsync(): Promise<PermissionResponse>;
    getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
    getSupportedLocales(): Promise<{
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
    androidTriggerOfflineModelDownload(): Promise<{
        status: string;
        message: string;
    }>;
    setCategoryIOS(): void;
    getAudioSessionCategoryAndOptionsIOS(): {
        category: string;
        categoryOptions: string[];
        mode: string;
    };
    setAudioSessionActiveIOS(): void;
}
export declare const SpeechRecognitionModule: SpeechRecognitionModuleWeb;
export {};
//# sourceMappingURL=SpeechRecognitionModule.web.d.ts.map