import type { HybridObject } from "react-native-nitro-modules";

// --- Nested option types ---

export interface VolumeChangeEventOptions {
  enabled: boolean;
  intervalMillis: number;
}

export interface RecordingOptions {
  persist: boolean;
  outputDirectory: string | undefined;
  outputFileName: string | undefined;
  outputSampleRate: number | undefined;
  outputEncoding: string | undefined;
}

export interface AudioSourceOptions {
  uri: string;
  audioChannels: number | undefined;
  audioEncoding: number | undefined;
  sampleRate: number | undefined;
  chunkDelayMillis: number | undefined;
}

export interface SetCategoryOptions {
  category: string;
  categoryOptions: string[];
  mode: string | undefined;
}

export interface GetSupportedLocalesOptions {
  androidRecognitionServicePackage: string | undefined;
}

export interface TriggerOfflineModelDownloadOptions {
  locale: string;
}

// --- Main recognition options ---

export interface SpeechRecognitionOptions {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  contextualStrings: string[] | undefined;
  continuous: boolean;
  requiresOnDeviceRecognition: boolean;
  addsPunctuation: boolean;
  androidRecognitionServicePackage: string | undefined;
  /** JSON-encoded androidIntentOptions (parsed on native side) */
  androidIntentOptionsJson: string | undefined;
  audioSource: AudioSourceOptions | undefined;
  recordingOptions: RecordingOptions | undefined;
  androidIntent: string | undefined;
  iosTaskHint: string | undefined;
  iosCategory: SetCategoryOptions | undefined;
  volumeChangeEventOptions: VolumeChangeEventOptions | undefined;
  iosVoiceProcessingEnabled: boolean;
}

// --- Event payload types ---

export interface SpeechRecognitionResultSegment {
  startTimeMillis: number;
  endTimeMillis: number;
  segment: string;
  confidence: number;
}

export interface SpeechRecognitionResultPayload {
  transcript: string;
  confidence: number;
  segments: SpeechRecognitionResultSegment[];
}

export interface SpeechRecognitionResultEvent {
  isFinal: boolean;
  results: SpeechRecognitionResultPayload[];
}

export interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
  code: number;
}

export interface AudioUriEvent {
  uri: string | undefined;
}

export interface LanguageDetectionEvent {
  detectedLanguage: string;
  confidence: number;
  topLocaleAlternatives: string[];
}

export interface VolumeChangeEvent {
  value: number;
}

// --- Permission response types ---

export interface PermissionResponse {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  expires: string;
}

export interface SpeechRecognitionPermissionResponse {
  status: string;
  granted: boolean;
  canAskAgain: boolean;
  expires: string;
  restricted: boolean;
}

// --- Query result types ---

export interface SupportedLocalesResult {
  locales: string[];
  installedLocales: string[];
}

export interface ServiceResult {
  packageName: string;
}

export interface OfflineModelDownloadResult {
  status: string;
  message: string;
}

export interface AudioSessionInfo {
  category: string;
  categoryOptions: string[];
  mode: string;
}

// --- The main HybridObject ---

export interface SpeechRecognition
  extends HybridObject<{ ios: "swift"; android: "kotlin" }> {
  // Core methods
  start(options: SpeechRecognitionOptions): void;
  stop(): void;
  abort(): void;

  // Permission methods
  requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
  getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
  getMicrophonePermissionsAsync(): Promise<PermissionResponse>;
  requestMicrophonePermissionsAsync(): Promise<PermissionResponse>;
  getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;
  requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse>;

  // Query methods
  getSupportedLocales(
    options: GetSupportedLocalesOptions,
  ): Promise<SupportedLocalesResult>;
  getSpeechRecognitionServices(): string[];
  getDefaultRecognitionService(): ServiceResult;
  getAssistantService(): ServiceResult;
  supportsOnDeviceRecognition(): boolean;
  supportsRecording(): boolean;
  isRecognitionAvailable(): boolean;
  getStateAsync(): Promise<string>;

  // Android-specific
  androidTriggerOfflineModelDownload(
    options: TriggerOfflineModelDownloadOptions,
  ): Promise<OfflineModelDownloadResult>;

  // iOS-specific
  setCategoryIOS(options: SetCategoryOptions): void;
  getAudioSessionCategoryAndOptionsIOS(): AudioSessionInfo;
  setAudioSessionActiveIOS(
    value: boolean,
    notifyOthersOnDeactivation: boolean,
  ): void;

  // Event listener setters - Nitro callback pattern
  // Native holds callback reference and calls it multiple times.
  // JS wrapper manages subscribe/unsubscribe on top of this.
  addResultListener(
    callback: (event: SpeechRecognitionResultEvent) => void,
  ): void;
  addErrorListener(
    callback: (event: SpeechRecognitionErrorEvent) => void,
  ): void;
  addStartListener(callback: () => void): void;
  addEndListener(callback: () => void): void;
  addSpeechStartListener(callback: () => void): void;
  addSpeechEndListener(callback: () => void): void;
  addAudioStartListener(callback: (event: AudioUriEvent) => void): void;
  addAudioEndListener(callback: (event: AudioUriEvent) => void): void;
  addSoundStartListener(callback: () => void): void;
  addSoundEndListener(callback: () => void): void;
  addNoMatchListener(callback: () => void): void;
  addLanguageDetectionListener(
    callback: (event: LanguageDetectionEvent) => void,
  ): void;
  addVolumeChangeListener(callback: (event: VolumeChangeEvent) => void): void;
  removeListeners(): void;
}
