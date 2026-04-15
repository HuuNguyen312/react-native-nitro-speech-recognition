package com.speechrecognition

import android.media.AudioFormat
import android.speech.RecognizerIntent

/**
 * Internal speech recognition options used by SpeechService.
 * These are plain Kotlin data classes (no Expo annotations).
 * Converted from the Nitro-generated types by HybridSpeechRecognition.
 */
data class InternalSpeechRecognitionOptions(
    val interimResults: Boolean = false,
    val lang: String = "en-US",
    val continuous: Boolean = false,
    val maxAlternatives: Int = 5,
    var contextualStrings: List<String>? = null,
    var requiresOnDeviceRecognition: Boolean = false,
    var addsPunctuation: Boolean = false,
    var androidIntentOptions: Map<String, Any>? = null,
    val androidRecognitionServicePackage: String? = null,
    val audioSource: InternalAudioSourceOptions? = null,
    val recordingOptions: InternalRecordingOptions? = null,
    val androidIntent: String? = RecognizerIntent.ACTION_RECOGNIZE_SPEECH,
    val iosTaskHint: String? = null,
    val iosCategory: Map<String, Any>? = null,
    val volumeChangeEventOptions: InternalVolumeChangeEventOptions? = null,
    val iosVoiceProcessingEnabled: Boolean = false,
)

data class InternalVolumeChangeEventOptions(
    val enabled: Boolean = false,
    val intervalMillis: Int? = null,
)

data class InternalRecordingOptions(
    val persist: Boolean = false,
    val outputDirectory: String? = null,
    val outputFileName: String? = null,
    val outputSampleRate: Int? = null,
    val outputEncoding: String? = null,
)

data class InternalAudioSourceOptions(
    val uri: String = "",
    val audioEncoding: Int? = AudioFormat.ENCODING_PCM_16BIT,
    val sampleRate: Int? = 16000,
    val audioChannels: Int? = 1,
    val chunkDelayMillis: Long? = null,
)

data class InternalGetSupportedLocaleOptions(
    val androidRecognitionServicePackage: String? = null,
)

data class InternalTriggerOfflineModelDownloadOptions(
    val locale: String = "en-US",
)
