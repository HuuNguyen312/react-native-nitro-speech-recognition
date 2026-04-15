import AVFoundation
import NitroModules
import Speech

class HybridSpeechRecognition: HybridSpeechRecognitionSpec {
  var memorySize: Int { return 0 }

  // MARK: - Speech recognizer

  var speechRecognizer: ExpoSpeechRecognizer?

  // MARK: - iOS 18 workarounds

  /// Hack for iOS 18 to detect final results.
  /// See: https://forums.developer.apple.com/forums/thread/762952
  var hasSeenFinalResult: Bool = false

  /// Hack for iOS 18 to avoid sending a "nomatch" event after the final-final result.
  var previousResult: SFSpeechRecognitionResult?

  // MARK: - Listener callbacks

  private var resultListener: ((_ event: SpeechRecognitionResultEvent) -> Void)?
  private var errorListener: ((_ event: SpeechRecognitionErrorEvent) -> Void)?
  private var startListener: (() -> Void)?
  private var endListener: (() -> Void)?
  private var speechStartListener: (() -> Void)?
  private var speechEndListener: (() -> Void)?
  private var audioStartListener: ((_ event: AudioUriEvent) -> Void)?
  private var audioEndListener: ((_ event: AudioUriEvent) -> Void)?
  private var soundStartListener: (() -> Void)?
  private var soundEndListener: (() -> Void)?
  private var noMatchListener: (() -> Void)?
  private var languageDetectionListener: ((_ event: LanguageDetectionEvent) -> Void)?
  private var volumeChangeListener: ((_ event: VolumeChangeEvent) -> Void)?

  // MARK: - Lifecycle

  deinit {
    // Cancel any running speech recognizers
    Task {
      await speechRecognizer?.abort()
    }
  }

  // MARK: - Listener registration

  func addResultListener(callback: @escaping (_ event: SpeechRecognitionResultEvent) -> Void)
    throws
  {
    resultListener = callback
  }

  func addErrorListener(callback: @escaping (_ event: SpeechRecognitionErrorEvent) -> Void) throws {
    errorListener = callback
  }

  func addStartListener(callback: @escaping () -> Void) throws {
    startListener = callback
  }

  func addEndListener(callback: @escaping () -> Void) throws {
    endListener = callback
  }

  func addSpeechStartListener(callback: @escaping () -> Void) throws {
    speechStartListener = callback
  }

  func addSpeechEndListener(callback: @escaping () -> Void) throws {
    speechEndListener = callback
  }

  func addAudioStartListener(callback: @escaping (_ event: AudioUriEvent) -> Void) throws {
    audioStartListener = callback
  }

  func addAudioEndListener(callback: @escaping (_ event: AudioUriEvent) -> Void) throws {
    audioEndListener = callback
  }

  func addSoundStartListener(callback: @escaping () -> Void) throws {
    soundStartListener = callback
  }

  func addSoundEndListener(callback: @escaping () -> Void) throws {
    soundEndListener = callback
  }

  func addNoMatchListener(callback: @escaping () -> Void) throws {
    noMatchListener = callback
  }

  func addLanguageDetectionListener(
    callback: @escaping (_ event: LanguageDetectionEvent) -> Void
  ) throws {
    languageDetectionListener = callback
  }

  func addVolumeChangeListener(callback: @escaping (_ event: VolumeChangeEvent) -> Void) throws {
    volumeChangeListener = callback
  }

  func removeListeners() throws {
    resultListener = nil
    errorListener = nil
    startListener = nil
    endListener = nil
    speechStartListener = nil
    speechEndListener = nil
    audioStartListener = nil
    audioEndListener = nil
    soundStartListener = nil
    soundEndListener = nil
    noMatchListener = nil
    languageDetectionListener = nil
    volumeChangeListener = nil
  }

  // MARK: - Start / Stop / Abort

