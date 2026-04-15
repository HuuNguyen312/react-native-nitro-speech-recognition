# CLAUDE.md
## Project: expo-speech-recognition

React Native speech recognition library using [Nitro Modules](https://nitro.margelo.com/) for native bridging. Supports iOS (`SFSpeechRecognizer`), Android (`SpeechRecognizer`), and Web (Web Speech API).

### Commands

```bash
# Codegen (must run after changing specs/SpeechRecognition.nitro.ts)
npm run nitrogen

# Build TypeScript → lib/
npm run build

# Codegen + build (run before publishing or testing locally)
npm run prepare

# Type-check without emitting
npm run ts:check

# Lint
npm run lint

# Clean generated artifacts
npm run clean

# Open native projects
npm run open:ios      # Xcode
npm run open:android  # Android Studio
```

#### Example App (from `example/`)
```bash
npm run start     # Metro dev server
npm run ios       # Run on iOS simulator
npm run android   # Run on Android emulator
npm run web       # Run on web
```

### Architecture

The library has three layers:

**1. Nitro spec** (`src/specs/SpeechRecognition.nitro.ts`)
This is the contract. It defines the `HybridSpeechRecognition` interface that native implementations must satisfy. **Changing this file requires re-running `npm run nitrogen`** to regenerate the C++ bindings in `nitrogen/generated/` — those files must not be edited manually.

**2. JS wrapper** (`src/SpeechRecognitionModule.ts`)
Singleton that registers all native callbacks once via `registerAllNativeListeners()`, then fans out events to JS subscribers. This avoids per-listener native overhead. `useSpeechRecognitionEvent()` wraps the subscription lifecycle for React components.

**3. Native implementations**
- **iOS**: `ios/HybridSpeechRecognition.swift` (Nitro bridge) + `ios/ExpoSpeechRecognizer.swift` (core logic using `SFSpeechRecognizer`)
- **Android**: `android/.../HybridSpeechRecognition.kt` (Nitro bridge) + `SpeechService.kt` (core logic using `SpeechRecognizer`); optional audio recording via `AudioRecorder.kt` and `DelayedFileStreamer.kt`

Web support lives entirely in JS: `src/SpeechRecognitionModule.web.ts` + `src/WebSpeechRecognition.web.ts`.

### Key Files

| File | Purpose |
|------|---------|
| `src/specs/SpeechRecognition.nitro.ts` | Nitro HybridObject contract — source of truth for the API surface |
| `src/SpeechRecognitionModule.types.ts` | All TypeScript types |
| `src/constants.ts` | Platform constants (AVAudioSession categories, Android intents, error codes) |
| `nitro.json` | Nitrogen codegen config (C++ namespace, iOS/Android module names) |
| `ios/NitroSpeechRecognition.podspec` | CocoaPods spec — iOS 13.4+, Swift 5.9 |
| `android/build.gradle` | Android build — min SDK 21, Kotlin + coroutines |

### Release Workflow

Uses [changesets](https://github.com/changesets/changesets):
1. `npm run changeset` — describe the change
2. Merge PR → GitHub Actions creates a release PR
3. Merge release PR → publishes to npm via `npm run release`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution


**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---
