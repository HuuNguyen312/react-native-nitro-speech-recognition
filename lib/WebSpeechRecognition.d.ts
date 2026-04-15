import type { SpeechRecognitionOptions } from "./SpeechRecognitionModule.types";
type SpeechListener<K extends keyof SpeechRecognitionEventMap> = (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any;
/** A compatibility wrapper that implements the web SpeechRecognition API for React Native. */
export declare class WebSpeechRecognition implements SpeechRecognition {
    #private;
    lang: string;
    grammars: SpeechGrammarList;
    maxAlternatives: number;
    continuous: boolean;
    get interimResults(): boolean;
    set interimResults(interimResults: boolean);
    contextualStrings?: string[];
    requiresOnDeviceRecognition: boolean;
    addsPunctuation: boolean;
    androidIntentOptions: SpeechRecognitionOptions["androidIntentOptions"];
    audioSource?: SpeechRecognitionOptions["audioSource"];
    recordingOptions?: SpeechRecognitionOptions["recordingOptions"];
    androidIntent?: SpeechRecognitionOptions["androidIntent"];
    iosTaskHint?: SpeechRecognitionOptions["iosTaskHint"];
    iosCategory?: SpeechRecognitionOptions["iosCategory"];
    androidRecognitionServicePackage: SpeechRecognitionOptions["androidRecognitionServicePackage"];
    start(): void;
    stop(): void;
    abort(): void;
    set onstart(listener: SpeechListener<"start"> | null);
    get onstart(): SpeechListener<"start"> | null;
    set onend(listener: SpeechListener<"end"> | null);
    get onend(): SpeechListener<"end"> | null;
    set onerror(listener: SpeechListener<"error"> | null);
    get onerror(): SpeechListener<"error"> | null;
    _setListeners<K extends keyof SpeechRecognitionEventMap>(key: K, listenerFn: SpeechListener<K> | null, existingListener: SpeechListener<K> | null): void;
    set onresult(listener: SpeechListener<"result"> | null);
    get onresult(): SpeechListener<"result"> | null;
    set onnomatch(listener: SpeechListener<"nomatch"> | null);
    get onnomatch(): SpeechListener<"nomatch"> | null;
    set onspeechstart(listener: SpeechListener<"speechstart"> | null);
    get onspeechstart(): SpeechListener<"speechstart"> | null;
    set onspeechend(listener: SpeechListener<"speechend"> | null);
    get onspeechend(): SpeechListener<"speechend"> | null;
    set onaudiostart(listener: SpeechListener<"audiostart"> | null);
    get onaudiostart(): SpeechListener<"audiostart"> | null;
    set onaudioend(listener: SpeechListener<"audioend"> | null);
    get onaudioend(): SpeechListener<"audioend"> | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    addEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: SpeechListener<K>, options?: boolean | AddEventListenerOptions): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(type: K, listener: (this: SpeechRecognition, ev: SpeechRecognitionEventMap[K]) => any, options?: boolean | EventListenerOptions | undefined): void;
    dispatchEvent(event: Event): boolean;
}
export declare class WebSpeechGrammarList implements SpeechGrammarList {
    #private;
    get length(): number;
    [index: number]: SpeechGrammar;
    addFromURI(src: string, weight?: number | undefined): void;
    item(index: number): WebSpeechGrammar;
    addFromString: (grammar: string, weight?: number) => void;
}
export declare class WebSpeechGrammar implements SpeechGrammar {
    src: string;
    weight: number;
    constructor(src: string, weight?: number);
}
export {};
//# sourceMappingURL=WebSpeechRecognition.d.ts.map