  func start(options: SpeechRecognitionOptions) throws {
    Task {
      do {
        let currentLocale = await speechRecognizer?.getLocale()

        // Reset the previous result
        self.previousResult = nil

        // Re-create the speech recognizer when locales change
        if self.speechRecognizer == nil || currentLocale != options.lang {
          guard let locale = resolveLocale(localeIdentifier: options.lang) else {
            let availableLocales = SFSpeechRecognizer.supportedLocales().map { $0.identifier }
              .joined(separator: ", ")

            sendErrorAndStop(
              error: "language-not-supported",
              message:
                "Locale \(options.lang) is not supported by the speech recognizer. Available locales: \(availableLocales)"
            )
            return
          }

          self.speechRecognizer = try await ExpoSpeechRecognizer(
            locale: locale
          )
        }

        if !options.requiresOnDeviceRecognition {
          guard await SFSpeechRecognizer.hasAuthorizationToRecognize() else {
            sendErrorAndStop(
              error: "not-allowed",
              message: RecognizerError.notAuthorizedToRecognize.message
            )
            return
          }
        }

        guard await AVAudioSession.sharedInstance().hasPermissionToRecord() else {
          sendErrorAndStop(
            error: "not-allowed",
            message: RecognizerError.notPermittedToRecord.message
          )
          return
        }

        let maxAlternatives = options.maxAlternatives

        // Start recognition!
        await speechRecognizer?.start(
          options: options,
          resultHandler: { [weak self] result in
            self?.handleRecognitionResult(result, maxAlternatives: Int(maxAlternatives))
          },
          errorHandler: { [weak self] error in
            self?.handleRecognitionError(error)
          },
          endHandler: { [weak self] in
            self?.handleEnd()
          },
          startHandler: { [weak self] in
            self?.startListener?()
          },
          speechStartHandler: { [weak self] in
            self?.speechStartListener?()
          },
          audioStartHandler: { [weak self] filePath in
            let uri: String?
            if let filePath = filePath {
              uri = filePath.hasPrefix("file://") ? filePath : "file://" + filePath
            } else {
              uri = nil
            }
            self?.audioStartListener?(AudioUriEvent(uri: uri))
          },
          audioEndHandler: { [weak self] filePath in
            let uri: String?
            if let filePath = filePath {
              uri = filePath.hasPrefix("file://") ? filePath : "file://" + filePath
            } else {
              uri = nil
            }
            self?.audioEndListener?(AudioUriEvent(uri: uri))
          },
          volumeChangeHandler: { [weak self] value in
            self?.volumeChangeListener?(VolumeChangeEvent(value: Double(value)))
          }
        )
      } catch {
        self.errorListener?(
          SpeechRecognitionErrorEvent(
            error: "not-allowed",
            message: error.localizedDescription,
            code: 0
          )
        )
      }
    }
  }

  func stop() throws {
    Task {
      if let recognizer = speechRecognizer {
        await recognizer.stop()
      } else {
        endListener?()
      }
    }
  }

  func abort() throws {
    Task {
      errorListener?(
        SpeechRecognitionErrorEvent(
          error: "aborted",
          message: "Speech recognition aborted.",
          code: 0
        )
      )

      if let recognizer = speechRecognizer {
        await recognizer.abort()
      } else {
        endListener?()
      }
    }
  }

  // MARK: - Permissions

  func requestPermissionsAsync() throws -> Promise<SpeechRecognitionPermissionResponse> {
    return Promise.async {
      return await PermissionHelper.requestPermissions()
    }
  }

  func getPermissionsAsync() throws -> Promise<SpeechRecognitionPermissionResponse> {
    return Promise.async {
      return PermissionHelper.getPermissions()
    }
  }

  func getMicrophonePermissionsAsync() throws -> Promise<PermissionResponse> {
    return Promise.async {
      return PermissionHelper.getMicrophonePermissions()
    }
  }

  func requestMicrophonePermissionsAsync() throws -> Promise<PermissionResponse> {
    return Promise.async {
      return await PermissionHelper.requestMicrophonePermissions()
    }
  }

  func getSpeechRecognizerPermissionsAsync() throws -> Promise<SpeechRecognitionPermissionResponse>
  {
    return Promise.async {
      return PermissionHelper.getSpeechRecognizerPermissions()
    }
  }

