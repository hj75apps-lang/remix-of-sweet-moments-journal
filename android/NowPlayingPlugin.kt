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

class MediaListener : NotificationListenerService()

@CapacitorPlugin(name = "NowPlaying")
class NowPlayingPlugin : Plugin() {
    private val msm by lazy { context.getSystemService(MediaSessionManager::class.java) }
    private val component by lazy { ComponentName(context, MediaListener::class.java) }
    private var active: MediaController? = null
    private var radioSession: MediaSession? = null
    private val cb = object : MediaController.Callback() {
        override fun onMetadataChanged(m: MediaMetadata?) = push()
        override fun onPlaybackStateChanged(s: PlaybackState?) = push()
    }

    private fun granted() = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?.contains(context.packageName) == true

    override fun load() {
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
        if (!granted()) return
        msm.addOnActiveSessionsChangedListener({ pick(it) }, component)
        pick(msm.getActiveSessions(component))
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
        active?.unregisterCallback(cb)
        val external = list?.filter { it.packageName != context.packageName }
        active = external?.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING } ?: external?.firstOrNull()
        active?.registerCallback(cb)
        push()
    }

    private fun media(): JSObject? {
        val c = active ?: return null
        val m = c.metadata
        val pm = context.packageManager
        val app = runCatching { pm.getApplicationLabel(pm.getApplicationInfo(c.packageName, 0)).toString() }.getOrDefault(c.packageName)
        val art: Bitmap? = m?.getBitmap(MediaMetadata.METADATA_KEY_ALBUM_ART) ?: m?.getBitmap(MediaMetadata.METADATA_KEY_ART)
        val artUri = m?.getString(MediaMetadata.METADATA_KEY_ALBUM_ART_URI) ?: m?.getString(MediaMetadata.METADATA_KEY_ART_URI)
        val artwork = when {
            art != null -> ByteArrayOutputStream().let { art.compress(Bitmap.CompressFormat.JPEG, 85, it); "data:image/jpeg;base64," + Base64.encodeToString(it.toByteArray(), Base64.NO_WRAP) }
            artUri?.startsWith("http") == true -> artUri
            else -> ""
        }
        return JSObject().apply {
            put("title", m?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: m?.getString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE) ?: "")
            put("artist", m?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: m?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST) ?: "")
            put("album", m?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: "")
            put("sourceName", app); put("packageName", c.packageName)
            put("artwork", artwork)
            put("playing", c.playbackState?.state == PlaybackState.STATE_PLAYING)
            put("duration", m?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L)
            put("position", c.playbackState?.position ?: 0L)
            put("kind", "app")
        }
    }

    private fun push() = notifyListeners("mediaChanged", JSObject().put("media", media()))

    @PluginMethod fun getCurrent(call: PluginCall) = call.resolve(JSObject().put("media", media()))
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
        val t = active?.transportControls ?: return call.reject("Nada tocando")
        when (call.getString("action")) { "play" -> t.play(); "pause" -> t.pause(); "next" -> t.skipToNext(); "previous" -> t.skipToPrevious() }
        call.resolve()
    }

    override fun handleOnDestroy() {
        active?.unregisterCallback(cb)
        radioSession?.release()
        radioSession = null
        super.handleOnDestroy()
    }
}
