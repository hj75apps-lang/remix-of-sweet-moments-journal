package app.smartautolauncher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Opens the launcher when the head unit finishes booting, unless the user disabled autostart. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED && action != "android.intent.action.QUICKBOOT_POWERON" &&
            action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        val prefs = context.getSharedPreferences(LauncherSystemPlugin.PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(LauncherSystemPlugin.KEY_AUTOSTART, false)) return
        val launch = Intent(context, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT)
        try { context.startActivity(launch) } catch (_: Exception) { /* background start blocked on newer Android */ }
    }
}
