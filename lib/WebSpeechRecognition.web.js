"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSpeechGrammar = exports.WebSpeechGrammarList = exports.WebSpeechRecognition = void 0;
let browserSpeechRecognition = null;
let browserSpeechGrammarList = null;
if (typeof webkitSpeechRecognition !== "undefined") {
    browserSpeechRecognition = webkitSpeechRecognition;
    browserSpeechGrammarList =
        typeof webkitSpeechGrammarList !== "undefined"
            ? webkitSpeechGrammarList
            : null;
}
else if (typeof SpeechRecognition !== "undefined") {
    browserSpeechRecognition = SpeechRecognition;
    browserSpeechGrammarList =
        typeof SpeechGrammarList !== "undefined" ? SpeechGrammarList : null;
}
exports.WebSpeechRecognition = browserSpeechRecognition;
exports.WebSpeechGrammarList = browserSpeechGrammarList;
exports.WebSpeechGrammar = null;
//# sourceMappingURL=WebSpeechRecognition.web.js.map