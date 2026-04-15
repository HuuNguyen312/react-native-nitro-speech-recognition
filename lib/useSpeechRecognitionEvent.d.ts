import type { SpeechRecognitionNativeEventMap } from "./SpeechRecognitionModule.types";
/**
 * React hook to listen for native speech recognition events.
 *
 * @param eventName The name of the event to listen to
 * @param listener The listener function to call when the event is emitted
 */
export declare function useSpeechRecognitionEvent<K extends keyof SpeechRecognitionNativeEventMap>(eventName: K, listener: (event: SpeechRecognitionNativeEventMap[K]) => void): void;
//# sourceMappingURL=useSpeechRecognitionEvent.d.ts.map