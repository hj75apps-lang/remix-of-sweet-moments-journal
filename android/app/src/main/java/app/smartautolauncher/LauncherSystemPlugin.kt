package app.smartautolauncher

import android.Manifest
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioManager
import android.net.Uri
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Looper
import android.os.Build
import android.app.role.RoleManager
import android.app.ActivityOptions
import android.graphics.Rect
import android.provider.CallLog
import android.provider.ContactsContract
import android.provider.Settings
import android.view.KeyEvent
import android.view.WindowManager
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
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
        Permission(alias = "location", strings = [Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION]),
    ],
)
class LauncherSystemPlugin : Plugin() {
    private var immersive = false
    private var wantsLocation = false
    private val locationManager by lazy { context.getSystemService(Context.LOCATION_SERVICE) as LocationManager }
    private val locationListener = object : LocationListener {
        override fun onLocationChanged(location: Location) {
            notifyListeners("locationChanged", JSObject().put("position", JSObject().apply {
                put("latitude", location.latitude); put("longitude", location.longitude)
                put("heading", if (location.hasBearing()) location.bearing else org.json.JSONObject.NULL)
                put("speed", if (location.hasSpeed()) location.speed else org.json.JSONObject.NULL)
                put("accuracy", location.accuracy); put("timestamp", location.time)
            }))
        }
        override fun onProviderDisabled(provider: String) { notifyListeners("locationChanged", JSObject().put("unavailable", true)) }
        override fun onProviderEnabled(provider: String) { if (wantsLocation) subscribeLocation() }
        @Suppress("DEPRECATION")
        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
    }

    private fun prefs() = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun audio() = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    override fun load() {
        applyWindow(prefs().getBoolean(KEY_IMMERSIVE, false), prefs().getBoolean(KEY_SCREEN_ON, false))
    }

    override fun handleOnResume() {
        if (immersive) applyWindow(true, prefs().getBoolean(KEY_SCREEN_ON, true))
        if (wantsLocation) subscribeLocation()
        notifyListeners("resumed", JSObject())
    }

    override fun handleOnPause() {
        locationManager.removeUpdates(locationListener)
        super.handleOnPause()
    }

    override fun handleOnDestroy() {
        wantsLocation = false
        locationManager.removeUpdates(locationListener)
        super.handleOnDestroy()
    }

    @PluginMethod
    fun startLocation(call: PluginCall) {
        wantsLocation = true
        if (getPermissionState("location") != PermissionState.GRANTED) {
            return requestPermissionForAlias("location", call, "locationCallback")
        }
        subscribeLocation()
        call.resolve()
    }

    @PermissionCallback
    private fun locationCallback(call: PluginCall) {
        // A permission dialog may finish after the last GPS consumer has left.
        if (!wantsLocation) { call.resolve(); return }
        if (ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED ||
            ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            subscribeLocation(); call.resolve()
        } else call.reject("permission_denied")
    }

    @PluginMethod
    fun stopLocation(call: PluginCall) {
        wantsLocation = false
        locationManager.removeUpdates(locationListener)
        call.resolve()
    }

