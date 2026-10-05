// Native side of src/services/voice-command.ts.
// Copy into android/app/src/main/java/<your package>/ and register in MainActivity:
// registerPlugin(VoiceControlPlugin::class.java) before super.onCreate().
// AndroidManifest.xml needs:
// <uses-permission android:name="android.permission.RECORD_AUDIO" />
package app.smartautolauncher

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "VoiceControl",
    permissions = [Permission(alias = "record", strings = [Manifest.permission.RECORD_AUDIO])],
)
class VoiceControlPlugin : Plugin() {
    @PluginMethod
    fun isAvailable(call: PluginCall) {
        call.resolve(JSObject().put("available", SpeechRecognizer.isRecognitionAvailable(context)))
    }

    @PluginMethod
    fun startListening(call: PluginCall) {
        if (getPermissionState("record") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("record", call, "recordPermission")
            return
        }
        openRecognizer(call)
    }

    @PermissionCallback
    private fun recordPermission(call: PluginCall) {
        if (getPermissionState("record") != com.getcapacitor.PermissionState.GRANTED) {
            call.reject("Permissão do microfone negada")
            return
        }
        openRecognizer(call)
    }

    private fun openRecognizer(call: PluginCall) {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) {
            call.reject("Reconhecimento de voz indisponível")
            return
        }
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
            putExtra(RecognizerIntent.EXTRA_PROMPT, "Diga um comando")
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
        }
        notifyState(true)
        startActivityForResult(call, intent, "voiceResult")
    }

    @ActivityCallback
    private fun voiceResult(call: PluginCall?, result: ActivityResult) {
        notifyState(false)
        if (result.resultCode != Activity.RESULT_OK) {
            call?.resolve()
            return
        }
        val matches = result.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
        val transcript = matches?.firstOrNull()?.trim().orEmpty()
        if (transcript.isNotEmpty()) {
            notifyListeners("voiceResult", JSObject().put("transcript", transcript))
        }
        call?.resolve()
    }

    override fun handleOnNewIntent(intent: Intent) {
        super.handleOnNewIntent(intent)
        if (intent.action == Intent.ACTION_VOICE_COMMAND || intent.action == Intent.ACTION_ASSIST) {
            notifyListeners("voiceActivation", JSObject())
        }
    }

    private fun notifyState(listening: Boolean) {
        notifyListeners("voiceState", JSObject().put("listening", listening))
    }
}