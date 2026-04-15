import { SpeechRecognitionModule } from "./SpeechRecognitionModule";
import type {
  SpeechRecognitionNativeEventMap,
  SpeechRecognitionOptions,
} from "./SpeechRecognitionModule.types";

type Subscription = { remove: () => void };

const noop = () => {};

const createEventData = (target: EventTarget) =>
  ({
    AT_TARGET: 2 as const,
    bubbles: false,
    BUBBLING_PHASE: 3 as const,
    cancelable: false,
    CAPTURING_PHASE: 1 as const,
    composed: false,
    composedPath: () => [],
    currentTarget: target,
    defaultPrevented: false,
    eventPhase: 0 as const,
    isTrusted: true,
    NONE: 0 as const,
    preventDefault: noop,
    resultIndex: 0,
    stopImmediatePropagation: noop,
    stopPropagation: noop,
    target,
    timeStamp: 0,
    type: "",
    cancelBubble: false,
    returnValue: false,
    srcElement: null,
    initEvent: noop,
  }) as unknown as Event & { resultIndex: number };

type NativeEventAndListener<
  TEventName extends keyof SpeechRecognitionNativeEventMap,
> = {
  eventName: TEventName;
  nativeListener: (
    nativeEvent: SpeechRecognitionNativeEventMap[TEventName],
  ) => void;
};

function stubEvent<K extends keyof SpeechRecognitionEventMap>(
  eventName: K,
  instance: WebSpeechRecognition,
  listener: (this: SpeechRecognition, ev: Event) => unknown,
): NativeEventAndListener<K> {
  return {
    eventName,
    nativeListener: () => listener.call(instance, createEventData(instance)),
  };
}

const WebListenerTransformers: {
  [K in keyof SpeechRecognitionEventMap]?: (
    instance: WebSpeechRecognition,
    listener: (
      this: SpeechRecognition,
      ev: SpeechRecognitionEventMap[K],
    ) => unknown,
  ) => NativeEventAndListener<K>;
} = {
  audiostart: (instance, listener) => ({
    eventName: "audiostart",
    nativeListener(nativeEvent) {
      listener.call(instance, {
        ...createEventData(instance),
        uri: nativeEvent.uri,
      });
    },
  }),
  audioend: (instance, listener) => ({
    eventName: "audioend",
    nativeListener(nativeEvent) {
      listener.call(instance, {
        ...createEventData(instance),
        uri: nativeEvent.uri,
      });
    },
  }),
  nomatch: (instance, listener) =>
    // @ts-ignore
    stubEvent("nomatch", instance, listener),
  end: (instance, listener) => stubEvent("end", instance, listener),
  start: (instance, listener) => ({
    eventName: "start",
    nativeListener() {
      listener.call(instance, createEventData(instance));
    },
  }),
  error: (instance, listener) => ({
    eventName: "error",
    nativeListener: (
      nativeEvent: SpeechRecognitionNativeEventMap["error"],
    ) => {
      const clientEvent: SpeechRecognitionEventMap["error"] = {
        ...createEventData(instance),
        error: nativeEvent.error as SpeechRecognitionErrorCode,
        message: nativeEvent.message,
      };
      listener.call(instance, clientEvent);
    },
  }),
  result: (instance, listener) => ({
    eventName: "result",
    nativeListener: (
      nativeEvent: SpeechRecognitionNativeEventMap["result"],
    ) => {
      if (!instance.interimResults && !nativeEvent.isFinal) {
        return;
      }
      const alternatives = nativeEvent.results.map(
        (result) =>
          new WebSpeechRecognitionAlternative(
            result.confidence,
            result.transcript,
          ),
      );
      const clientEvent: SpeechRecognitionEventMap["result"] = {
        ...createEventData(instance),
        results: new WebSpeechRecognitionResultList([
          new WebSpeechRecognitionResult(nativeEvent.isFinal, alternatives),
        ]),
      };
      listener.call(instance, clientEvent);
    },
  }),
};

type SpeechListener<K extends keyof SpeechRecognitionEventMap> = (
  this: SpeechRecognition,
  ev: SpeechRecognitionEventMap[K],
) => any;

/** A compatibility wrapper that implements the web SpeechRecognition API for React Native. */
export class WebSpeechRecognition implements SpeechRecognition {
  lang = "en-US";
  grammars: SpeechGrammarList = new WebSpeechGrammarList();
  maxAlternatives = 1;
  continuous = false;

  #interimResults = false;

  get interimResults(): boolean {
    return this.#interimResults;
  }