  func requestSpeechRecognizerPermissionsAsync() throws
    -> Promise<SpeechRecognitionPermissionResponse>
  {
    return Promise.async {
      return await PermissionHelper.requestSpeechRecognizerPermissions()
    }
  }

  // MARK: - State

  func getStateAsync() throws -> Promise<String> {
    return Promise.async { [weak self] in
      let state = await self?.speechRecognizer?.getState()
      return state ?? "inactive"
    }
  }

  // MARK: - Supported Locales

  func getSupportedLocales(options: GetSupportedLocalesOptions) throws -> Promise<
    SupportedLocalesResult
  > {
    return Promise.async {
      let supportedLocales = SFSpeechRecognizer.supportedLocales().map { $0.identifier }.sorted()
      // On iOS, the installed locales are the same as the supported locales
      let installedLocales = supportedLocales
      return SupportedLocalesResult(
        locales: supportedLocales,
        installedLocales: installedLocales
      )
    }
  }

  // MARK: - Services (iOS no-ops / stubs)

  func getSpeechRecognitionServices() throws -> [String] {
    return []
  }

  func getDefaultRecognitionService() throws -> ServiceResult {
    return ServiceResult(packageName: "")
  }

  func getAssistantService() throws -> ServiceResult {
    return ServiceResult(packageName: "")
  }

  // MARK: - Capabilities

  func supportsOnDeviceRecognition() throws -> Bool {
    let recognizer = SFSpeechRecognizer()
    return recognizer?.supportsOnDeviceRecognition ?? false
  }

  func supportsRecording() throws -> Bool {
    return true
  }

  func isRecognitionAvailable() throws -> Bool {
    let recognizer = SFSpeechRecognizer()
    return recognizer?.isAvailable ?? false
  }

  // MARK: - Android-only (no-op on iOS)

  func androidTriggerOfflineModelDownload(options: TriggerOfflineModelDownloadOptions) throws
    -> Promise<OfflineModelDownloadResult>
  {
    return Promise.async {
      return OfflineModelDownloadResult(
        status: "unsupported",
        message: "Offline model download is not supported on iOS."
      )
    }
  }

  // MARK: - Audio Session

  func setCategoryIOS(options: SetCategoryOptions) throws {
    let categoryOptions = PermissionHelper.mapCategoryOptions(options.categoryOptions)
    let category = PermissionHelper.mapCategory(options.category)
    let mode = PermissionHelper.mapMode(options.mode)

    try AVAudioSession.sharedInstance().setCategory(
      category,
      mode: mode,
      options: categoryOptions
    )
  }

  func getAudioSessionCategoryAndOptionsIOS() throws -> AudioSessionInfo {
    let instance = AVAudioSession.sharedInstance()
    let categoryOptions: AVAudioSession.CategoryOptions = instance.categoryOptions

    var allCategoryOptions: [(option: AVAudioSession.CategoryOptions, string: String)] = [
      (.mixWithOthers, "mixWithOthers"),
      (.duckOthers, "duckOthers"),
      (.allowBluetooth, "allowBluetooth"),
      (.defaultToSpeaker, "defaultToSpeaker"),
      (.interruptSpokenAudioAndMixWithOthers, "interruptSpokenAudioAndMixWithOthers"),
      (.allowBluetoothA2DP, "allowBluetoothA2DP"),
      (.allowAirPlay, "allowAirPlay"),
    ]

    if #available(iOS 14.5, *) {
      allCategoryOptions.append(
        (.overrideMutedMicrophoneInterruption, "overrideMutedMicrophoneInterruption"))
    }

    let categoryOptionsStrings =
      allCategoryOptions
      .filter { categoryOptions.contains($0.option) }
      .map { $0.string }

    let categoryMapping: [AVAudioSession.Category: String] = [
      .ambient: "ambient",
      .playback: "playback",
      .record: "record",
      .playAndRecord: "playAndRecord",
      .multiRoute: "multiRoute",
      .soloAmbient: "soloAmbient",
    ]

