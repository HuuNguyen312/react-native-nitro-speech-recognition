package com.margelo.nitro.speechrecognition

import android.Manifest.permission.RECORD_AUDIO
import android.annotation.SuppressLint
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.provider.Settings
import android.speech.ModelDownloadListener
import android.speech.RecognitionService
import android.speech.RecognitionSupport
import android.speech.RecognitionSupportCallback
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Log
import androidx.annotation.RequiresApi
import androidx.core.content.ContextCompat
import com.margelo.nitro.core.Promise
import com.margelo.nitro.NitroModules
import com.speechrecognition.InternalAudioSourceOptions
import com.speechrecognition.InternalRecordingOptions
import com.speechrecognition.InternalSpeechRecognitionOptions
import com.speechrecognition.InternalVolumeChangeEventOptions
import com.speechrecognition.RecognitionState
import com.speechrecognition.SpeechService
import org.json.JSONObject
import java.util.concurrent.Executors

private const val TAG = "HybridSpeechRecognition"

class HybridSpeechRecognition : HybridSpeechRecognitionSpec() {

    // Listener callbacks stored as nullable lambdas
    private var resultListener: ((SpeechRecognitionResultEvent) -> Unit)? = null
    private var errorListener: ((SpeechRecognitionErrorEvent) -> Unit)? = null
    private var startListener: (() -> Unit)? = null
    private var endListener: (() -> Unit)? = null
    private var speechStartListener: (() -> Unit)? = null
    private var speechEndListener: (() -> Unit)? = null
    private var audioStartListener: ((AudioUriEvent) -> Unit)? = null
    private var audioEndListener: ((AudioUriEvent) -> Unit)? = null
    private var soundStartListener: (() -> Unit)? = null
    private var soundEndListener: (() -> Unit)? = null
    private var noMatchListener: (() -> Unit)? = null
    private var languageDetectionListener: ((LanguageDetectionEvent) -> Unit)? = null
    private var volumeChangeListener: ((VolumeChangeEvent) -> Unit)? = null

    private val context: Context
        get() = NitroModules.applicationContext
            ?: throw IllegalStateException("NitroModules.applicationContext is null. Make sure NitroModules is initialized.")

    private val speechService by lazy {
        SpeechService(context) { name, body ->
            try {
                dispatchEvent(name, body)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to send event: $name", e)
            }
        }
    }

    override val memorySize: Long
        get() = 0L

    /**
     * Dispatches events from SpeechService to the appropriate typed Nitro callbacks.
     */
    @Suppress("UNCHECKED_CAST")
    private fun dispatchEvent(name: String, body: Map<String, Any?>?) {
        when (name) {
            "result" -> {
                val results = body?.get("results") as? List<Map<String, Any>> ?: return
                val isFinal = body["isFinal"] as? Boolean ?: false
                val payloads = results.map { result ->
                    val transcript = result["transcript"] as? String ?: ""
                    val confidence = (result["confidence"] as? Number)?.toDouble() ?: 0.0
                    val segmentsRaw = result["segments"] as? List<Map<String, Any>> ?: listOf()
                    val segments = segmentsRaw.map { seg ->
                        SpeechRecognitionResultSegment(
                            startTimeMillis = (seg["startTimeMillis"] as? Number)?.toDouble() ?: 0.0,
                            endTimeMillis = (seg["endTimeMillis"] as? Number)?.toDouble() ?: 0.0,
                            segment = seg["segment"] as? String ?: "",
                            confidence = (seg["confidence"] as? Number)?.toDouble() ?: 0.0,
                        )
                    }.toTypedArray()
                    SpeechRecognitionResultPayload(
                        transcript = transcript,
                        confidence = confidence,
                        segments = segments,
                    )
                }.toTypedArray()
                resultListener?.invoke(
                    SpeechRecognitionResultEvent(
                        isFinal = isFinal,
                        results = payloads,
                    )
                )
            }
            "error" -> {
                val error = body?.get("error") as? String ?: "unknown"
                val message = body?.get("message") as? String ?: "Unknown error"
                val code = (body?.get("code") as? Number)?.toDouble() ?: -1.0
                errorListener?.invoke(
                    SpeechRecognitionErrorEvent(
                        error = error,
                        message = message,
                        code = code,
                    )
                )
            }
            "start" -> {
                startListener?.invoke()
            }
            "end" -> {
                endListener?.invoke()
            }
            "speechstart" -> {
                speechStartListener?.invoke()
            }
            "speechend" -> {
                speechEndListener?.invoke()
            }
            "audiostart" -> {
                val uri = body?.get("uri") as? String
                audioStartListener?.invoke(AudioUriEvent(uri = uri))
            }
            "audioend" -> {
                val uri = body?.get("uri") as? String
                audioEndListener?.invoke(AudioUriEvent(uri = uri))
            }
            "soundstart" -> {
                soundStartListener?.invoke()
            }
            "soundend" -> {
                soundEndListener?.invoke()
            }
            "nomatch" -> {
                noMatchListener?.invoke()
            }
            "languagedetection" -> {
                val detectedLanguage = body?.get("detectedLanguage") as? String ?: ""
                val confidence = (body?.get("confidence") as? Number)?.toDouble() ?: 0.0
                val topLocaleAlternatives = (body?.get("topLocaleAlternatives") as? List<String>)?.toTypedArray() ?: arrayOf()
                languageDetectionListener?.invoke(
                    LanguageDetectionEvent(
                        detectedLanguage = detectedLanguage,
                        confidence = confidence,
                        topLocaleAlternatives = topLocaleAlternatives,
                    )
                )
            }
            "volumechange" -> {
                val value = (body?.get("value") as? Number)?.toDouble() ?: 0.0
                volumeChangeListener?.invoke(VolumeChangeEvent(value = value))
            }
        }
    }

