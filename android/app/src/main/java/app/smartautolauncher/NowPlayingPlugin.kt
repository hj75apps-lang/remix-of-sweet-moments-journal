// Native side of src/services/now-playing.ts: reads the active media session of ANY app
// (Spotify, Chrome, YouTube Music, USB/local players…) and controls it.
// Setup:
//  1. Copy this file into android/app/src/main/java/<your package>/.
//  2. MainActivity: registerPlugin(NowPlayingPlugin::class.java) before super.onCreate().
//  3. AndroidManifest.xml, inside <application>:
//     <service android:name=".MediaListener" android:exported="false"
//         android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
//       <intent-filter><action android:name="android.service.notification.NotificationListenerService"/></intent-filter>
//     </service>
//  4. On first use the user grants "Acesso a notificações" (requestPermission opens that screen).
package app.smartautolauncher

import android.content.ComponentName
import android.content.Intent
import android.graphics.Bitmap
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.view.KeyEvent
import android.provider.Settings
import android.service.notification.NotificationListenerService
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream

/**
 * Notification access is also how Android Auto-style dashboards read turn-by-turn guidance:
 * Google Maps and Waze post an ongoing notification with the next maneuver while navigating.
 */
class MediaListener : NotificationListenerService() {
    override fun onListenerConnected() {
        try { activeNotifications?.forEach { onNotificationPosted(it) } } catch (_: Exception) {}
    }

    override fun onNotificationPosted(sbn: android.service.notification.StatusBarNotification) {
        if (sbn.packageName !in NAV_PACKAGES) return
        val n = sbn.notification ?: return
        if (n.flags and android.app.Notification.FLAG_ONGOING_EVENT == 0) return
        val e = n.extras
        val icon = (e.get(android.app.Notification.EXTRA_LARGE_ICON) as? android.graphics.Bitmap)?.let { bmp ->
            val out = ByteArrayOutputStream()
            android.graphics.Bitmap.createScaledBitmap(bmp, 96, 96, true).compress(android.graphics.Bitmap.CompressFormat.PNG, 100, out)
            "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
        } ?: ""
        guidance = JSObject()
            .put("packageName", sbn.packageName)
            .put("title", e.getCharSequence(android.app.Notification.EXTRA_TITLE)?.toString() ?: "")
            .put("text", e.getCharSequence(android.app.Notification.EXTRA_TEXT)?.toString() ?: "")
            .put("subText", e.getCharSequence(android.app.Notification.EXTRA_SUB_TEXT)?.toString() ?: "")
            .put("icon", icon)
        onGuidance?.invoke(guidance)
    }

    override fun onNotificationRemoved(sbn: android.service.notification.StatusBarNotification) {
        if (sbn.packageName !in NAV_PACKAGES || guidance?.getString("packageName") != sbn.packageName) return
        guidance = null
        onGuidance?.invoke(null)
    }

    companion object {
        val NAV_PACKAGES = setOf("com.google.android.apps.maps", "com.waze", "com.here.app.maps", "com.sygic.aura")
        @Volatile var guidance: JSObject? = null
        @Volatile var onGuidance: ((JSObject?) -> Unit)? = null
    }
}

@CapacitorPlugin(name = "NowPlaying")
class NowPlayingPlugin : Plugin() {
    private val msm by lazy { context.getSystemService(MediaSessionManager::class.java) }
    private val component by lazy { ComponentName(context, MediaListener::class.java) }
    private var active: MediaController? = null
    private var radioSession: MediaSession? = null
    private var sessionsListener: MediaSessionManager.OnActiveSessionsChangedListener? = null
    private var controllers: List<MediaController> = emptyList()
    private val handler = Handler(Looper.getMainLooper())
    private val cb = object : MediaController.Callback() {
        override fun onMetadataChanged(m: MediaMetadata?) = selectAndPush()
        override fun onPlaybackStateChanged(s: PlaybackState?) = selectAndPush()
        override fun onSessionDestroyed() = refreshSessions()
    }