  set interimResults(interimResults: boolean) {
    this.#interimResults = interimResults;
  }

  // Extended properties
  contextualStrings?: string[] = undefined;
  requiresOnDeviceRecognition = false;
  addsPunctuation = false;
  androidIntentOptions: SpeechRecognitionOptions["androidIntentOptions"];
  audioSource?: SpeechRecognitionOptions["audioSource"];
  recordingOptions?: SpeechRecognitionOptions["recordingOptions"];
  androidIntent?: SpeechRecognitionOptions["androidIntent"] = undefined;
  iosTaskHint?: SpeechRecognitionOptions["iosTaskHint"] = undefined;
  iosCategory?: SpeechRecognitionOptions["iosCategory"] = undefined;
  androidRecognitionServicePackage: SpeechRecognitionOptions["androidRecognitionServicePackage"];

  #subscriptionMap: Map<SpeechListener<any>, Subscription[]> = new Map();

  start() {
    SpeechRecognitionModule.requestPermissionsAsync().then(() => {
      SpeechRecognitionModule.start({
        lang: this.lang,
        interimResults: this.interimResults,
        maxAlternatives: this.maxAlternatives,
        contextualStrings: this.contextualStrings,
        requiresOnDeviceRecognition: this.requiresOnDeviceRecognition,
        addsPunctuation: this.addsPunctuation,
        continuous: this.continuous,
        recordingOptions: this.recordingOptions,
        androidIntentOptions: this.androidIntentOptions,
        androidRecognitionServicePackage:
          this.androidRecognitionServicePackage,
        audioSource: this.audioSource,
        androidIntent: this.androidIntent,
        iosTaskHint: this.iosTaskHint,
        iosCategory: this.iosCategory,
      });
    });
  }

  stop() {
    SpeechRecognitionModule.stop();
  }

  abort() {
    SpeechRecognitionModule.abort();
  }

