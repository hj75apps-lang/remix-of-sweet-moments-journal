// Native side of src/services/installed-apps.ts.
// Copy into android/app/src/main/java/<your package>/ after `npx cap add android`,
// and register in MainActivity: registerPlugin(LauncherAppsPlugin::class.java) before super.onCreate().
// AndroidManifest.xml needs, inside <manifest>:
//   <queries><intent><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent></queries>
//   <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS" tools:ignore="ProtectedPermissions"/>
// and, to act as the car's home screen, on MainActivity's <intent-filter>:
//   <category android:name="android.intent.category.HOME"/><category android:name="android.intent.category.DEFAULT"/>
package app.smartautolauncher

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.provider.Settings
import android.util.Base64
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream

@CapacitorPlugin(name = "LauncherApps")
class LauncherAppsPlugin : Plugin() {
    private var receiver: BroadcastReceiver? = null

    override fun load() {
        receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) = notifyListeners("appsChanged", JSObject())
        }
        val f = IntentFilter().apply {
            addAction(Intent.ACTION_PACKAGE_ADDED); addAction(Intent.ACTION_PACKAGE_REMOVED)
            addAction(Intent.ACTION_PACKAGE_CHANGED); addAction(Intent.ACTION_PACKAGE_REPLACED)
            addDataScheme("package")
        }
        context.registerReceiver(receiver, f)
    }

    override fun handleOnDestroy() { receiver?.let { context.unregisterReceiver(it) } }

    override fun handleOnResume() {
        super.handleOnResume()
        notifyListeners("recentAppsChanged", JSObject())
    }

    private fun iconObject(packageName: String): JSObject? {
        val pm = context.packageManager
        val launchIntent = pm.getLaunchIntentForPackage(packageName) ?: return null
        val info = launchIntent.resolveActivity(pm)?.let { pm.getActivityInfo(it, 0) } ?: return null
        if (info.packageName == context.packageName) return null
        val drawable = info.loadIcon(pm)
        val bitmap = Bitmap.createBitmap(144, 144, Bitmap.Config.ARGB_8888)
        drawable.setBounds(0, 0, 144, 144)
        drawable.draw(Canvas(bitmap))
        val output = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, output)
        return JSObject().apply {
            put("packageName", info.packageName)
            put("label", info.loadLabel(pm).toString())
            put("icon", Base64.encodeToString(output.toByteArray(), Base64.NO_WRAP))
        }
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        Thread {
            val pm = context.packageManager
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
            val out = JSArray()
            pm.queryIntentActivities(intent, 0)
                .filter { it.activityInfo.packageName != context.packageName }
                .distinctBy { it.activityInfo.packageName }
                .forEach { ri ->
                    val d = ri.loadIcon(pm)
                    val bmp = Bitmap.createBitmap(144, 144, Bitmap.Config.ARGB_8888)
                    d.setBounds(0, 0, 144, 144); d.draw(Canvas(bmp))
                    val bos = ByteArrayOutputStream(); bmp.compress(Bitmap.CompressFormat.PNG, 100, bos)
                    out.put(JSObject().apply {
                        put("packageName", ri.activityInfo.packageName)
                        put("label", ri.loadLabel(pm).toString())
                        put("icon", Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP))
                    })
                }
            call.resolve(JSObject().put("apps", out))
        }.start()
    }

    @PluginMethod
    fun getRecentApps(call: PluginCall) {
        Thread {
            val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
            val end = System.currentTimeMillis()
            val events = usage.queryEvents(end - 24L * 60L * 60L * 1000L, end)
            val event = UsageEvents.Event()
            val lastUsed = linkedMapOf<String, Long>()
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                @Suppress("DEPRECATION")
                val foreground = event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                    (android.os.Build.VERSION.SDK_INT >= 29 && event.eventType == UsageEvents.Event.ACTIVITY_RESUMED)
                if (foreground && event.packageName != context.packageName) {
                    lastUsed[event.packageName] = event.timeStamp
                }
            }
            val out = JSArray()
            lastUsed.entries.sortedByDescending { it.value }.take(4).forEach { entry ->
                runCatching { iconObject(entry.key) }.getOrNull()?.let { out.put(it) }
            }
            call.resolve(JSObject().put("apps", out))
        }.start()
    }

    @PluginMethod
    fun hasUsageAccess(call: PluginCall) {
        val usage = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val allowed = usage.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, end - 60_000L, end).isNotEmpty()
        call.resolve(JSObject().put("granted", allowed))
    }

    @PluginMethod
    fun requestUsageAccess(call: PluginCall) {
        context.startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        call.resolve()
    }

    @PluginMethod
    fun openPhone(call: PluginCall) {
        context.startActivity(Intent(Intent.ACTION_DIAL).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        call.resolve()
    }

    @PluginMethod
    fun launch(call: PluginCall) {
        val pkg = call.getString("packageName") ?: return call.reject("packageName obrigatório")
        val i = context.packageManager.getLaunchIntentForPackage(pkg) ?: return call.reject("App não encontrado")
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(i); call.resolve()
    }

    @PluginMethod
    fun openAppInfo(call: PluginCall) {
        val pkg = call.getString("packageName") ?: return call.reject("packageName obrigatório")
        context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        call.resolve()
    }
}