    private fun granted() = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?.contains(context.packageName) == true

    override fun load() {
        MediaListener.onGuidance = { g -> notifyListeners("navigationChanged", JSObject().put("guidance", g)) }
        radioSession = MediaSession(context, "SmartAutoRadio").apply {
            setFlags(MediaSession.FLAG_HANDLES_MEDIA_BUTTONS or MediaSession.FLAG_HANDLES_TRANSPORT_CONTROLS)
            setCallback(object : MediaSession.Callback() {
                override fun onPlay() = steering("play")
                override fun onPause() = steering("pause")
                override fun onSkipToNext() = steering("next")
                override fun onSkipToPrevious() = steering("previous")

                override fun onMediaButtonEvent(intent: Intent): Boolean {
                    val event = intent.getParcelableExtra<KeyEvent>(Intent.EXTRA_KEY_EVENT) ?: return false
                    if (event.action != KeyEvent.ACTION_DOWN) return true
                    val action = when (event.keyCode) {
                        KeyEvent.KEYCODE_MEDIA_PLAY -> "play"
                        KeyEvent.KEYCODE_MEDIA_PAUSE -> "pause"
                        KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE, KeyEvent.KEYCODE_HEADSETHOOK -> "toggle"
                        KeyEvent.KEYCODE_MEDIA_NEXT -> "next"
                        KeyEvent.KEYCODE_MEDIA_PREVIOUS -> "previous"
                        else -> return super.onMediaButtonEvent(intent)
                    }
                    steering(action)
                    return true
                }
            })
        }
        refreshSessions()
    }

    private fun refreshSessions() {
        if (!granted()) {
            sessionsListener?.let { runCatching { msm.removeOnActiveSessionsChangedListener(it) } }
            sessionsListener = null
            pick(emptyList())
            return
        }
        runCatching {
            if (sessionsListener == null) {
                val listener = MediaSessionManager.OnActiveSessionsChangedListener { pick(it) }
                msm.addOnActiveSessionsChangedListener(listener, component, handler)
                sessionsListener = listener
            }
            pick(msm.getActiveSessions(component))
        }
    }

    override fun handleOnResume() {
        super.handleOnResume()
        refreshSessions()
    }

    private fun steering(action: String) =
        notifyListeners("steeringControl", JSObject().put("action", action))

    private fun radioState(playing: Boolean) = PlaybackState.Builder()
        .setActions(
            PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
                PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_SKIP_TO_NEXT or
                PlaybackState.ACTION_SKIP_TO_PREVIOUS
        )
        .setState(
            if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED,
            PlaybackState.PLAYBACK_POSITION_UNKNOWN,
            if (playing) 1f else 0f
        )
        .build()

    private fun pick(list: List<MediaController>?) {
        val external = list.orEmpty().filter { it.packageName != context.packageName }
        controllers.filter { old -> external.none { it.sessionToken == old.sessionToken } }
            .forEach { it.unregisterCallback(cb) }
        external.filter { next -> controllers.none { it.sessionToken == next.sessionToken } }
            .forEach { it.registerCallback(cb, handler) }
        controllers = external
        selectAndPush()
    }

    private fun selectAndPush() {
        active = controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
            ?: controllers.firstOrNull { it.sessionToken == active?.sessionToken }
            ?: controllers.firstOrNull()
        push()
    }

