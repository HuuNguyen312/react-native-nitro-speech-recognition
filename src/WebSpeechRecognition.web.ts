let browserSpeechRecognition: typeof SpeechRecognition | null = null;
let browserSpeechGrammarList: typeof SpeechGrammarList | null = null;

if (typeof webkitSpeechRecognition !== "undefined") {
  browserSpeechRecognition = webkitSpeechRecognition;
  browserSpeechGrammarList =
    typeof webkitSpeechGrammarList !== "undefined"
      ? webkitSpeechGrammarList
      : null;
} else if (typeof SpeechRecognition !== "undefined") {
  browserSpeechRecognition = SpeechRecognition;
  browserSpeechGrammarList =
    typeof SpeechGrammarList !== "undefined" ? SpeechGrammarList : null;
}

export const WebSpeechRecognition = browserSpeechRecognition;
export const WebSpeechGrammarList = browserSpeechGrammarList;
export const WebSpeechGrammar = null;
