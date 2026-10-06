package app.smartautolauncher

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.ContactsContract
import android.provider.Settings
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/** Launcher-level system integration: kiosk window, prefs read at boot, navigation intents, audio, contacts. */
@CapacitorPlugin(
    name = "LauncherSystem",
    permissions = [
        Permission(alias = "contacts", strings = [Manifest.permission.READ_CONTACTS]),
        Permission(alias = "callLog", strings = [Manifest.permission.READ_CALL_LOG]),
    ],
)
class LauncherSystemPlugin : Plugin() {
    private var immersive = false

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun audio() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    override fun load() {
        applyWindow(prefs().getBoolean(KEY_IMMERSIVE, true), prefs().getBoolean(KEY_SCREEN_ON, true))
    }

    override fun handleOnResume() {
        if (immersive) applyWindow(true, prefs().getBoolean(KEY_SCREEN_ON, true))
        notifyListeners("resumed", JSObject())
    }

    @Suppress("DEPRECATION")
    private fun applyWindow(fullscreen: Boolean, keepOn: Boolean) {
        immersive = fullscreen
        val act = activity ?: return
        act.runOnUiThread {
            val w = act.window
            if (keepOn) w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else w.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            w.decorView.systemUiVisibility = if (fullscreen) {
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN or
                    View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                    View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            } else View.SYSTEM_UI_FLAG_VISIBLE
        }
    }

    private fun isDefaultHome(): Boolean {
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        val r = context.packageManager.resolveActivity(i, PackageManager.MATCH_DEFAULT_ONLY)
        return r?.activityInfo?.packageName == context.packageName
    }

    private fun installed(pkg: String) = try {
        @Suppress("DEPRECATION") context.packageManager.getPackageInfo(pkg, 0); true
    } catch (e: PackageManager.NameNotFoundException) { false }

