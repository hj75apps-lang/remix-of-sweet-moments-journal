// Native side of src/services/installed-apps.ts.
// Copy into android/app/src/main/java/<your package>/ after `npx cap add android`,
// and register in MainActivity: registerPlugin(LauncherAppsPlugin::class.java) before super.onCreate().
// AndroidManifest.xml needs, inside <manifest>:
//   <queries><intent><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent></queries>
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
