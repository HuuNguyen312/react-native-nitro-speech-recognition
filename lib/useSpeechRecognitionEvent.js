"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSpeechRecognitionEvent = useSpeechRecognitionEvent;
const react_1 = require("react");
const SpeechRecognitionModule_1 = require("./SpeechRecognitionModule");
/**
 * React hook to listen for native speech recognition events.
 *
 * @param eventName The name of the event to listen to
 * @param listener The listener function to call when the event is emitted
 */
function useSpeechRecognitionEvent(eventName, listener) {
    const listenerRef = (0, react_1.useRef)(listener);
    listenerRef.current = listener;
    (0, react_1.useEffect)(() => {
        const subscription = SpeechRecognitionModule_1.SpeechRecognitionModule.addListener(eventName, (event) => listenerRef.current(event));
        return () => subscription.remove();
    }, [eventName]);
}
//# sourceMappingURL=useSpeechRecognitionEvent.js.map