    // --- Listener registration methods ---

    override fun addResultListener(callback: (event: SpeechRecognitionResultEvent) -> Unit) {
        resultListener = callback
    }

    override fun addErrorListener(callback: (event: SpeechRecognitionErrorEvent) -> Unit) {
        errorListener = callback
    }

    override fun addStartListener(callback: () -> Unit) {
        startListener = callback
    }

    override fun addEndListener(callback: () -> Unit) {
        endListener = callback
    }

    override fun addSpeechStartListener(callback: () -> Unit) {
        speechStartListener = callback
    }

    override fun addSpeechEndListener(callback: () -> Unit) {
        speechEndListener = callback
    }

    override fun addAudioStartListener(callback: (event: AudioUriEvent) -> Unit) {
        audioStartListener = callback
    }

    override fun addAudioEndListener(callback: (event: AudioUriEvent) -> Unit) {
        audioEndListener = callback
    }

    override fun addSoundStartListener(callback: () -> Unit) {
        soundStartListener = callback
    }

    override fun addSoundEndListener(callback: () -> Unit) {
        soundEndListener = callback
    }

    override fun addNoMatchListener(callback: () -> Unit) {
        noMatchListener = callback
    }

    override fun addLanguageDetectionListener(callback: (event: LanguageDetectionEvent) -> Unit) {
        languageDetectionListener = callback
    }

    override fun addVolumeChangeListener(callback: (event: VolumeChangeEvent) -> Unit) {
        volumeChangeListener = callback
    }

    override fun removeListeners() {
        resultListener = null
        errorListener = null
        startListener = null
        endListener = null
        speechStartListener = null
        speechEndListener = null
        audioStartListener = null
        audioEndListener = null
        soundStartListener = null
        soundEndListener = null
        noMatchListener = null
        languageDetectionListener = null
        volumeChangeListener = null
    }

    // --- Speech recognition methods ---

    override fun start(options: SpeechRecognitionOptions) {
        if (hasNotGrantedRecordPermissions()) {
            dispatchEvent("error", mapOf("error" to "not-allowed", "message" to "Missing RECORD_AUDIO permissions.", "code" to -1))
            dispatchEvent("end", null)
            return
        }
        speechService.start(convertOptions(options))
    }

    override fun stop() {
        speechService.stop()
    }

    override fun abort() {
        dispatchEvent("error", mapOf("error" to "aborted", "message" to "Speech recognition aborted.", "code" to -1))
        speechService.abort()
    }

    // --- Permission methods ---

