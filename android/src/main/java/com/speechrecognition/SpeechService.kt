package com.speechrecognition

import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.ResolveInfo
import android.media.AudioFormat
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognitionPart
import android.speech.RecognitionService
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import java.io.File
import java.net.URI
import java.util.Locale

data class SpeechRecognitionErrorInfo(
    val error: String,
    val message: String,
)

enum class RecognitionState {
    INACTIVE,
    STARTING,
    ACTIVE,
    STOPPING,
    ERROR,
}

enum class SoundState {
    INACTIVE,
    ACTIVE,
    SILENT,
}

class SpeechService(
    private val reactContext: Context,
    private var sendEvent: (name: String, body: Map<String, Any?>?) -> Unit,
) : RecognitionListener {
    private var speech: SpeechRecognizer? = null
    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var options: InternalSpeechRecognitionOptions
    private var lastVolumeChangeEventTime: Long = 0L

    /** Audio recorder for persisting audio */
    private var audioRecorder: AudioRecorder? = null

    /** File streamer for file-based recognition */
    private var delayedFileStreamer: DelayedFileStreamer? = null
    private var soundState = SoundState.INACTIVE

    private var lastDetectedLanguage: String? = null
    private var lastLanguageConfidence: Float? = null

    var recognitionState = RecognitionState.INACTIVE

    companion object {
        @SuppressLint("QueryPermissionsNeeded")
        fun findComponentNameByPackageName(
            context: Context,
            packageName: String,
        ): ComponentName {
            val packageManager = context.packageManager
            val services: List<ResolveInfo> = packageManager.queryIntentServices(Intent(RecognitionService.SERVICE_INTERFACE), 0)

            for (service in services) {
                if (service.serviceInfo.packageName == packageName) {
                    Log.d("SpeechService", "Found service for package $packageName: ${service.serviceInfo.name}")
                    return ComponentName(service.serviceInfo.packageName, service.serviceInfo.name)
                }
            }

            throw Exception("No service found for package $packageName")
        }
    }

    private fun log(message: String) {
        Log.d("SpeechService", message)
    }

    private fun createSpeechRecognizer(options: InternalSpeechRecognitionOptions): SpeechRecognizer? {
        val value =
            when {
                Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && options.requiresOnDeviceRecognition == true -> {
                    SpeechRecognizer.createOnDeviceSpeechRecognizer(reactContext)
                }
                options.androidRecognitionServicePackage != null -> {
                    SpeechRecognizer.createSpeechRecognizer(
                        reactContext,
                        findComponentNameByPackageName(reactContext, options.androidRecognitionServicePackage),
                    )
                }
                else -> {
                    SpeechRecognizer.createSpeechRecognizer(reactContext)
                }
            }

        return value
    }

    /** Starts speech recognition */
    fun start(options: InternalSpeechRecognitionOptions) {
        this.options = options
        mainHandler.post {
            log("Start recognition.")

            // Destroy any previous SpeechRecognizer / audio recorder
            speech?.destroy()
            audioRecorder?.stop()
            audioRecorder = null
            delayedFileStreamer?.close()
            delayedFileStreamer = null
            lastDetectedLanguage = null
            lastLanguageConfidence = null
            recognitionState = RecognitionState.STARTING
            soundState = SoundState.INACTIVE
            lastVolumeChangeEventTime = 0L
            try {
                val intent = createSpeechIntent(options)
                speech = createSpeechRecognizer(options)

                // Start the audio recorder
                audioRecorder?.start()

                // Start listening
                speech?.setRecognitionListener(this)
                speech?.startListening(intent)

                delayedFileStreamer?.startStreaming()

                sendEvent(
                    "audiostart",
                    mapOf(
                        "uri" to audioRecorder?.outputFileUri,
                    ),
                )
            } catch (e: Exception) {
                val errorMessage =
                    when {
                        e.localizedMessage != null -> e.localizedMessage
                        e.message != null -> e.message
                        else -> "Unknown error"
                    }
                e.printStackTrace()
                log("Failed to create Speech Recognizer with error: $errorMessage")
                sendEvent("error", mapOf("error" to "audio-capture", "message" to errorMessage, "code" to -1))
                teardownAndEnd()
            }
        }
    }

    /**
     * Stops the audio recorder and sends the recorded audio file path to the app.
     */
    private fun stopRecording() {
        audioRecorder?.stop()
        if (audioRecorder?.outputFile != null) {
            val uri = audioRecorder?.outputFile?.absolutePath?.let { "file://$it" }
            sendEvent(
                "audioend",
                mapOf(
                    "uri" to uri,
                ),
            )
        } else {
            sendEvent(
                "audioend",
                mapOf(
                    "uri" to null,
                ),
            )
        }
        audioRecorder = null
    }

    /**
     * Stops the speech recognizer.
     * Attempts to emit a final result if the speech recognizer is still running.
     */
    fun stop() {
        mainHandler.post {
            recognitionState = RecognitionState.STOPPING
            try {
                speech?.stopListening()
            } catch (e: Exception) {
                // do nothing
            }
        }
    }

    /**
     * Immediately cancels the current speech recognition task.
     */
    fun abort() {
        teardownAndEnd()
    }

    /**
     * Destroys the speech service and stops all audio recording
     */
    fun destroy() {
        // Overwrite sendEvent to prevent sending events after destroy
        sendEvent = { _, _ -> }
        teardownAndEnd()
    }

    /**
     * Stops speech recognition, recording and updates state
     */
    private fun teardownAndEnd(state: RecognitionState = RecognitionState.INACTIVE) {
        recognitionState = RecognitionState.STOPPING
        mainHandler.post {
            try {
                speech?.cancel()
            } catch (e: Exception) {
                // do nothing
            }
            speech?.destroy()
            speech = null
            stopRecording()
            soundState = SoundState.INACTIVE
            sendEvent("end", null)
            recognitionState = state
            delayedFileStreamer?.close()
            delayedFileStreamer = null
        }
    }

    private fun createSpeechIntent(options: InternalSpeechRecognitionOptions): Intent {
        val action = options.androidIntent ?: RecognizerIntent.ACTION_RECOGNIZE_SPEECH
        val intent = Intent(action)

        intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, options.interimResults)

        // Allow users to override the language mode
        if (options.androidIntentOptions?.containsKey("EXTRA_LANGUAGE_MODEL") != true) {
            intent.putExtra(
                RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
            )
        }

        // Feature: Confidence levels on transcript words
        if (action == RecognizerIntent.ACTION_RECOGNIZE_SPEECH &&
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE
        ) {
            intent.putExtra(RecognizerIntent.EXTRA_REQUEST_WORD_CONFIDENCE, true)
            intent.putExtra(RecognizerIntent.EXTRA_REQUEST_WORD_TIMING, true)
        }

        // Set up audio recording & sink to recognizer/file
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && options.audioSource == null) {
            if (options.recordingOptions?.persist == true) {
                audioRecorder = AudioRecorder(reactContext, resolveFilePathFromConfig(options.recordingOptions))
            } else if (options.continuous == true) {
                audioRecorder = AudioRecorder(reactContext, null)
            }

            // Set common intent extras if audioRecorder is initialized
            audioRecorder?.let {
                intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, it.recordingParcel)
                intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT, 1)
                intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING, it.audioFormat)
                intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE, it.sampleRateInHz)

                if (options.continuous == true) {
                    intent.putExtra(
                        RecognizerIntent.EXTRA_SEGMENTED_SESSION,
                        RecognizerIntent.EXTRA_AUDIO_SOURCE,
                    )
                } else {
                    intent.putExtra(
                        RecognizerIntent.EXTRA_SEGMENTED_SESSION,
                        RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS,
                    )
                    intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2000)
                    intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 1000)
                    intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000)
                }
            }
        } else if (options.continuous == true && options.audioSource == null) {
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 600000)
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 600000)
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 600000)
            log("Continuous transcription opted in (older platforms)")
        }

        // Feature: Transcribe audio from a local or remote file
        if (options.audioSource?.uri != null && options.audioSource.uri.isNotEmpty()) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                throw Exception("Audio source is only supported on Android 13 and above")
            }

            log("Transcribing audio from local file: ${options.audioSource.uri}")
            val file = resolveSourceUri(options.audioSource.uri)

            if (!file.exists()) {
                throw Exception("File not found: ${file.absolutePath}")
            }
            if (!file.canRead()) {
                throw Exception("File cannot be read: ${file.absolutePath}")
            }

            val chunkDelayMillis =
                when {
                    options.audioSource.chunkDelayMillis != null -> options.audioSource.chunkDelayMillis
                    options.requiresOnDeviceRecognition == true -> 15L
                    else -> 50L
                }

            delayedFileStreamer = DelayedFileStreamer(file, chunkDelayMillis)

            delayedFileStreamer?.let {
                val descriptor = it.getParcel()
                intent.putExtra(RecognizerIntent.EXTRA_AUDIO_SOURCE, descriptor)

                intent.putExtra(
                    RecognizerIntent.EXTRA_AUDIO_SOURCE_ENCODING,
                    options.audioSource.audioEncoding ?: AudioFormat.ENCODING_PCM_16BIT,
                )
                intent.putExtra(
                    RecognizerIntent.EXTRA_AUDIO_SOURCE_SAMPLING_RATE,
                    options.audioSource.sampleRate ?: 16000,
                )
                intent.putExtra(
                    RecognizerIntent.EXTRA_AUDIO_SOURCE_CHANNEL_COUNT,
                    options.audioSource.audioChannels ?: 1,
                )
                intent.putExtra(
                    RecognizerIntent.EXTRA_SEGMENTED_SESSION,
                    RecognizerIntent.EXTRA_AUDIO_SOURCE,
                )
            }
        }

        val contextualStrings = options.contextualStrings
        if (!contextualStrings.isNullOrEmpty() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val strings = ArrayList(contextualStrings)
            log("biasing strings: ${strings.joinToString(", ")}")
            intent.putExtra(
                RecognizerIntent.EXTRA_BIASING_STRINGS,
                ArrayList(contextualStrings),
            )
        }

        if (options.addsPunctuation == true && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            intent.putExtra(RecognizerIntent.EXTRA_ENABLE_FORMATTING, RecognizerIntent.FORMATTING_OPTIMIZE_QUALITY)
        }

        if (options.requiresOnDeviceRecognition == true) {
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
        }

        intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, options.maxAlternatives)

        val language = options.lang.takeIf { it.isNotEmpty() } ?: Locale.getDefault().toString()
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)

        log("androidIntentOptions: ${options.androidIntentOptions}")

        // Add any additional intent extras provided by the user
        options.androidIntentOptions?.forEach { (key, value) ->
            val field = RecognizerIntent::class.java.getDeclaredField(key)
            val fieldValue = field.get(null) as? String

            log("Resolved key $key -> $fieldValue with value: $value (${value.javaClass.name})")
            when (value) {
                is Boolean -> intent.putExtra(fieldValue, value)
                is Int -> intent.putExtra(fieldValue, value)
                is String -> intent.putExtra(fieldValue, value)
                is List<*> -> {
                    if (value.all { it is String }) {
                        intent.putExtra(fieldValue, value.filterIsInstance<String>().toTypedArray())
                    }
                }
                is Double -> intent.putExtra(fieldValue, value.toInt())
                else -> throw IllegalArgumentException("Unsupported type for androidIntentOptions.$key: ${value.javaClass.name}")
            }
        }

        return intent
    }

    private fun resolveFilePathFromConfig(recordingOptions: InternalRecordingOptions): String {
        val fileDirectory =
            (recordingOptions.outputDirectory ?: reactContext.cacheDir.absolutePath)
                .removePrefix("file://")
                .trimEnd('/')

        val filePath =
            recordingOptions.outputFileName?.let { fileName ->
                "$fileDirectory/$fileName"
            } ?: run {
                val timestamp = System.currentTimeMillis().toString()
                "$fileDirectory/recording_$timestamp.wav"
            }
        return filePath
    }

    /**
     * Resolves the source URI to a local file path
     */
    private fun resolveSourceUri(sourceUri: String): File =
        when {
            sourceUri.startsWith("file://") -> File(URI(sourceUri))
            !sourceUri.startsWith("https://") -> File(sourceUri)
            else -> {
                throw Exception("HTTP URI is not supported. Use expo-file-system to download the file.")
            }
        }

    override fun onReadyForSpeech(params: Bundle?) {
        if (recognitionState != RecognitionState.ERROR) {
            sendEvent("start", null)
            recognitionState = RecognitionState.ACTIVE
        }
    }

    override fun onBeginningOfSpeech() {
        sendEvent("speechstart", null)
    }

    override fun onRmsChanged(rmsdB: Float) {
        if (options.volumeChangeEventOptions?.enabled != true) {
            return
        }

        val intervalMs = options.volumeChangeEventOptions?.intervalMillis

        if (intervalMs == null) {
            sendEvent("volumechange", mapOf("value" to rmsdB))
        } else {
            val currentTime = System.currentTimeMillis()
            if (currentTime - lastVolumeChangeEventTime >= intervalMs) {
                sendEvent("volumechange", mapOf("value" to rmsdB))
                lastVolumeChangeEventTime = currentTime
            }
        }
    }

    override fun onBufferReceived(buffer: ByteArray?) {
        // More sound has been received.
    }

    override fun onEndOfSpeech() {
        sendEvent("speechend", null)
        log("onEndOfSpeech()")
    }

    override fun onError(error: Int) {
        val errorInfo = getErrorInfo(error)
        if (error == SpeechRecognizer.ERROR_NO_MATCH) {
            sendEvent("nomatch", null)
        }

        sendEvent("error", mapOf("error" to errorInfo.error, "message" to errorInfo.message, "code" to error))
        teardownAndEnd(RecognitionState.ERROR)
        log("onError() - ${errorInfo.error}: ${errorInfo.message} - code: $error")
    }

    private fun getResults(results: Bundle?): List<Map<String, Any>> {
        val resultsList = mutableListOf<Map<String, Any>>()
        val confidences = results?.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)

        results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.let { matches ->
            resultsList.addAll(
                matches.mapIndexed { index, transcript ->
                    val confidence = confidences?.getOrNull(index) ?: 0f
                    mapOf(
                        "transcript" to transcript,
                        "confidence" to confidence,
                        "segments" to if (index == 0) getSegmentConfidences(results) else listOf(),
                    )
                },
            )
        }

        return resultsList
    }

    private fun getSegmentConfidences(results: Bundle?): List<Map<String, Any>> {
        if (results == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return listOf()
        }

        val recognitionParts =
            results.getParcelableArrayList(SpeechRecognizer.RECOGNITION_PARTS, RecognitionPart::class.java)
                ?: return listOf()

        return recognitionParts
            .mapIndexed { index, it ->
                val nextPart = recognitionParts.getOrNull(index + 1)
                val endTime =
                    if (nextPart != null) {
                        nextPart.timestampMillis - 1
                    } else {
                        it.timestampMillis
                    }
                mapOf(
                    "startTimeMillis" to it.timestampMillis,
                    "endTimeMillis" to endTime,
                    "segment" to if (it.formattedText.isNullOrEmpty()) it.rawText else it.formattedText!!,
                    "confidence" to confidenceLevelToFloat(it.confidenceLevel),
                )
            }
    }

    private fun confidenceLevelToFloat(confidenceLevel: Int): Float =
        when (confidenceLevel) {
            RecognitionPart.CONFIDENCE_LEVEL_HIGH -> 1.0f
            RecognitionPart.CONFIDENCE_LEVEL_MEDIUM_HIGH -> 0.8f
            RecognitionPart.CONFIDENCE_LEVEL_MEDIUM -> 0.6f
            RecognitionPart.CONFIDENCE_LEVEL_MEDIUM_LOW -> 0.4f
            RecognitionPart.CONFIDENCE_LEVEL_LOW -> 0.2f
            RecognitionPart.CONFIDENCE_LEVEL_UNKNOWN -> -1.0f
            else -> 0.0f
        }

    private fun languageDetectionConfidenceLevelToFloat(confidenceLevel: Int): Float =
        when (confidenceLevel) {
            SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_HIGHLY_CONFIDENT -> 1.0f
            SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_CONFIDENT -> 0.8f
            SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_NOT_CONFIDENT -> 0.5f
            SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL_UNKNOWN -> 0f
            else -> 0.0f
        }

    override fun onResults(results: Bundle?) {
        val resultsList = getResults(results)

        if (resultsList.isEmpty()) {
            sendEvent("nomatch", null)
        } else {
            sendEvent(
                "result",
                mapOf(
                    "results" to resultsList,
                    "isFinal" to true,
                ),
            )
        }
        log("onResults(), results: $resultsList")

        teardownAndEnd()
    }

    override fun onPartialResults(partialResults: Bundle?) {
        val partialResultsList = getResults(partialResults)
        val nonEmptyStrings = partialResultsList.filter { it["transcript"]?.toString()?.isNotEmpty() ?: false }

        log("onPartialResults(), results: $nonEmptyStrings")
        if (nonEmptyStrings.isNotEmpty()) {
            sendEvent("result", mapOf("results" to nonEmptyStrings, "isFinal" to false))
        }
    }

    override fun onLanguageDetection(results: Bundle) {
        val detectedLanguage = results.getString(SpeechRecognizer.DETECTED_LANGUAGE)
        val confidence = languageDetectionConfidenceLevelToFloat(results.getInt(SpeechRecognizer.LANGUAGE_DETECTION_CONFIDENCE_LEVEL))

        if (detectedLanguage != lastDetectedLanguage || confidence != lastLanguageConfidence) {
            lastDetectedLanguage = detectedLanguage
            lastLanguageConfidence = confidence

            sendEvent(
                "languagedetection",
                mapOf(
                    "detectedLanguage" to detectedLanguage,
                    "confidence" to confidence,
                    "topLocaleAlternatives" to results.getStringArrayList(SpeechRecognizer.TOP_LOCALE_ALTERNATIVES),
                ),
            )
        }
    }

    override fun onSegmentResults(segmentResults: Bundle) {
        val resultsList = getResults(segmentResults)
        if (resultsList.isEmpty()) {
            sendEvent("nomatch", null)
        } else {
            sendEvent(
                "result",
                mapOf(
                    "results" to resultsList,
                    "isFinal" to true,
                ),
            )
        }
        log("onSegmentResults(), transcriptions: $resultsList")

        if (recognitionState == RecognitionState.STOPPING) {
            teardownAndEnd()
        }
    }

    override fun onEndOfSegmentedSession() {
        log("onEndOfSegmentedSession()")
        teardownAndEnd()
    }

    override fun onEvent(
        eventType: Int,
        params: Bundle?,
    ) {
        // Reserved for future events
    }

    private fun getErrorInfo(errorCode: Int): SpeechRecognitionErrorInfo {
        val error: String =
            when (errorCode) {
                SpeechRecognizer.ERROR_AUDIO -> "audio-capture"
                SpeechRecognizer.ERROR_CLIENT -> "client"
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "service-not-allowed"
                SpeechRecognizer.ERROR_NETWORK -> "network"
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "network"
                SpeechRecognizer.ERROR_NO_MATCH -> "no-speech"
                SpeechRecognizer.ERROR_SERVER -> "network"
                SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "network"
                SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "language-not-supported"
                SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED -> "language-not-supported"
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "speech-timeout"
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
                SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "too-many-requests"
                else -> "unknown"
            }

        val message: String =
            when (errorCode) {
                SpeechRecognizer.ERROR_AUDIO -> "Audio recording error."
                SpeechRecognizer.ERROR_CLIENT -> "Other client side errors."
                SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Insufficient permissions"
                SpeechRecognizer.ERROR_NETWORK -> "Other network related errors."
                SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network operation timed out."
                SpeechRecognizer.ERROR_NO_MATCH -> "No speech was detected."
                SpeechRecognizer.ERROR_SERVER -> "Server sent error status."
                SpeechRecognizer.ERROR_SERVER_DISCONNECTED -> "Server disconnected."
                SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE -> "Requested language is supported, but not yet downloaded."
                SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED ->
                    "Requested language is not available to be used with the current recognizer."
                SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "RecognitionService busy."
                SpeechRecognizer.ERROR_TOO_MANY_REQUESTS -> "Too many requests from the same client."
                SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input."
                else -> "Unknown error"
            }

        return SpeechRecognitionErrorInfo(error, message)
    }
}