    @PluginMethod
    fun getInfo(call: PluginCall) {
        val pm = context.packageManager
        val a = audio()
        call.resolve(JSObject().apply {
            put("sdk", Build.VERSION.SDK_INT)
            put("manufacturer", Build.MANUFACTURER)
            put("model", Build.MODEL)
            put("isDefaultHome", isDefaultHome())
            put("hasTelephony", pm.hasSystemFeature(PackageManager.FEATURE_TELEPHONY))
            put("hasBluetooth", pm.hasSystemFeature(PackageManager.FEATURE_BLUETOOTH))
            put("hasGps", pm.hasSystemFeature(PackageManager.FEATURE_LOCATION_GPS))
            put("hasCamera", pm.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY))
            put("hasMicrophone", pm.hasSystemFeature(PackageManager.FEATURE_MICROPHONE))
            put("googleMaps", installed(MAPS))
            put("waze", installed(WAZE))
            put("volume", a.getStreamVolume(AudioManager.STREAM_MUSIC))
            put("maxVolume", a.getStreamMaxVolume(AudioManager.STREAM_MUSIC))
            put("muted", a.getStreamVolume(AudioManager.STREAM_MUSIC) == 0)
        })
    }

    /** Persists launcher prefs natively so the boot receiver and window can read them without the WebView. */
    @PluginMethod
    fun applyPrefs(call: PluginCall) {
        val im = call.getBoolean("immersive", true) ?: true
        val on = call.getBoolean("keepScreenOn", true) ?: true
        val boot = call.getBoolean("autostart", true) ?: true
        prefs().edit().putBoolean(KEY_IMMERSIVE, im).putBoolean(KEY_SCREEN_ON, on).putBoolean(KEY_AUTOSTART, boot).apply()
        applyWindow(im, on)
        call.resolve()
    }

    @PluginMethod
    fun setBrightness(call: PluginCall) {
        val v = (call.getDouble("value") ?: -1.0).toFloat()
        val act = activity ?: return call.reject("unavailable")
        act.runOnUiThread {
            val lp = act.window.attributes
            lp.screenBrightness = if (v < 0) WindowManager.LayoutParams.BRIGHTNESS_OVERRIDE_NONE else v.coerceIn(0.05f, 1f)
            act.window.attributes = lp
            call.resolve()
        }
    }

    @PluginMethod
    fun openHomeSettings(call: PluginCall) {
        start(Intent(Settings.ACTION_HOME_SETTINGS), call) ||
            start(Intent(Settings.ACTION_SETTINGS), call)
    }

    @PluginMethod
    fun openAppSettings(call: PluginCall) {
        start(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")), call)
    }

    @PluginMethod
    fun navigate(call: PluginCall) {
        val app = call.getString("app") ?: "maps"
        val dest = call.getString("destination")?.trim().orEmpty()
        val q = Uri.encode(dest)
        val intent = when (app) {
            "waze" -> {
                if (!installed(WAZE)) return call.reject("not_installed")
                Intent(Intent.ACTION_VIEW, Uri.parse(if (dest.isEmpty()) "waze://" else "waze://?q=$q&navigate=yes")).setPackage(WAZE)
            }
            "maps" -> {
                if (!installed(MAPS)) return call.reject("not_installed")
                Intent(Intent.ACTION_VIEW, Uri.parse(if (dest.isEmpty()) "geo:0,0" else "google.navigation:q=$q")).setPackage(MAPS)
            }
            else -> Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$q"))
        }
        start(intent, call)
    }

    @PluginMethod
    fun setVolume(call: PluginCall) {
        val a = audio()
        val max = a.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val level = ((call.getDouble("value") ?: 0.5) * max).toInt().coerceIn(0, max)
        a.setStreamVolume(AudioManager.STREAM_MUSIC, level, AudioManager.FLAG_SHOW_UI)
        call.resolve(JSObject().put("volume", level).put("maxVolume", max))
    }

    @PluginMethod
    fun toggleMute(call: PluginCall) {
        val a = audio()
        val dir = if (a.getStreamVolume(AudioManager.STREAM_MUSIC) == 0) AudioManager.ADJUST_UNMUTE else AudioManager.ADJUST_MUTE
        try {
            a.adjustStreamVolume(AudioManager.STREAM_MUSIC, dir, AudioManager.FLAG_SHOW_UI)
        } catch (e: SecurityException) { return call.reject("blocked") }
        call.resolve(JSObject().put("muted", dir == AudioManager.ADJUST_MUTE))
    }

    /** Fast-forward / rewind for the active external player, via the standard media keys. */
    @PluginMethod
    fun mediaKey(call: PluginCall) {
        val code = when (call.getString("key")) {
            "forward" -> KeyEvent.KEYCODE_MEDIA_FAST_FORWARD
            "rewind" -> KeyEvent.KEYCODE_MEDIA_REWIND
            "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
            "previous" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
            else -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
        }
        val a = audio()
        a.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, code))
        a.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, code))
        call.resolve()
    }

    @PluginMethod
    fun getContacts(call: PluginCall) {
        if (getPermissionState("contacts") != PermissionState.GRANTED) {
            return requestPermissionForAlias("contacts", call, "contactsCallback")
        }
        readContacts(call)
    }

    @PermissionCallback
    private fun contactsCallback(call: PluginCall) {
        if (getPermissionState("contacts") == PermissionState.GRANTED) readContacts(call) else call.reject("permission_denied")
    }

    private fun readContacts(call: PluginCall) {
        val list = JSArray()
        val proj = arrayOf(ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME, ContactsContract.CommonDataKinds.Phone.NUMBER)
        context.contentResolver.query(
            ContactsContract.CommonDataKinds.Phone.CONTENT_URI, proj, null, null,
            "${ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME} COLLATE NOCASE ASC",
        )?.use { c ->
            val seen = HashSet<String>()
            while (c.moveToNext() && list.length() < 500) {
                val name = c.getString(0) ?: continue
                val number = c.getString(1) ?: continue
                if (seen.add(number.filter { it.isDigit() || it == '+' })) list.put(JSObject().put("name", name).put("number", number))
            }
        }
        call.resolve(JSObject().put("contacts", list))
    }

    @PluginMethod
    fun getCallLog(call: PluginCall) {
        if (getPermissionState("callLog") != PermissionState.GRANTED) {
            return requestPermissionForAlias("callLog", call, "callLogCallback")
        }
        readCallLog(call)
    }

    @PermissionCallback
    private fun callLogCallback(call: PluginCall) {
        if (getPermissionState("callLog") == PermissionState.GRANTED) readCallLog(call) else call.reject("permission_denied")
    }

    private fun readCallLog(call: PluginCall) {
        val list = JSArray()
        val proj = arrayOf(CallLog.Calls.NUMBER, CallLog.Calls.CACHED_NAME, CallLog.Calls.TYPE, CallLog.Calls.DATE)
        context.contentResolver.query(CallLog.Calls.CONTENT_URI, proj, null, null, "${CallLog.Calls.DATE} DESC")?.use { c ->
            while (c.moveToNext() && list.length() < 50) {
                val type = when (c.getInt(2)) {
                    CallLog.Calls.INCOMING_TYPE -> "incoming"
                    CallLog.Calls.OUTGOING_TYPE -> "outgoing"
                    CallLog.Calls.MISSED_TYPE -> "missed"
                    else -> "other"
                }
                list.put(JSObject().put("number", c.getString(0) ?: "").put("name", c.getString(1) ?: "")
                    .put("type", type).put("date", c.getLong(3)))
            }
        }
        call.resolve(JSObject().put("calls", list))
    }

    private fun start(i: Intent, call: PluginCall): Boolean = try {
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(i)
        call.resolve(); true
    } catch (e: ActivityNotFoundException) {
        call.reject("not_installed"); false
    }

    companion object {
        const val PREFS = "launcher_system"
        const val KEY_IMMERSIVE = "immersive"
        const val KEY_SCREEN_ON = "keepScreenOn"
        const val KEY_AUTOSTART = "autostart"
        const val MAPS = "com.google.android.apps.maps"
        const val WAZE = "com.waze"
    }
}