    @Suppress("MissingPermission")
    private fun subscribeLocation() {
        if (!wantsLocation) return
        try {
            locationManager.removeUpdates(locationListener)
            val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER).filter { locationManager.allProviders.contains(it) }
            providers.forEach { provider ->
                locationManager.getLastKnownLocation(provider)?.let { locationListener.onLocationChanged(it) }
                if (locationManager.isProviderEnabled(provider)) {
                    locationManager.requestLocationUpdates(provider, 1000L, 2f, locationListener, Looper.getMainLooper())
                }
            }
            if (providers.none { locationManager.isProviderEnabled(it) }) notifyListeners("locationChanged", JSObject().put("unavailable", true))
        } catch (_: SecurityException) { notifyListeners("locationChanged", JSObject().put("unavailable", true)) }
    }

    private fun applyWindow(fullscreen: Boolean, keepOn: Boolean) {
        immersive = fullscreen
        val act = activity ?: return
        act.runOnUiThread {
            val w = act.window
            if (keepOn) w.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else w.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

            // Only enter immersive mode when the user explicitly enables it.
            // Otherwise leave Android's system bars and insets under system control.
            WindowCompat.setDecorFitsSystemWindows(w, !fullscreen)
            val controller = WindowInsetsControllerCompat(w, w.decorView)
            if (fullscreen) {
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
                controller.hide(WindowInsetsCompat.Type.systemBars())
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
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
        val im = call.getBoolean("immersive", false) ?: false
        val on = call.getBoolean("keepScreenOn", false) ?: false
        val boot = call.getBoolean("autostart", false) ?: false
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
    fun requestDefaultHome(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return openHomeSettings(call)
        val roles = context.getSystemService(RoleManager::class.java)
        if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_HOME)) {
            call.resolve(JSObject().put("supported", false).put("isDefaultHome", isDefaultHome()))
            return
        }
        if (roles.isRoleHeld(RoleManager.ROLE_HOME)) {
            call.resolve(JSObject().put("supported", true).put("isDefaultHome", true))
            return
        }
        try {
            activity?.startActivity(roles.createRequestRoleIntent(RoleManager.ROLE_HOME))
            call.resolve(JSObject().put("supported", true).put("requested", true).put("isDefaultHome", false))
        } catch (_: Exception) {
            openHomeSettings(call)
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
    fun getNavigationApps(call: PluginCall) {
        val pm = context.packageManager
        val list = JSArray()
        val packages = LinkedHashSet<String>()
        @Suppress("DEPRECATION")
        val handlers = pm.queryIntentActivities(Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=")), PackageManager.MATCH_DEFAULT_ONLY)
        handlers.forEach { packages.add(it.activityInfo.packageName) }
        listOf(MAPS, WAZE).filter { installed(it) }.forEach { packages.add(it) }
        packages.filter { it != context.packageName }.forEach { pkg ->
            runCatching {
                val info = pm.getApplicationInfo(pkg, 0)
                if (info.enabled) list.put(JSObject().put("packageName", pkg).put("label", pm.getApplicationLabel(info).toString()))
            }
        }
        call.resolve(JSObject().put("apps", list))
    }

    @PluginMethod
    fun resumeNavigation(call: PluginCall) {
        val pkg = call.getString("packageName") ?: return call.reject("not_installed")
        val launch = context.packageManager.getLaunchIntentForPackage(pkg) ?: return call.reject("not_installed")
        launch.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        start(launch, call)
    }

    /** Public freeform request only. Never substitute split screen or a normal launch. */
    @PluginMethod
    fun openNavigationWindow(call: PluginCall) {
        val act = activity ?: return call.reject("window_unavailable")
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N ||
            !context.packageManager.hasSystemFeature(PackageManager.FEATURE_FREEFORM_WINDOW_MANAGEMENT) ||
            act.isInMultiWindowMode) return call.reject("window_unsupported")
        val app = call.getString("app") ?: return call.reject("not_installed")
        val pkg = when (app) {
            "maps" -> MAPS
            "waze" -> WAZE
            else -> if (app.startsWith("package:")) app.removePrefix("package:") else return call.reject("window_choose_app")
        }
        if (pkg == context.packageName) return call.reject("not_installed")
        val mainLaunch = context.packageManager.getLaunchIntentForPackage(pkg) ?: return call.reject("not_installed")
        val destination = call.getString("destination")?.trim().orEmpty().take(200)
        val q = Uri.encode(destination)
        val launch = if (destination.isEmpty()) mainLaunch else {
            val uri = when (app) {
                "waze" -> "https://waze.com/ul?q=$q&navigate=yes"
                "maps" -> "https://www.google.com/maps/dir/?api=1&destination=$q&travelmode=driving&dir_action=navigate"
                else -> "geo:0,0?q=$q"
            }
            Intent(Intent.ACTION_VIEW, Uri.parse(uri)).setPackage(pkg)
        }
        val bounds = call.getObject("bounds") ?: return call.reject("window_invalid_bounds")
        val left = bounds.optDouble("left", Double.NaN)
        val top = bounds.optDouble("top", Double.NaN)
        val right = bounds.optDouble("right", Double.NaN)
        val bottom = bounds.optDouble("bottom", Double.NaN)
        if (!listOf(left, top, right, bottom).all { it.isFinite() } || left < 0 || top < 0 || right <= left || bottom <= top) {
            return call.reject("window_invalid_bounds")
        }
        act.runOnUiThread {
            val web = bridge.webView
            // WebView scale already includes the CSS-to-device density factor.
            @Suppress("DEPRECATION")
            val scale = web.scale
            val origin = IntArray(2)
            web.getLocationOnScreen(origin)
            val rect = Rect(origin[0] + (left * scale).toInt(), origin[1] + (top * scale).toInt(),
                origin[0] + (right * scale).toInt(), origin[1] + (bottom * scale).toInt())
            if (rect.width() <= 0 || rect.height() <= 0 || right * scale > web.width + 1 || bottom * scale > web.height + 1) {
                call.reject("window_invalid_bounds")
                return@runOnUiThread
            }
            try {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                val options = ActivityOptions.makeBasic().setLaunchBounds(rect)
                act.startActivity(launch, options.toBundle())
                // Android may ignore launchBounds. Do not claim verified embedding.
                call.resolve(JSObject().put("requested", true))
            } catch (_: ActivityNotFoundException) { call.reject("not_installed")
            } catch (_: SecurityException) { call.reject("window_unsupported") }
        }
    }

    @PluginMethod
    fun navigate(call: PluginCall) {
        val app = call.getString("app") ?: "maps"
        val dest = call.getString("destination")?.trim().orEmpty().take(200)
        val launchUrl = call.getString("launchUrl")?.trim().orEmpty()
        if (dest.isEmpty() && app != "system") {
            val pkg = when (app) { "maps" -> MAPS; "waze" -> WAZE; else -> app.removePrefix("package:") }
            val launch = context.packageManager.getLaunchIntentForPackage(pkg) ?: return call.reject("not_installed")
            launch.addFlags(Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
            start(launch, call)
            return
        }
        val q = Uri.encode(dest)
        val intent = if (launchUrl.isNotEmpty() && (app == "maps" || app == "waze")) {
            val packageName = if (app == "maps") MAPS else WAZE
            if (!installed(packageName)) return call.reject("not_installed")
            Intent(Intent.ACTION_VIEW, Uri.parse(launchUrl)).setPackage(packageName).apply {
                putExtra(Intent.EXTRA_REFERRER_NAME, "android-app://${context.packageName}")
            }
        } else when (app) {
            "waze" -> {
                if (!installed(WAZE)) return call.reject("not_installed")
                Intent(Intent.ACTION_VIEW, Uri.parse(if (dest.isEmpty()) "https://waze.com/ul?navigate=yes" else "https://waze.com/ul?q=$q&navigate=yes")).setPackage(WAZE)
            }
            "maps" -> {
                if (!installed(MAPS)) return call.reject("not_installed")
                Intent(Intent.ACTION_VIEW, Uri.parse(if (dest.isEmpty()) "https://www.google.com/maps/@?api=1&map_action=map" else "https://www.google.com/maps/dir/?api=1&destination=$q&travelmode=driving&dir_action=navigate")).setPackage(MAPS)
            }
            "system" -> Intent.createChooser(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=$q&travelmode=driving&dir_action=navigate")), "Navegar com…")
            else -> {
                if (!app.startsWith("package:")) return call.reject("not_installed")
                val pkg = app.removePrefix("package:")
                if (!installed(pkg)) return call.reject("not_installed")
                Intent(Intent.ACTION_VIEW, Uri.parse("geo:0,0?q=$q")).setPackage(pkg)
            }
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
