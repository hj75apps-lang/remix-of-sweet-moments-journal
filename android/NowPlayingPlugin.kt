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
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
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
    private val cb = object : MediaController.Callback() {
        override fun onMetadataChanged(m: MediaMetadata?) = push()
        override fun onPlaybackStateChanged(s: PlaybackState?) = push()
    }

    private fun granted() = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        ?.contains(context.packageName) == true

    override fun load() {
        if (!granted()) return
        msm.addOnActiveSessionsChangedListener({ pick(it) }, component)
        pick(msm.getActiveSessions(component))
    }

    private fun pick(list: List<MediaController>?) {
        active?.unregisterCallback(cb)
        active = list?.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING } ?: list?.firstOrNull()
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
    @PluginMethod fun control(call: PluginCall) {
        val t = active?.transportControls ?: return call.reject("Nada tocando")
        when (call.getString("action")) { "play" -> t.play(); "pause" -> t.pause(); "next" -> t.skipToNext(); "previous" -> t.skipToPrevious() }
        call.resolve()
    }
}