  #onstart: SpeechListener<"start"> | null = null;
  set onstart(listener: SpeechListener<"start"> | null) {
    this._setListeners("start", listener, this.#onstart);
    this.#onstart = listener;
  }
  get onstart() {
    return this.#onstart;
  }

  #onend: SpeechListener<"end"> | null = null;
  set onend(listener: SpeechListener<"end"> | null) {
    this._setListeners(
      "end",
      (ev) => {
        listener?.call(this, ev);
      },
      this.#onend,
    );
    this.#onend = listener;
  }
  get onend() {
    return this.#onend;
  }

  #onerror: SpeechListener<"error"> | null = null;
  set onerror(listener: SpeechListener<"error"> | null) {
    this._setListeners("error", listener, this.#onerror);
    this.#onerror = listener;
  }
  get onerror() {
    return this.#onerror;
  }

  _setListeners<K extends keyof SpeechRecognitionEventMap>(
    key: K,
    listenerFn: SpeechListener<K> | null,
    existingListener: SpeechListener<K> | null,
  ) {
    if (existingListener) {
      this.removeEventListener(key, existingListener);
    }
    if (listenerFn) {
      this.addEventListener(key, listenerFn);
    }
  }

  #onresult: SpeechListener<"result"> | null = null;
  set onresult(listener: SpeechListener<"result"> | null) {
    this._setListeners("result", listener, this.#onresult);
    this.#onresult = listener;
  }
  get onresult() {
    return this.#onresult;
  }

  #onnomatch: SpeechListener<"nomatch"> | null = null;
  set onnomatch(listener: SpeechListener<"nomatch"> | null) {
    this._setListeners("nomatch", listener, this.#onnomatch);
    this.#onnomatch = listener;
  }
  get onnomatch() {
    return this.#onnomatch;
  }

  #onspeechstart: SpeechListener<"speechstart"> | null = null;
  set onspeechstart(listener: SpeechListener<"speechstart"> | null) {
    this._setListeners("speechstart", listener, this.#onspeechstart);
    this.#onspeechstart = listener;
  }
  get onspeechstart() {
    return this.#onspeechstart;
  }

  #onspeechend: SpeechListener<"speechend"> | null = null;
  set onspeechend(listener: SpeechListener<"speechend"> | null) {
    this._setListeners("speechend", listener, this.#onspeechend);
    this.#onspeechend = listener;
  }
  get onspeechend() {
    return this.#onspeechend;
  }

  #onaudiostart: SpeechListener<"audiostart"> | null = null;
  set onaudiostart(listener: SpeechListener<"audiostart"> | null) {
    this._setListeners("audiostart", listener, this.#onaudiostart);
    this.#onaudiostart = listener;
  }
  get onaudiostart() {
    return this.#onaudiostart;
  }

  #onaudioend: SpeechListener<"audioend"> | null = null;
  set onaudioend(listener: SpeechListener<"audioend"> | null) {
    this._setListeners("audioend", listener, this.#onaudioend);
    this.#onaudioend = listener;
  }
  get onaudioend() {
    return this.#onaudioend;
  }

  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null = null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null = null;

  addEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: SpeechListener<K>,
    options?: boolean | AddEventListenerOptions,
  ): void {
    const once = typeof options === "object" && options.once;

    const wrappedListener = once
      ? (((ev) => {
          listener.call(this, ev);
          for (const sub of this.#subscriptionMap.get(listener) ?? []) {
            sub.remove();
          }
          this.#subscriptionMap.delete(listener);
        }) as SpeechListener<K>)
      : listener;

    const enhancedEvent: NativeEventAndListener<K> =
      WebListenerTransformers[type]?.(this, wrappedListener) ??
      stubEvent(
        type,
        this,
        wrappedListener as (this: SpeechRecognition, ev: Event) => unknown,
      );

    const subscription = SpeechRecognitionModule.addListener(
      enhancedEvent.eventName,
      enhancedEvent.nativeListener as any,
    );

    this.#subscriptionMap.set(listener, [subscription]);
  }

  removeEventListener<K extends keyof SpeechRecognitionEventMap>(
    type: K,
    listener: (
      this: SpeechRecognition,
      ev: SpeechRecognitionEventMap[K],
    ) => any,
    options?: boolean | EventListenerOptions | undefined,
  ): void {
    const subscriptions = this.#subscriptionMap.get(listener);
    if (subscriptions) {
      for (const subscription of subscriptions) {
        subscription.remove();
      }
      this.#subscriptionMap.delete(listener);
    }
  }

  dispatchEvent(event: Event): boolean {
    throw new Error("Method not implemented.");
  }
}

export class WebSpeechGrammarList implements SpeechGrammarList {
  get length() {
    return this.#grammars.length;
  }
  #grammars: WebSpeechGrammar[] = [];
  [index: number]: SpeechGrammar;

  addFromURI(src: string, weight?: number | undefined): void {
    // not implemented
  }

  item(index: number): WebSpeechGrammar {
    return this.#grammars[index];
  }

  addFromString = (grammar: string, weight?: number) => {
    this.#grammars.push(new WebSpeechGrammar(grammar, weight));
    this[this.length - 1] = this.#grammars[this.length - 1];
  };
}

export class WebSpeechGrammar implements SpeechGrammar {
  src = "";
  weight = 1;

  constructor(src: string, weight?: number) {
    this.src = src;
    this.weight = weight ?? 1;
  }
}

class WebSpeechRecognitionResultList implements SpeechRecognitionResultList {
  #results: WebSpeechRecognitionResult[] = [];

  [Symbol.iterator](): ArrayIterator<WebSpeechRecognitionResult> {
    return this.#results[
      Symbol.iterator
    ]() as ArrayIterator<WebSpeechRecognitionResult>;
  }
  length: number;
  item(index: number): SpeechRecognitionResult {
    return this.#results[index];
  }
  [index: number]: SpeechRecognitionResult;

  constructor(results: WebSpeechRecognitionResult[]) {
    this.#results = results;
    this.length = results.length;
    for (let i = 0; i < this.#results.length; i++) {
      this[i] = this.#results[i];
    }
  }
}

class WebSpeechRecognitionResult implements SpeechRecognitionResult {
  #alternatives: WebSpeechRecognitionAlternative[] = [];
  readonly isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative {
    return this.#alternatives[index];
  }
  [index: number]: SpeechRecognitionAlternative;
  [Symbol.iterator](): ArrayIterator<SpeechRecognitionAlternative> {
    return this.#alternatives[
      Symbol.iterator
    ]() as ArrayIterator<SpeechRecognitionAlternative>;
  }

  constructor(
    isFinal: boolean,
    alternatives: WebSpeechRecognitionAlternative[],
  ) {
    this.isFinal = isFinal;
    this.length = alternatives.length;
    this.#alternatives = alternatives;
    for (let i = 0; i < alternatives.length; i++) {
      this[i] = alternatives[i];
    }
  }
}

class WebSpeechRecognitionAlternative implements SpeechRecognitionAlternative {
  confidence: number;
  transcript: string;

  constructor(confidence: number, transcript: string) {
    this.confidence = confidence;
    this.transcript = transcript;
  }
}