    override fun requestPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
        // On Android, we can only check the current permission status from native.
        // The JS layer should use PermissionsAndroid.request() for actual requesting.
        return Promise.resolved(getMicAndSpeechPermissionResponse())
    }

    override fun getPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
        return Promise.resolved(getMicAndSpeechPermissionResponse())
    }

    override fun getMicrophonePermissionsAsync(): Promise<PermissionResponse> {
        return Promise.resolved(getMicPermissionResponse())
    }

    override fun requestMicrophonePermissionsAsync(): Promise<PermissionResponse> {
        return Promise.resolved(getMicPermissionResponse())
    }

    override fun getSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
        // Speech recognizer permissions are not applicable on Android; always granted.
        Log.w(TAG, "getSpeechRecognizerPermissionsAsync is not supported on Android. Returning a granted permission response.")
        return Promise.resolved(
            SpeechRecognitionPermissionResponse(
                status = "granted",
                granted = true,
                canAskAgain = false,
                expires = "never",
                restricted = false,
            )
        )
    }

    override fun requestSpeechRecognizerPermissionsAsync(): Promise<SpeechRecognitionPermissionResponse> {
        Log.w(TAG, "requestSpeechRecognizerPermissionsAsync is not supported on Android. Returning a granted permission response.")
        return Promise.resolved(
            SpeechRecognitionPermissionResponse(
                status = "granted",
                granted = true,
                canAskAgain = false,
                expires = "never",
                restricted = false,
            )
        )
    }

    // --- Query methods ---

    override fun getSupportedLocales(options: GetSupportedLocalesOptions): Promise<SupportedLocalesResult> {
        val ctx = context
        val servicePackage = options.androidRecognitionServicePackage

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return Promise.resolved(SupportedLocalesResult(locales = arrayOf(), installedLocales = arrayOf()))
        }

        if (servicePackage == null && !SpeechRecognizer.isOnDeviceRecognitionAvailable(ctx)) {
            return Promise.resolved(SupportedLocalesResult(locales = arrayOf(), installedLocales = arrayOf()))
        }

        if (servicePackage != null && !SpeechRecognizer.isRecognitionAvailable(ctx)) {
            return Promise.resolved(SupportedLocalesResult(locales = arrayOf(), installedLocales = arrayOf()))
        }

        var serviceComponent: ComponentName? = null
        try {
            if (servicePackage != null) {
                serviceComponent = SpeechService.findComponentNameByPackageName(ctx, servicePackage)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Couldn't resolve package: $servicePackage")
            return Promise.rejected(Error("Failed to retrieve recognition service package: ${e.message}"))
        }

        val promise = Promise<SupportedLocalesResult>()
        var didResolve = false

        // Speech Recognizer can only be ran on main thread
        Handler(ctx.mainLooper).post {
            val recognizer =
                if (serviceComponent != null) {
                    SpeechRecognizer.createSpeechRecognizer(ctx, serviceComponent)
                } else {
                    SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx)
                }

            val recognizerIntent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)

            recognizer?.checkRecognitionSupport(
                recognizerIntent,
                Executors.newSingleThreadExecutor(),
                @RequiresApi(Build.VERSION_CODES.TIRAMISU)
                object : RecognitionSupportCallback {
                    override fun onSupportResult(recognitionSupport: RecognitionSupport) {
                        // Seems to get called twice when using `createSpeechRecognizer()`
                        if (didResolve) return
                        didResolve = true
                        val installedLocales = recognitionSupport.installedOnDeviceLanguages
                        val locales =
                            recognitionSupport.supportedOnDeviceLanguages
                                .union(installedLocales)
                                .union(recognitionSupport.onlineLanguages)
                                .sorted()
                        promise.resolve(
                            SupportedLocalesResult(
                                locales = locales.toTypedArray(),
                                installedLocales = installedLocales.toTypedArray(),
                            )
                        )
                        recognizer.destroy()
                    }

                    override fun onError(error: Int) {
                        Log.e(TAG, "getSupportedLocales.onError() called with error code: $error")
                        // Workaround for when both onSupportResult and onError are called
                        Handler(ctx.mainLooper).postDelayed({
                            if (didResolve) return@postDelayed
                            promise.reject(Error("Failed to retrieve supported locales with error: $error"))
                        }, 50)
                        recognizer.destroy()
                    }
                },
            )
        }

        return promise
    }

    override fun getSpeechRecognitionServices(): Array<String> {
        val packageManager = context.packageManager
        val serviceNames = mutableListOf<String>()

        val services = packageManager.queryIntentServices(
            Intent(RecognitionService.SERVICE_INTERFACE),
            0,
        )

        for (service in services) {
            serviceNames.add(service.serviceInfo.packageName)
        }

        return serviceNames.toTypedArray()
    }

    override fun getDefaultRecognitionService(): ServiceResult {
        val defaultRecognitionService = getDefaultVoiceRecognitionService()?.packageName ?: ""
        return ServiceResult(packageName = defaultRecognitionService)
    }

    override fun getAssistantService(): ServiceResult {
        val assistantServicePackage = getDefaultAssistantService()?.packageName ?: ""
        return ServiceResult(packageName = assistantServicePackage)
    }

    override fun supportsOnDeviceRecognition(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            SpeechRecognizer.isOnDeviceRecognitionAvailable(context)
        } else {
            false
        }
    }

    override fun supportsRecording(): Boolean {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
    }

    override fun isRecognitionAvailable(): Boolean {
        return SpeechRecognizer.isRecognitionAvailable(context)
    }

    override fun getStateAsync(): Promise<String> {
        val state = when (speechService.recognitionState) {
            RecognitionState.INACTIVE -> "inactive"
            RecognitionState.STARTING -> "starting"
            RecognitionState.ACTIVE -> "recognizing"
            RecognitionState.STOPPING -> "stopping"
            else -> "inactive"
        }
        return Promise.resolved(state)
    }

    override fun androidTriggerOfflineModelDownload(options: TriggerOfflineModelDownloadOptions): Promise<OfflineModelDownloadResult> {
        if (isDownloadingModel) {
            return Promise.rejected(Error("An offline model download is already in progress."))
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return Promise.rejected(Error("Android version is too old to trigger offline model download."))
        }

        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
        intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, options.locale)

        val ctx = context

        // API 33 (Android 13) -- Trigger the model download but resolve immediately
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Handler(ctx.mainLooper).post {
                val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx)
                recognizer.triggerModelDownload(intent)
            }
            return Promise.resolved(
                OfflineModelDownloadResult(
                    status = "opened_dialog",
                    message = "Opened the model download dialog.",
                )
            )
        }

        // API 34+ (Android 14+) -- Trigger the model download and listen to the progress
        val promise = Promise<OfflineModelDownloadResult>()
        isDownloadingModel = true
        Handler(ctx.mainLooper).post {
            val recognizer = SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx)
            recognizer.triggerModelDownload(
                intent,
                Executors.newSingleThreadExecutor(),
                @SuppressLint("NewApi")
                object : ModelDownloadListener {
                    override fun onProgress(p0: Int) {
                        // Todo: let user know the progress
                    }

                    override fun onSuccess() {
                        promise.resolve(
                            OfflineModelDownloadResult(
                                status = "download_success",
                                message = "Offline model download completed successfully.",
                            )
                        )
                        isDownloadingModel = false
                        recognizer.destroy()
                    }

                    override fun onScheduled() {
                        promise.resolve(
                            OfflineModelDownloadResult(
                                status = "download_canceled",
                                message = "The offline model download was canceled.",
                            )
                        )
                    }

                    override fun onError(error: Int) {
                        Log.e(TAG, "Error downloading model with code: $error")
                        isDownloadingModel = false
                        promise.reject(Error("Failed to download offline model download with error: $error"))
                        recognizer.destroy()
                    }
                },
            )
        }

        return promise
    }

    // --- iOS no-op methods ---

    override fun setCategoryIOS(options: SetCategoryOptions) {
        // No-op on Android
    }

    override fun getAudioSessionCategoryAndOptionsIOS(): AudioSessionInfo {
        // Return dummy data, not applicable for Android
        return AudioSessionInfo(
            category = "playAndRecord",
            categoryOptions = arrayOf("defaultToSpeaker", "allowBluetooth"),
            mode = "measurement",
        )
    }

    override fun setAudioSessionActiveIOS(value: Boolean, notifyOthersOnDeactivation: Boolean) {
        // No-op on Android
    }

    // --- Private helpers ---

    private var isDownloadingModel = false

    private fun hasNotGrantedRecordPermissions(): Boolean {
        return ContextCompat.checkSelfPermission(context, RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED
    }

    private fun getMicPermissionResponse(): PermissionResponse {
        val granted = ContextCompat.checkSelfPermission(context, RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        return PermissionResponse(
            status = if (granted) "granted" else "denied",
            granted = granted,
            canAskAgain = !granted,
            expires = "never",
        )
    }

    private fun getMicAndSpeechPermissionResponse(): SpeechRecognitionPermissionResponse {
        val granted = ContextCompat.checkSelfPermission(context, RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED
        return SpeechRecognitionPermissionResponse(
            status = if (granted) "granted" else "denied",
            granted = granted,
            canAskAgain = !granted,
            expires = "never",
            restricted = false,
        )
    }

    @RequiresApi(Build.VERSION_CODES.CUPCAKE)
    private fun getDefaultAssistantService(): ComponentName? {
        val contentResolver = context.contentResolver ?: return null
        val defaultAssistant = Settings.Secure.getString(contentResolver, "assistant")
        if (defaultAssistant.isNullOrEmpty()) {
            return null
        }
        return ComponentName.unflattenFromString(defaultAssistant)
    }

    @RequiresApi(Build.VERSION_CODES.CUPCAKE)
    private fun getDefaultVoiceRecognitionService(): ComponentName? {
        val contentResolver = context.contentResolver ?: return null
        val defaultVoiceRecognitionService = Settings.Secure.getString(contentResolver, "voice_recognition_service")
        if (defaultVoiceRecognitionService.isNullOrEmpty()) {
            return null
        }
        return ComponentName.unflattenFromString(defaultVoiceRecognitionService)
    }

    /**
     * Converts Nitro-generated SpeechRecognitionOptions to the internal options used by SpeechService.
     */
    private fun convertOptions(nitroOptions: SpeechRecognitionOptions): InternalSpeechRecognitionOptions {
        // Parse androidIntentOptionsJson to Map<String, Any>
        val androidIntentOptions: Map<String, Any>? = nitroOptions.androidIntentOptionsJson?.let { json ->
            try {
                val jsonObj = JSONObject(json)
                val map = mutableMapOf<String, Any>()
                for (key in jsonObj.keys()) {
                    val value = jsonObj.get(key)
                    map[key] = value
                }
                map
            } catch (e: Exception) {
                Log.w(TAG, "Failed to parse androidIntentOptionsJson: ${e.message}")
                null
            }
        }

        return InternalSpeechRecognitionOptions(
            interimResults = nitroOptions.interimResults,
            lang = nitroOptions.lang,
            continuous = nitroOptions.continuous,
            maxAlternatives = nitroOptions.maxAlternatives.toInt(),
            contextualStrings = nitroOptions.contextualStrings?.toList(),
            requiresOnDeviceRecognition = nitroOptions.requiresOnDeviceRecognition,
            addsPunctuation = nitroOptions.addsPunctuation,
            androidIntentOptions = androidIntentOptions,
            androidRecognitionServicePackage = nitroOptions.androidRecognitionServicePackage,
            audioSource = nitroOptions.audioSource?.let { src ->
                InternalAudioSourceOptions(
                    uri = src.uri,
                    audioEncoding = src.audioEncoding?.toInt(),
                    sampleRate = src.sampleRate?.toInt(),
                    audioChannels = src.audioChannels?.toInt(),
                    chunkDelayMillis = src.chunkDelayMillis?.toLong(),
                )
            },
            recordingOptions = nitroOptions.recordingOptions?.let { rec ->
                InternalRecordingOptions(
                    persist = rec.persist,
                    outputDirectory = rec.outputDirectory,
                    outputFileName = rec.outputFileName,
                    outputSampleRate = rec.outputSampleRate?.toInt(),
                    outputEncoding = rec.outputEncoding,
                )
            },
            androidIntent = nitroOptions.androidIntent,
            iosTaskHint = nitroOptions.iosTaskHint,
            volumeChangeEventOptions = nitroOptions.volumeChangeEventOptions?.let { vol ->
                InternalVolumeChangeEventOptions(
                    enabled = vol.enabled,
                    intervalMillis = vol.intervalMillis.toInt(),
                )
            },
            iosVoiceProcessingEnabled = nitroOptions.iosVoiceProcessingEnabled,
        )
    }
}