    let modeMapping: [AVAudioSession.Mode: String] = [
      .default: "default",
      .gameChat: "gameChat",
      .measurement: "measurement",
      .moviePlayback: "moviePlayback",
      .spokenAudio: "spokenAudio",
      .videoChat: "videoChat",
      .videoRecording: "videoRecording",
      .voiceChat: "voiceChat",
      .voicePrompt: "voicePrompt",
    ]

    return AudioSessionInfo(
      category: categoryMapping[instance.category] ?? instance.category.rawValue,
      categoryOptions: categoryOptionsStrings,
      mode: modeMapping[instance.mode] ?? instance.mode.rawValue
    )
  }

  func setAudioSessionActiveIOS(value: Bool, notifyOthersOnDeactivation: Bool) throws {
    let setActiveOptions: AVAudioSession.SetActiveOptions =
      notifyOthersOnDeactivation ? .notifyOthersOnDeactivation : []
    try AVAudioSession.sharedInstance().setActive(value, options: setActiveOptions)
  }

  // MARK: - Internal helpers

  /// Normalizes the locale for compatibility between Android and iOS.
  private func resolveLocale(localeIdentifier: String) -> Locale? {
    let normalizedIdentifier = localeIdentifier.replacingOccurrences(of: "_", with: "-")
    let localesToCheck = [localeIdentifier, normalizedIdentifier]
    let supportedLocales = SFSpeechRecognizer.supportedLocales()

    for identifier in localesToCheck {
      if supportedLocales.contains(where: { $0.identifier == identifier }) {
        return Locale(identifier: identifier)
      }
    }

    return nil
  }

  private func sendErrorAndStop(error: String, message: String) {
    hasSeenFinalResult = false
    previousResult = nil
    errorListener?(SpeechRecognitionErrorEvent(error: error, message: message, code: 0))
    endListener?()
  }

  private func handleEnd() {
    hasSeenFinalResult = false
    previousResult = nil
    endListener?()
  }

  func handleRecognitionResult(_ result: SFSpeechRecognitionResult, maxAlternatives: Int) {
    var results: [SpeechRecognitionResultPayload] = []

    // Limit the number of transcriptions to the maxAlternatives
    let transcriptionSubsequence = result.transcriptions.prefix(maxAlternatives)

    var isFinal = result.isFinal

    // Hack for iOS 18 to detect final results
    // See: https://forums.developer.apple.com/forums/thread/762952
    if #available(iOS 18.0, *), !isFinal {
      isFinal = result.speechRecognitionMetadata?.speechDuration ?? 0 > 0
    }

    for transcription in transcriptionSubsequence {
      var transcript = transcription.formattedString

      // Prepend an empty space if the hacky workaround is applied
      // So that the user can append the transcript to the previous result,
      // matching the behavior of Android & Web Speech API
      if hasSeenFinalResult {
        transcript = " " + transcription.formattedString
      }

      let segments = transcription.segments.map { segment in
        return SpeechRecognitionResultSegment(
          startTimeMillis: segment.timestamp * 1000,
          endTimeMillis: (segment.timestamp * 1000) + segment.duration * 1000,
          segment: segment.substring,
          confidence: Double(segment.confidence)
        )
      }

      let confidence: Double =
        transcription.segments.isEmpty
        ? 0
        : Double(transcription.segments.map { $0.confidence }.reduce(0, +))
          / Double(transcription.segments.count)

      let item = SpeechRecognitionResultPayload(
        transcript: transcript,
        confidence: confidence,
        segments: segments
      )

      if !transcription.formattedString.isEmpty {
        results.append(item)
      }
    }

    // Apply the "workaround"
    if #available(iOS 18.0, *), !result.isFinal, isFinal {
      hasSeenFinalResult = true
    }

    if isFinal && results.isEmpty {
      // Hack for iOS 18 to avoid sending a "nomatch" event after the final-final result
      var previousResultWasFinal = false
      var previousResultHadTranscriptions = false
      if #available(iOS 18.0, *), let previousResult = previousResult {
        previousResultWasFinal = previousResult.speechRecognitionMetadata?.speechDuration ?? 0 > 0
        previousResultHadTranscriptions = !previousResult.transcriptions.isEmpty
      }

      if !previousResultWasFinal || !previousResultHadTranscriptions {
        // https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/nomatch_event
        noMatchListener?()
        return
      }
    }

    resultListener?(
      SpeechRecognitionResultEvent(
        isFinal: isFinal,
        results: results
      )
    )

    previousResult = result
  }

  func handleRecognitionError(_ error: Error) {
    if let recognitionError = error as? RecognizerError {
      switch recognitionError {
      case .nilRecognizer:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "language-not-supported", message: recognitionError.message, code: 0))
      case .notAuthorizedToRecognize:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "not-allowed", message: recognitionError.message, code: 0))
      case .notPermittedToRecord:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "not-allowed", message: recognitionError.message, code: 0))
      case .recognizerIsUnavailable:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "service-not-allowed", message: recognitionError.message, code: 0))
      case .invalidAudioSource:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "audio-capture", message: recognitionError.message, code: 0))
      case .audioInputBusy:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "audio-capture", message: recognitionError.message, code: 0))
      case .audioSessionInterrupted:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "interrupted", message: recognitionError.message, code: 0))
      case .audioRouteChanged:
        errorListener?(
          SpeechRecognitionErrorEvent(
            error: "audio-capture", message: recognitionError.message, code: 0))
      }
      return
    }

    // Other errors thrown by SFSpeechRecognizer / SFSpeechRecognitionTask
    /*
     Error Code | Error Domain | Description
     102 | kLSRErrorDomain | Assets are not installed.
     201 | kLSRErrorDomain | Siri or Dictation is disabled.
     300 | kLSRErrorDomain | Failed to initialize recognizer.
     301 | kLSRErrorDomain | Request was canceled.
     203 | kAFAssistantErrorDomain | Failure occurred during speech recognition.
     1100 | kAFAssistantErrorDomain | Trying to start recognition while an earlier instance is still active.
     1101 | kAFAssistantErrorDomain | Connection to speech process was invalidated.
     1107 | kAFAssistantErrorDomain | Connection to speech process was interrupted.
     1110 | kAFAssistantErrorDomain | Failed to recognize any speech.
     1700 | kAFAssistantErrorDomain | Request is not authorized.
     */
    let nsError = error as NSError
    let errorCode = nsError.code

    let errorTypes: [(codes: [Int], code: String, message: String)] = [
      (
        [102, 201], "service-not-allowed",
        "Assets are not installed, Siri or Dictation is disabled."
      ),
      ([203], "audio-capture", "Failure occurred during speech recognition."),
      ([1100], "busy", "Trying to start recognition while an earlier instance is still active."),
      ([1101, 1107], "network", "Connection to speech process was invalidated or interrupted."),
      ([1110], "no-speech", "No speech was detected."),
      ([1700], "not-allowed", "Request is not authorized."),
    ]

    for (codes, code, message) in errorTypes {
      if codes.contains(errorCode) {
        // Handle nomatch error for the underlying error:
        // +[AFAggregator logDictationFailedWithErrr:] Error Domain=kAFAssistantErrorDomain Code=203
        // "Retry" UserInfo={NSLocalizedDescription=Retry,
        // NSUnderlyingError=0x600000d0ca50 {Error Domain=SiriSpeechErrorDomain Code=1 "(null)"}}
        if let underlyingError = nsError.userInfo[NSUnderlyingErrorKey] as? NSError {
          if errorCode == 203 && underlyingError.domain == "SiriSpeechErrorDomain"
            && underlyingError.code == 1
          {
            noMatchListener?()
          } else {
            errorListener?(
              SpeechRecognitionErrorEvent(
                error: code, message: message, code: Double(errorCode)))
          }
        } else {
          errorListener?(
            SpeechRecognitionErrorEvent(
              error: code, message: message, code: Double(errorCode)))
        }
        return
      }
    }

    // Unknown error (but not a canceled request)
    if errorCode != 301 {
      errorListener?(
        SpeechRecognitionErrorEvent(
          error: "audio-capture", message: error.localizedDescription, code: Double(errorCode)))
    }
  }
}
