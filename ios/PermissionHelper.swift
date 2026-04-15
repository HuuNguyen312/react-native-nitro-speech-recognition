import AVFoundation
import NitroModules
import Speech

/// Helper for requesting and checking speech recognition and microphone permissions,
/// returning the Nitro `PermissionResponse` and `SpeechRecognitionPermissionResponse` types.
enum PermissionHelper {

  // MARK: - Combined permissions (speech + microphone)

  /// Checks current combined speech + microphone permission status without requesting.
  static func getPermissions() -> SpeechRecognitionPermissionResponse {
    let recordPermission = AVAudioSession.sharedInstance().recordPermission
    let speechPermission = SFSpeechRecognizer.authorizationStatus()

    let status: String
    let granted: Bool
    let canAskAgain: Bool

    if speechPermission == .authorized && recordPermission == .granted {
      status = "granted"
      granted = true
      canAskAgain = true
    } else if speechPermission == .denied || recordPermission == .denied
      || speechPermission == .restricted
    {
      status = "denied"
      granted = false
      // If restricted, the user cannot change the setting
      canAskAgain = speechPermission != .restricted && speechPermission != .denied
        && recordPermission != .denied
    } else {
      status = "undetermined"
      granted = false
      canAskAgain = true
    }

    return SpeechRecognitionPermissionResponse(
      status: status,
      granted: granted,
      canAskAgain: canAskAgain,
      expires: "never",
      restricted: speechPermission == .restricted
    )
  }

  /// Requests combined speech + microphone permissions.
  static func requestPermissions() async -> SpeechRecognitionPermissionResponse {
    // First request speech recognition authorization
    let speechStatus = await withCheckedContinuation {
      (continuation: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status)
      }
    }

    // If speech was authorized, also request microphone permission
    if speechStatus == .authorized {
      _ = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
        AVAudioSession.sharedInstance().requestRecordPermission { authorized in
          continuation.resume(returning: authorized)
        }
      }
    }

    return getPermissions()
  }

  // MARK: - Microphone only

  /// Checks current microphone permission status without requesting.
  static func getMicrophonePermissions() -> PermissionResponse {
    let recordPermission = AVAudioSession.sharedInstance().recordPermission

    let status: String
    let granted: Bool
    let canAskAgain: Bool

    switch recordPermission {
    case .granted:
      status = "granted"
      granted = true
      canAskAgain = true
    case .denied:
      status = "denied"
      granted = false
      canAskAgain = false
    default:
      status = "undetermined"
      granted = false
      canAskAgain = true
    }

    return PermissionResponse(
      status: status,
      granted: granted,
      canAskAgain: canAskAgain,
      expires: "never"
    )
  }

  /// Requests microphone permission.
  static func requestMicrophonePermissions() async -> PermissionResponse {
    _ = await withCheckedContinuation { (continuation: CheckedContinuation<Bool, Never>) in
      AVAudioSession.sharedInstance().requestRecordPermission { authorized in
        continuation.resume(returning: authorized)
      }
    }
    return getMicrophonePermissions()
  }

  // MARK: - Speech recognizer only

  /// Checks current speech recognizer permission status without requesting.
  static func getSpeechRecognizerPermissions() -> SpeechRecognitionPermissionResponse {
    let speechPermission = SFSpeechRecognizer.authorizationStatus()

    let status: String
    let granted: Bool
    let canAskAgain: Bool

    switch speechPermission {
    case .authorized:
      status = "granted"
      granted = true
      canAskAgain = true
    case .denied, .restricted:
      status = "denied"
      granted = false
      canAskAgain = speechPermission != .restricted && speechPermission != .denied
    default:
      status = "undetermined"
      granted = false
      canAskAgain = true
    }

    return SpeechRecognitionPermissionResponse(
      status: status,
      granted: granted,
      canAskAgain: canAskAgain,
      expires: "never",
      restricted: speechPermission == .restricted
    )
  }

  /// Requests speech recognizer permission.
  static func requestSpeechRecognizerPermissions() async -> SpeechRecognitionPermissionResponse {
    _ = await withCheckedContinuation {
      (continuation: CheckedContinuation<SFSpeechRecognizerAuthorizationStatus, Never>) in
      SFSpeechRecognizer.requestAuthorization { status in
        continuation.resume(returning: status)
      }
    }
    return getSpeechRecognizerPermissions()
  }

  // MARK: - Audio session mapping helpers

  /// Maps a category string to an AVAudioSession.Category.
  static func mapCategory(_ category: String) -> AVAudioSession.Category {
    switch category {
    case "ambient": return .ambient
    case "soloAmbient": return .soloAmbient
    case "playback": return .playback
    case "record": return .record
    case "playAndRecord": return .playAndRecord
    case "multiRoute": return .multiRoute
    default: return .playAndRecord
    }
  }

  /// Maps a mode string to an AVAudioSession.Mode.
  static func mapMode(_ mode: String?) -> AVAudioSession.Mode {
    guard let mode = mode else { return .measurement }
    switch mode {
    case "default": return .default
    case "gameChat": return .gameChat
    case "measurement": return .measurement
    case "moviePlayback": return .moviePlayback
    case "spokenAudio": return .spokenAudio
    case "videoChat": return .videoChat
    case "videoRecording": return .videoRecording
    case "voiceChat": return .voiceChat
    case "voicePrompt": return .voicePrompt
    default: return .measurement
    }
  }

  /// Maps a category option string to an AVAudioSession.CategoryOptions value.
  static func mapCategoryOption(_ option: String) -> AVAudioSession.CategoryOptions {
    switch option {
    case "mixWithOthers": return .mixWithOthers
    case "duckOthers": return .duckOthers
    case "interruptSpokenAudioAndMixWithOthers": return .interruptSpokenAudioAndMixWithOthers
    case "allowBluetooth": return .allowBluetooth
    case "allowBluetoothA2DP": return .allowBluetoothA2DP
    case "allowAirPlay": return .allowAirPlay
    case "defaultToSpeaker": return .defaultToSpeaker
    case "overrideMutedMicrophoneInterruption":
      if #available(iOS 14.5, *) {
        return .overrideMutedMicrophoneInterruption
      } else {
        return .mixWithOthers
      }
    default: return []
    }
  }

  /// Maps an array of category option strings to a combined AVAudioSession.CategoryOptions bitmask.
  static func mapCategoryOptions(_ options: [String]) -> AVAudioSession.CategoryOptions {
    return options.reduce(AVAudioSession.CategoryOptions()) { result, option in
      result.union(mapCategoryOption(option))
    }
  }

  /// Maps an SFSpeechRecognitionTaskHint string to the native enum.
  static func mapTaskHint(_ hint: String?) -> SFSpeechRecognitionTaskHint? {
    guard let hint = hint else { return nil }
    switch hint {
    case "unspecified": return .unspecified
    case "dictation": return .dictation
    case "search": return .search
    case "confirmation": return .confirmation
    default: return nil
    }
  }
}