    private fun media(): JSObject? {
        val c = active ?: return null
        val m = c.metadata
        val pm = context.packageManager
        val app = runCatching { pm.getApplicationLabel(pm.getApplicationInfo(c.packageName, 0)).toString() }.getOrDefault(c.packageName)
        val art: Bitmap? = m?.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART) ?: m?.getBitmap(MediaMetadata.METADATA_KEY_ART) ?: m?.getBitmap(MediaMetadata.METADATA_KEY_DISPLAY_ICON)
        val artUri = m?.getString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI) ?: m?.getString(MediaMetadata.METADATA_KEY_ART_URI) ?: m?.getString(MediaMetadata.METADATA_KEY_DISPLAY_ICON_URI)
        val artwork = when {
            art != null -> ByteArrayOutputStream().let {
                val scale = minOf(1f, 512f / maxOf(art.width, art.height))
                val thumbnail = Bitmap.createScaledBitmap(art, maxOf(1, (art.width * scale).toInt()), maxOf(1, (art.height * scale).toInt()), true)
                thumbnail.compress(Bitmap.CompressFormat.JPEG, 85, it)
                "data:image/jpeg;base64," + Base64.encodeToString(it.toByteArray(), Base64.NO_WRAP)
            }
            artUri?.startsWith("https://") == true || artUri?.startsWith("http://") == true -> artUri
            else -> ""
        }
        val state = c.playbackState
        val duration = m?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L
        val elapsed = if (state?.state == PlaybackState.STATE_PLAYING && state.lastPositionUpdateTime > 0)
            ((SystemClock.elapsedRealtime() - state.lastPositionUpdateTime) * state.playbackSpeed).toLong() else 0L
        val position = maxOf(0L, (state?.position ?: 0L) + elapsed)
        return JSObject().apply {
            put("title", m?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: m?.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE) ?: "")
            put("artist", m?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: m?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST) ?: m?.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE) ?: "")
            put("album", m?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: "")
            put("sourceName", app); put("packageName", c.packageName)
            put("artwork", artwork)
            put("playing", c.playbackState?.state == PlaybackState.STATE_PLAYING)
            put("duration", duration)
            put("position", if (duration > 0) minOf(duration, position) else position)
            put("kind", "app")
        }
    }

    private fun push() = notifyListeners("mediaChanged", JSObject().put("media", media()))

    @PluginMethod fun getNavigation(call: PluginCall) =
        call.resolve(JSObject().put("guidance", MediaListener.guidance))

    @PluginMethod fun getCurrent(call: PluginCall) {
        activity.runOnUiThread {
            refreshSessions()
            call.resolve(JSObject().put("media", media()))
        }
    }
    @PluginMethod fun hasPermission(call: PluginCall) = call.resolve(JSObject().put("granted", granted()))
    @PluginMethod fun requestPermission(call: PluginCall) {
        context.startActivity(Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); call.resolve()
    }
    @PluginMethod fun updateRadioSession(call: PluginCall) {
        val title = call.getString("title") ?: ""
        if (title.isBlank()) {
            radioSession?.isActive = false
            return call.resolve()
        }
        val playing = call.getBoolean("playing") ?: false
        radioSession?.setMetadata(MediaMetadata.Builder()
            .putString(MediaMetadata.METADATA_KEY_TITLE, title)
            .putString(MediaMetadata.METADATA_KEY_ARTIST, call.getString("artist") ?: "Rádio ao vivo")
            .putString(MediaMetadata.METADATA_KEY_ALBUM, "Smart Auto Launcher")
            .build())
        radioSession?.setPlaybackState(radioState(playing))
        radioSession?.isActive = true
        call.resolve()
    }
    @PluginMethod fun control(call: PluginCall) {
        val targetPackage = call.getString("packageName")
        val target = if (targetPackage.isNullOrBlank()) active else controllers.firstOrNull { it.packageName == targetPackage }
        val t = target?.transportControls ?: return call.reject("Player indisponível")
        when (call.getString("action")) { "play" -> t.play(); "pause" -> t.pause(); "next" -> t.skipToNext(); "previous" -> t.skipToPrevious() }
        call.resolve()
    }

    override fun handleOnDestroy() {
        MediaListener.onGuidance = null
        controllers.forEach { it.unregisterCallback(cb) }
        controllers = emptyList()
        sessionsListener?.let { runCatching { msm.removeOnActiveSessionsChangedListener(it) } }
        sessionsListener = null
        radioSession?.release()
        radioSession = null
        super.handleOnDestroy()
    }
}
