"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechRecognizerErrorAndroid = exports.TaskHintIOS = exports.AudioEncodingAndroid = exports.RecognizerIntentEnableLanguageSwitch = exports.RecognizerIntentExtraLanguageModel = exports.AVAudioSessionMode = exports.AVAudioSessionCategoryOptions = exports.AVAudioSessionCategory = exports.useSpeechRecognitionEvent = exports.SpeechRecognitionModule = exports.WebSpeechGrammarList = exports.WebSpeechGrammar = exports.WebSpeechRecognition = void 0;
// Export the SpeechRecognition APIs
var WebSpeechRecognition_1 = require("./WebSpeechRecognition");
Object.defineProperty(exports, "WebSpeechRecognition", { enumerable: true, get: function () { return WebSpeechRecognition_1.WebSpeechRecognition; } });
Object.defineProperty(exports, "WebSpeechGrammar", { enumerable: true, get: function () { return WebSpeechRecognition_1.WebSpeechGrammar; } });
Object.defineProperty(exports, "WebSpeechGrammarList", { enumerable: true, get: function () { return WebSpeechRecognition_1.WebSpeechGrammarList; } });
// Native module
var SpeechRecognitionModule_1 = require("./SpeechRecognitionModule");
Object.defineProperty(exports, "SpeechRecognitionModule", { enumerable: true, get: function () { return SpeechRecognitionModule_1.SpeechRecognitionModule; } });
// Hooks
var useSpeechRecognitionEvent_1 = require("./useSpeechRecognitionEvent");
Object.defineProperty(exports, "useSpeechRecognitionEvent", { enumerable: true, get: function () { return useSpeechRecognitionEvent_1.useSpeechRecognitionEvent; } });
// Constants
var constants_1 = require("./constants");
Object.defineProperty(exports, "AVAudioSessionCategory", { enumerable: true, get: function () { return constants_1.AVAudioSessionCategory; } });
Object.defineProperty(exports, "AVAudioSessionCategoryOptions", { enumerable: true, get: function () { return constants_1.AVAudioSessionCategoryOptions; } });
Object.defineProperty(exports, "AVAudioSessionMode", { enumerable: true, get: function () { return constants_1.AVAudioSessionMode; } });
Object.defineProperty(exports, "RecognizerIntentExtraLanguageModel", { enumerable: true, get: function () { return constants_1.RecognizerIntentExtraLanguageModel; } });
Object.defineProperty(exports, "RecognizerIntentEnableLanguageSwitch", { enumerable: true, get: function () { return constants_1.RecognizerIntentEnableLanguageSwitch; } });
Object.defineProperty(exports, "AudioEncodingAndroid", { enumerable: true, get: function () { return constants_1.AudioEncodingAndroid; } });
Object.defineProperty(exports, "TaskHintIOS", { enumerable: true, get: function () { return constants_1.TaskHintIOS; } });
Object.defineProperty(exports, "SpeechRecognizerErrorAndroid", { enumerable: true, get: function () { return constants_1.SpeechRecognizerErrorAndroid; } });
//# sourceMappingURL=index.js.map