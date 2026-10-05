// Native side of src/services/phone.ts. Android 7+.
// Copy into android/app/src/main/java/<your package>/ and register before super.onCreate():
// registerPlugin(CarPhonePlugin::class.java)
// AndroidManifest.xml, inside <manifest>:
// <uses-permission android:name="android.permission.CALL_PHONE" />
// <uses-permission android:name="android.permission.READ_PHONE_STATE" />
// <uses-permission android:name="android.permission.ANSWER_PHONE_CALLS" /> <!-- Android 8+ -->
// Inside <application>:
// <service android:name=".CarInCallService" android:permission="android.permission.BIND_INCALL_SERVICE"
//   android:exported="true">
//   <meta-data android:name="android.telecom.IN_CALL_SERVICE_UI" android:value="true" />
//   <intent-filter><action android:name="android.telecom.InCallService" /></intent-filter>
// </service>
// The user must select this app as the default Phone app for answering and ending calls.
package app.smartautolauncher

import android.Manifest
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import android.telecom.TelecomManager
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission

class CarInCallService : InCallService() {
    companion object {
        var instance: CarInCallService? = null
        var currentCall: Call? = null
        var onChanged: (() -> Unit)? = null
    }

    private val callback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) { onChanged?.invoke() }
        override fun onDetailsChanged(call: Call, details: Call.Details) { onChanged?.invoke() }
    }

    override fun onCreate() { super.onCreate(); instance = this }
    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        currentCall?.unregisterCallback(callback)
        currentCall = call
        call.registerCallback(callback)
        onChanged?.invoke()
    }
    override fun onCallRemoved(call: Call) {
        call.unregisterCallback(callback)
        if (currentCall === call) currentCall = null
        onChanged?.invoke()
        super.onCallRemoved(call)
    }
    override fun onDestroy() {
        currentCall?.unregisterCallback(callback)
        currentCall = null
        instance = null
        super.onDestroy()
    }
}

@CapacitorPlugin(
    name = "CarPhone",
    permissions = [
        Permission(alias = "call", strings = [Manifest.permission.CALL_PHONE]),
        Permission(alias = "phone", strings = [Manifest.permission.READ_PHONE_STATE])
    ]
)
class CarPhonePlugin : Plugin() {
    private val audio by lazy { context.getSystemService(Context.AUDIO_SERVICE) as AudioManager }

    override fun load() {
        CarInCallService.onChanged = { notifyListeners("callStateChanged", state()) }
    }

    private fun isDefaultDialer(): Boolean {
        val telecom = context.getSystemService(Context.TELECOM_SERVICE) as TelecomManager
        return telecom.defaultDialerPackage == context.packageName
    }

    private fun status(call: Call?): String = when (call?.state) {
        Call.STATE_RINGING -> "ringing"
        Call.STATE_DIALING, Call.STATE_CONNECTING, Call.STATE_SELECT_PHONE_ACCOUNT -> "dialing"
        Call.STATE_ACTIVE, Call.STATE_HOLDING -> "active"
        else -> "idle"
    }

    private fun state(): JSObject {
        val call = CarInCallService.currentCall
        return JSObject().apply {
            put("available", true)
            put("isDefaultDialer", isDefaultDialer())
            put("status", status(call))
            put("number", call?.details?.handle?.schemeSpecificPart ?: "")
            put("speakerOn", audio.isSpeakerphoneOn)
        }
    }

    @PluginMethod fun getState(call: PluginCall) = call.resolve(state())

    @PluginMethod fun requestDefaultDialer(call: PluginCall) {
        val intent = if (Build.VERSION.SDK_INT >= 29) {
            val role = context.getSystemService(RoleManager::class.java)
            if (role.isRoleAvailable(RoleManager.ROLE_DIALER) && !role.isRoleHeld(RoleManager.ROLE_DIALER))
                role.createRequestRoleIntent(RoleManager.ROLE_DIALER) else null
        } else {
            Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                .putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, context.packageName)
        }
        if (intent == null) return call.resolve(JSObject().put("requested", false))
        startActivityForResult(call, intent, "defaultDialerResult")
    }

    @com.getcapacitor.annotation.ActivityCallback
    private fun defaultDialerResult(call: PluginCall?, result: ActivityResult) {
        call?.resolve(JSObject().put("requested", isDefaultDialer()))
    }

    @PluginMethod fun call(call: PluginCall) {
        val number = call.getString("number")?.filter { it.isDigit() || it in "+*#" }
        if (number.isNullOrBlank()) return call.reject("Número inválido")
        if (getPermissionState("call") != PermissionState.GRANTED) {
            requestPermissionForAlias("call", call, "callPermission")
            return
        }
        startCall(number, call)
    }

    @com.getcapacitor.annotation.PermissionCallback
    private fun callPermission(call: PluginCall) {
        if (getPermissionState("call") != PermissionState.GRANTED) return call.reject("Permissão de chamada negada")
        val number = call.getString("number") ?: return call.reject("Número inválido")
        startCall(number, call)
    }

    private fun startCall(number: String, call: PluginCall) {
        context.startActivity(Intent(Intent.ACTION_CALL, Uri.parse("tel:${Uri.encode(number)}")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        call.resolve()
    }

    @PluginMethod fun answer(call: PluginCall) {
        val active = CarInCallService.currentCall ?: return call.reject("Nenhuma chamada")
        active.answer(0)
        call.resolve()
    }

    @PluginMethod fun reject(call: PluginCall) {
        val active = CarInCallService.currentCall ?: return call.reject("Nenhuma chamada")
        active.reject(false, null)
        call.resolve()
    }

    @PluginMethod fun hangUp(call: PluginCall) {
        val active = CarInCallService.currentCall ?: return call.reject("Nenhuma chamada")
        active.disconnect()
        call.resolve()
    }

    @PluginMethod fun setSpeaker(call: PluginCall) {
        val enabled = call.getBoolean("enabled") ?: false
        val service = CarInCallService.instance
        if (service != null) {
            val preferredRoute = if (enabled) CallAudioState.ROUTE_SPEAKER else CallAudioState.ROUTE_BLUETOOTH
            val supportedRoutes = service.callAudioState?.supportedRouteMask ?: 0
            val route = if (supportedRoutes and preferredRoute != 0) preferredRoute else CallAudioState.ROUTE_EARPIECE
            service.setAudioRoute(route)
        } else {
            audio.mode = AudioManager.MODE_IN_COMMUNICATION
            @Suppress("DEPRECATION")
            audio.isSpeakerphoneOn = enabled
        }
        call.resolve(JSObject().put("speakerOn", enabled))
        notifyListeners("callStateChanged", state())
    }

    override fun handleOnDestroy() {
        CarInCallService.onChanged = null
        super.handleOnDestroy()
    }
}