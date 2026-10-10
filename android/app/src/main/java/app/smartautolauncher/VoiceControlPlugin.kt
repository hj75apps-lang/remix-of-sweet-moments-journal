package app.smartautolauncher

import android.Manifest
import android.content.Intent
import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "VoiceControl",
    permissions = [Permission(alias = "record", strings = [Manifest.permission.RECORD_AUDIO])],
)
class VoiceControlPlugin : Plugin() {
    private var recognizer: SpeechRecognizer? = null
    private var listening = false
    private var tts: TextToSpeech? = null
    private var ttsReady = false
    private var speechCall: PluginCall? = null
    private var utteranceId = 0L
    private var activeUtterance = ""
    private var destroyed = false
    private var pendingPermission: String? = null
    private val audio: AudioManager get() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    private val focus = AudioManager.OnAudioFocusChangeListener { change ->
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            activity.runOnUiThread { stopTts() }
        }
    }

    override fun load() {
        super.load()
        if (isActivation(activity.intent)) notifyListeners("voiceActivation", JSObject(), true)
    }
    private fun isActivation(intent: Intent?): Boolean = intent?.action == Intent.ACTION_VOICE_COMMAND || intent?.action == Intent.ACTION_ASSIST

    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", SpeechRecognizer.isRecognitionAvailable(context)))
    }

    @PluginMethod
    fun startListening(call: PluginCall) {
        if (getPermissionState("record") != com.getcapacitor.PermissionState.GRANTED) {
            pendingPermission = call.callbackId
            requestPermissionForAlias("record", call, "recordPermission")
            return
        }
        openRecognizer(call)
    }

    @PermissionCallback
    private fun recordPermission(call: PluginCall) {
        if (pendingPermission != call.callbackId || destroyed) { call.resolve(); return }
        pendingPermission = null
        if (getPermissionState("record") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permissão do microfone negada")
            return
        }
        openRecognizer(call)
    }

    private fun openRecognizer(call: PluginCall) {
        activity.runOnUiThread {
            if (destroyed || !SpeechRecognizer.isRecognitionAvailable(context)) {
                call.reject("Reconhecimento de voz indisponível neste Android")
                return@runOnUiThread
            }
            stopTts()
            stopRecognizer()
            try {
                val engine = SpeechRecognizer.createSpeechRecognizer(context)
                    ?: throw IllegalStateException("Speech recognizer unavailable")
                recognizer = engine
                engine.setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) { if (recognizer === engine) notifyState(true) }
                    override fun onBeginningOfSpeech() {}
                    override fun onRmsChanged(rmsdB: Float) {}
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    override fun onEndOfSpeech() { if (recognizer === engine) notifyState(false) }
                    override fun onError(error: Int) {
                        if (recognizer !== engine) return
                        listening = false
                        val message = when (error) {
                            SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Permissão do microfone negada ou revogada."
                            SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Reconhecimento indisponível sem conexão. O pacote de voz offline depende do Android."
                            SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "O microfone está ocupado por outro aplicativo."
                            SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "Não reconheci a fala. Tente um comando curto."
                            else -> "Não foi possível reconhecer a fala."
                        }
                        notifyListeners("voiceState", JSObject().put("listening", false).put("error", message))
                        stopRecognizer()
                    }
                    override fun onResults(results: Bundle?) {
                        if (recognizer !== engine || !listening) return
                        val transcript = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.trim().orEmpty()
                        listening = false
                        notifyState(false)
                        if (transcript.isNotEmpty()) notifyListeners("voiceResult", JSObject().put("transcript", transcript.take(500)))
                        else notifyListeners("voiceState", JSObject().put("listening", false).put("error", "Não reconheci a fala."))
                        stopRecognizer()
                    }
                    override fun onPartialResults(partialResults: Bundle?) {}
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
                val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
                    putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
                    putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true)
                    putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                }
                listening = true
                notifyState(true)
                engine.startListening(intent)
                call.resolve()
            } catch (_: Exception) {
                stopRecognizer()
                call.reject("Não foi possível ativar o reconhecimento de voz.")
            }
        }
    }

    private fun stopRecognizer() {
        val old = recognizer
        recognizer = null
        listening = false
        old?.cancel()
        old?.destroy()
        notifyState(false)
    }
    @PluginMethod
    fun stopListening(call: PluginCall) { pendingPermission = null; activity.runOnUiThread { stopRecognizer(); call.resolve() } }

    @PluginMethod
    fun openSystemAssistant(call: PluginCall) {
        activity.runOnUiThread {
            stopRecognizer(); stopTts()
            // Avoid resolveActivity choosing this launcher and starting a voice loop.
            val intent = listOf(Intent.ACTION_VOICE_COMMAND, Intent.ACTION_ASSIST).map { Intent(it) }.firstOrNull { candidate ->
                context.packageManager.queryIntentActivities(candidate, 0).any { it.activityInfo.packageName != context.packageName }
            }
            if (intent == null) { call.reject("Nenhum assistente compatível instalado ou configurado no Android."); return@runOnUiThread }
            val handler = intent.resolveActivity(context.packageManager)
            if (handler?.packageName == context.packageName) {
                val targets = context.packageManager.queryIntentActivities(intent, 0).filter { it.activityInfo.packageName != context.packageName }
                if (targets.size == 1) intent.setClassName(targets[0].activityInfo.packageName, targets[0].activityInfo.name)
                else { call.reject("Escolha outro assistente padrão nas configurações do Android."); return@runOnUiThread }
            }
            try { activity.startActivity(intent); call.resolve() }
            catch (_: Exception) { call.reject("O Android não permitiu abrir o assistente.") }
        }
    }

    @PluginMethod
    fun speak(call: PluginCall) {
        val text = call.getString("text")?.trim().orEmpty().take(400)
        if (text.isEmpty()) { call.reject("Resposta vazia."); return }
        activity.runOnUiThread {
            if (destroyed) { call.reject("Assistente encerrado."); return@runOnUiThread }
            stopTts()
            speechCall = call
            if (tts != null && ttsReady) { speakReady(text); return@runOnUiThread }
            if (tts != null) return@runOnUiThread
            tts = TextToSpeech(context) { status ->
                // Always post: constructor callback must not run before tts is assigned.
                activity.window.decorView.post {
                    if (destroyed) return@post
                    val engine = tts
                    val language = engine?.setLanguage(Locale("pt", "BR")) ?: TextToSpeech.LANG_NOT_SUPPORTED
                    ttsReady = status == TextToSpeech.SUCCESS && language >= TextToSpeech.LANG_AVAILABLE
                    if (!ttsReady) {
                        speechCall?.reject("Instale uma voz de português brasileiro nos ajustes de texto para fala do Android.")
                        speechCall = null
                        engine?.shutdown(); tts = null
                    } else {
                        engine?.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
                        engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                            override fun onStart(utterance: String?) { if (utterance == activeUtterance) notifyListeners("speechState", JSObject().put("speaking", true)) }
                            override fun onDone(utterance: String?) { activity.runOnUiThread { if (utterance == activeUtterance) stopTts() } }
                            override fun onStop(utterance: String?, interrupted: Boolean) { activity.runOnUiThread { if (utterance == activeUtterance) stopTts() } }
                            override fun onError(utterance: String?, errorCode: Int) { onError(utterance) }
                            @Deprecated("Legacy API callback")
                            override fun onError(utterance: String?) { activity.runOnUiThread {
                                if (utterance == activeUtterance) {
                                    speechCall?.reject("Não foi possível ler a resposta."); speechCall = null; stopTts()
                                    notifyListeners("speechState", JSObject().put("speaking", false).put("error", "Não foi possível ler a resposta."))
                                }
                            } }
                        })
                        val latest = speechCall?.getString("text")?.take(400)
                        if (latest != null) speakReady(latest)
                    }
                }
            }
        }
    }
    @Suppress("DEPRECATION")
    private fun speakReady(text: String) {
        if (audio.requestAudioFocus(focus, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK) != AudioManager.AUDIOFOCUS_REQUEST_GRANTED) {
            speechCall?.reject("Áudio ocupado; resposta disponível na tela."); speechCall = null; return
        }
        activeUtterance = "launcher-${++utteranceId}"
        if (tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, activeUtterance) != TextToSpeech.SUCCESS) {
            speechCall?.reject("Voz indisponível."); speechCall = null; stopTts()
        }
    }
    @Suppress("DEPRECATION")
    private fun stopTts() {
        activeUtterance = ""
        tts?.stop()
        audio.abandonAudioFocus(focus)
        speechCall?.resolve(); speechCall = null
        notifyListeners("speechState", JSObject().put("speaking", false))
    }
    @PluginMethod
    fun stopSpeaking(call: PluginCall) { activity.runOnUiThread { stopTts(); call.resolve() } }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        if (isActivation(intent)) notifyListeners("voiceActivation", JSObject(), true)
    }

    override fun handleOnPause() { super.handleOnPause(); pendingPermission = null; activity.runOnUiThread { stopRecognizer(); stopTts() } }
    override fun handleOnDestroy() {
        super.handleOnDestroy()
        destroyed = true
        activity.runOnUiThread { stopRecognizer(); stopTts(); tts?.shutdown(); tts = null; ttsReady = false }
    }

    private fun notifyState(listening: Boolean) {
        notifyListeners("voiceState", JSObject().put("listening", listening))
    }
}