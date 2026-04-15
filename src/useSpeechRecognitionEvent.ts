import { useEffect, useRef } from "react";
import { SpeechRecognitionModule } from "./SpeechRecognitionModule";
import type { SpeechRecognitionNativeEventMap } from "./SpeechRecognitionModule.types";

/**
 * React hook to listen for native speech recognition events.
 *
 * @param eventName The name of the event to listen to
 * @param listener The listener function to call when the event is emitted
 */
export function useSpeechRecognitionEvent<
  K extends keyof SpeechRecognitionNativeEventMap,
>(
  eventName: K,
  listener: (event: SpeechRecognitionNativeEventMap[K]) => void,
) {
  const listenerRef = useRef(listener);
  listenerRef.current = listener;

  useEffect(() => {
    const subscription = SpeechRecognitionModule.addListener(
      eventName,
      (event) => listenerRef.current(event),
    );
    return () => subscription.remove();
  }, [eventName]);
}
