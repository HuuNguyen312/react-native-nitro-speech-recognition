// Export the SpeechRecognition APIs
export {
  WebSpeechRecognition,
  WebSpeechGrammar,
  WebSpeechGrammarList,
} from "./WebSpeechRecognition";

// Native module
export { SpeechRecognitionModule } from "./SpeechRecognitionModule";

// Hooks
export { useSpeechRecognitionEvent } from "./useSpeechRecognitionEvent";

// Constants
export {
  AVAudioSessionCategory,
  AVAudioSessionCategoryOptions,
  AVAudioSessionMode,
  RecognizerIntentExtraLanguageModel,
  RecognizerIntentEnableLanguageSwitch,
  AudioEncodingAndroid,
  TaskHintIOS,
  SpeechRecognizerErrorAndroid,
} from "./constants";

export type {
  SpeechRecognitionOptions,
  AndroidIntentOptions,
  SpeechRecognitionNativeEventMap,
  AVAudioSessionCategoryOptionsValue,
  AVAudioSessionModeValue,
  AVAudioSessionCategoryValue,
  AudioEncodingAndroidValue,
  AudioSourceOptions,
  RecordingOptions,
  IOSTaskHintValue,
  SetCategoryOptions,
  SpeechRecognitionErrorCode,
  SpeechRecognitionErrorEvent,
  SpeechRecognitionResultEvent,
  SpeechRecognitionResult,
  SpeechRecognitionResultSegment,
  PermissionResponse,
  SpeechRecognitionPermissionResponse,
  SpeechRecognitionNativeEvents,
  SpeechRecognitionState,
  PermissionStatus,
  LanguageDetectionEvent,
} from "./SpeechRecognitionModule.types";
