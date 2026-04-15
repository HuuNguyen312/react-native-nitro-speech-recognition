"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _WebSpeechRecognition_interimResults, _WebSpeechRecognition_subscriptionMap, _WebSpeechRecognition_onstart, _WebSpeechRecognition_onend, _WebSpeechRecognition_onerror, _WebSpeechRecognition_onresult, _WebSpeechRecognition_onnomatch, _WebSpeechRecognition_onspeechstart, _WebSpeechRecognition_onspeechend, _WebSpeechRecognition_onaudiostart, _WebSpeechRecognition_onaudioend, _WebSpeechGrammarList_grammars, _WebSpeechRecognitionResultList_results, _WebSpeechRecognitionResult_alternatives;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSpeechGrammar = exports.WebSpeechGrammarList = exports.WebSpeechRecognition = void 0;
const SpeechRecognitionModule_1 = require("./SpeechRecognitionModule");
const noop = () => { };
const createEventData = (target) => ({
    AT_TARGET: 2,
    bubbles: false,
    BUBBLING_PHASE: 3,
    cancelable: false,
    CAPTURING_PHASE: 1,
    composed: false,
    composedPath: () => [],
    currentTarget: target,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: true,
    NONE: 0,
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
});
function stubEvent(eventName, instance, listener) {
    return {
        eventName,
        nativeListener: () => listener.call(instance, createEventData(instance)),
    };
}
const WebListenerTransformers = {
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
        nativeListener: (nativeEvent) => {
            const clientEvent = {
                ...createEventData(instance),
                error: nativeEvent.error,
                message: nativeEvent.message,
            };
            listener.call(instance, clientEvent);
        },
    }),
    result: (instance, listener) => ({
        eventName: "result",
        nativeListener: (nativeEvent) => {
            if (!instance.interimResults && !nativeEvent.isFinal) {
                return;
            }
            const alternatives = nativeEvent.results.map((result) => new WebSpeechRecognitionAlternative(result.confidence, result.transcript));
            const clientEvent = {
                ...createEventData(instance),
                results: new WebSpeechRecognitionResultList([
                    new WebSpeechRecognitionResult(nativeEvent.isFinal, alternatives),
                ]),
            };
            listener.call(instance, clientEvent);
        },
    }),
};
/** A compatibility wrapper that implements the web SpeechRecognition API for React Native. */
class WebSpeechRecognition {
    constructor() {
        this.lang = "en-US";
        this.grammars = new WebSpeechGrammarList();
        this.maxAlternatives = 1;
        this.continuous = false;
        _WebSpeechRecognition_interimResults.set(this, false);
        // Extended properties
        this.contextualStrings = undefined;
        this.requiresOnDeviceRecognition = false;
        this.addsPunctuation = false;
        this.androidIntent = undefined;
        this.iosTaskHint = undefined;
        this.iosCategory = undefined;
        _WebSpeechRecognition_subscriptionMap.set(this, new Map());
        _WebSpeechRecognition_onstart.set(this, null);
        _WebSpeechRecognition_onend.set(this, null);
        _WebSpeechRecognition_onerror.set(this, null);
        _WebSpeechRecognition_onresult.set(this, null);
        _WebSpeechRecognition_onnomatch.set(this, null);
        _WebSpeechRecognition_onspeechstart.set(this, null);
        _WebSpeechRecognition_onspeechend.set(this, null);
        _WebSpeechRecognition_onaudiostart.set(this, null);
        _WebSpeechRecognition_onaudioend.set(this, null);
        this.onsoundend = null;
        this.onsoundstart = null;
    }
    get interimResults() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_interimResults, "f");
    }
    set interimResults(interimResults) {
        __classPrivateFieldSet(this, _WebSpeechRecognition_interimResults, interimResults, "f");
    }
    start() {
        SpeechRecognitionModule_1.SpeechRecognitionModule.requestPermissionsAsync().then(() => {
            SpeechRecognitionModule_1.SpeechRecognitionModule.start({
                lang: this.lang,
                interimResults: this.interimResults,
                maxAlternatives: this.maxAlternatives,
                contextualStrings: this.contextualStrings,
                requiresOnDeviceRecognition: this.requiresOnDeviceRecognition,
                addsPunctuation: this.addsPunctuation,
                continuous: this.continuous,
                recordingOptions: this.recordingOptions,
                androidIntentOptions: this.androidIntentOptions,
                androidRecognitionServicePackage: this.androidRecognitionServicePackage,
                audioSource: this.audioSource,
                androidIntent: this.androidIntent,
                iosTaskHint: this.iosTaskHint,
                iosCategory: this.iosCategory,
            });
        });
    }
    stop() {
        SpeechRecognitionModule_1.SpeechRecognitionModule.stop();
    }
    abort() {
        SpeechRecognitionModule_1.SpeechRecognitionModule.abort();
    }
    set onstart(listener) {
        this._setListeners("start", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onstart, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onstart, listener, "f");
    }
    get onstart() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onstart, "f");
    }
    set onend(listener) {
        this._setListeners("end", (ev) => {
            listener?.call(this, ev);
        }, __classPrivateFieldGet(this, _WebSpeechRecognition_onend, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onend, listener, "f");
    }
    get onend() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onend, "f");
    }
    set onerror(listener) {
        this._setListeners("error", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onerror, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onerror, listener, "f");
    }
    get onerror() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onerror, "f");
    }
    _setListeners(key, listenerFn, existingListener) {
        if (existingListener) {
            this.removeEventListener(key, existingListener);
        }
        if (listenerFn) {
            this.addEventListener(key, listenerFn);
        }
    }
    set onresult(listener) {
        this._setListeners("result", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onresult, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onresult, listener, "f");
    }
    get onresult() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onresult, "f");
    }
    set onnomatch(listener) {
        this._setListeners("nomatch", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onnomatch, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onnomatch, listener, "f");
    }
    get onnomatch() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onnomatch, "f");
    }
    set onspeechstart(listener) {
        this._setListeners("speechstart", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onspeechstart, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onspeechstart, listener, "f");
    }
    get onspeechstart() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onspeechstart, "f");
    }
    set onspeechend(listener) {
        this._setListeners("speechend", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onspeechend, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onspeechend, listener, "f");
    }
    get onspeechend() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onspeechend, "f");
    }
    set onaudiostart(listener) {
        this._setListeners("audiostart", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onaudiostart, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onaudiostart, listener, "f");
    }
    get onaudiostart() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onaudiostart, "f");
    }
    set onaudioend(listener) {
        this._setListeners("audioend", listener, __classPrivateFieldGet(this, _WebSpeechRecognition_onaudioend, "f"));
        __classPrivateFieldSet(this, _WebSpeechRecognition_onaudioend, listener, "f");
    }
    get onaudioend() {
        return __classPrivateFieldGet(this, _WebSpeechRecognition_onaudioend, "f");
    }
    addEventListener(type, listener, options) {
        const once = typeof options === "object" && options.once;
        const wrappedListener = once
            ? ((ev) => {
                listener.call(this, ev);
                for (const sub of __classPrivateFieldGet(this, _WebSpeechRecognition_subscriptionMap, "f").get(listener) ?? []) {
                    sub.remove();
                }
                __classPrivateFieldGet(this, _WebSpeechRecognition_subscriptionMap, "f").delete(listener);
            })
            : listener;
        const enhancedEvent = WebListenerTransformers[type]?.(this, wrappedListener) ??
            stubEvent(type, this, wrappedListener);
        const subscription = SpeechRecognitionModule_1.SpeechRecognitionModule.addListener(enhancedEvent.eventName, enhancedEvent.nativeListener);
        __classPrivateFieldGet(this, _WebSpeechRecognition_subscriptionMap, "f").set(listener, [subscription]);
    }
    removeEventListener(type, listener, options) {
        const subscriptions = __classPrivateFieldGet(this, _WebSpeechRecognition_subscriptionMap, "f").get(listener);
        if (subscriptions) {
            for (const subscription of subscriptions) {
                subscription.remove();
            }
            __classPrivateFieldGet(this, _WebSpeechRecognition_subscriptionMap, "f").delete(listener);
        }
    }
    dispatchEvent(event) {
        throw new Error("Method not implemented.");
    }
}
exports.WebSpeechRecognition = WebSpeechRecognition;
_WebSpeechRecognition_interimResults = new WeakMap(), _WebSpeechRecognition_subscriptionMap = new WeakMap(), _WebSpeechRecognition_onstart = new WeakMap(), _WebSpeechRecognition_onend = new WeakMap(), _WebSpeechRecognition_onerror = new WeakMap(), _WebSpeechRecognition_onresult = new WeakMap(), _WebSpeechRecognition_onnomatch = new WeakMap(), _WebSpeechRecognition_onspeechstart = new WeakMap(), _WebSpeechRecognition_onspeechend = new WeakMap(), _WebSpeechRecognition_onaudiostart = new WeakMap(), _WebSpeechRecognition_onaudioend = new WeakMap();
class WebSpeechGrammarList {
    constructor() {
        _WebSpeechGrammarList_grammars.set(this, []);
        this.addFromString = (grammar, weight) => {
            __classPrivateFieldGet(this, _WebSpeechGrammarList_grammars, "f").push(new WebSpeechGrammar(grammar, weight));
            this[this.length - 1] = __classPrivateFieldGet(this, _WebSpeechGrammarList_grammars, "f")[this.length - 1];
        };
    }
    get length() {
        return __classPrivateFieldGet(this, _WebSpeechGrammarList_grammars, "f").length;
    }
    addFromURI(src, weight) {
        // not implemented
    }
    item(index) {
        return __classPrivateFieldGet(this, _WebSpeechGrammarList_grammars, "f")[index];
    }
}
exports.WebSpeechGrammarList = WebSpeechGrammarList;
_WebSpeechGrammarList_grammars = new WeakMap();
class WebSpeechGrammar {
    constructor(src, weight) {
        this.src = "";
        this.weight = 1;
        this.src = src;
        this.weight = weight ?? 1;
    }
}
exports.WebSpeechGrammar = WebSpeechGrammar;
class WebSpeechRecognitionResultList {
    [(_WebSpeechRecognitionResultList_results = new WeakMap(), Symbol.iterator)]() {
        return __classPrivateFieldGet(this, _WebSpeechRecognitionResultList_results, "f")[Symbol.iterator]();
    }
    item(index) {
        return __classPrivateFieldGet(this, _WebSpeechRecognitionResultList_results, "f")[index];
    }
    constructor(results) {
        _WebSpeechRecognitionResultList_results.set(this, []);
        __classPrivateFieldSet(this, _WebSpeechRecognitionResultList_results, results, "f");
        this.length = results.length;
        for (let i = 0; i < __classPrivateFieldGet(this, _WebSpeechRecognitionResultList_results, "f").length; i++) {
            this[i] = __classPrivateFieldGet(this, _WebSpeechRecognitionResultList_results, "f")[i];
        }
    }
}
class WebSpeechRecognitionResult {
    item(index) {
        return __classPrivateFieldGet(this, _WebSpeechRecognitionResult_alternatives, "f")[index];
    }
    [(_WebSpeechRecognitionResult_alternatives = new WeakMap(), Symbol.iterator)]() {
        return __classPrivateFieldGet(this, _WebSpeechRecognitionResult_alternatives, "f")[Symbol.iterator]();
    }
    constructor(isFinal, alternatives) {
        _WebSpeechRecognitionResult_alternatives.set(this, []);
        this.isFinal = isFinal;
        this.length = alternatives.length;
        __classPrivateFieldSet(this, _WebSpeechRecognitionResult_alternatives, alternatives, "f");
        for (let i = 0; i < alternatives.length; i++) {
            this[i] = alternatives[i];
        }
    }
}
class WebSpeechRecognitionAlternative {
    constructor(confidence, transcript) {
        this.confidence = confidence;
        this.transcript = transcript;
    }
}
//# sourceMappingURL=WebSpeechRecognition.js.map