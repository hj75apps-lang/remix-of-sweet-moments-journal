// Native side of src/services/connectivity.ts (Wi-Fi / Bluetooth quick controls).
// Copy into android/app/src/main/java/<your package>/ after `npx cap add android`,
// and register in MainActivity: registerPlugin(SystemControlsPlugin::class.java) before super.onCreate().
// AndroidManifest.xml needs:
//   <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
//   <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
//   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>   (Wi-Fi network name)
//   <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30"/>
//   <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>       (Android 12+)
// Note: since Android 10, apps cannot switch Wi-Fi on/off themselves; openWifi() shows the system panel.
package app.smartautolauncher

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.bluetooth.BluetoothProfile
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.res.Configuration
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "SystemControls")
class SystemControlsPlugin : Plugin() {
    private var receiver: BroadcastReceiver? = null

    override fun load() {
        receiver = object : BroadcastReceiver() {
            override fun onReceive(c: Context, i: Intent) { notifyListeners("stateChanged", state()) }
        }
        val f = IntentFilter().apply {
            addAction(WifiManager.WIFI_STATE_CHANGED_ACTION)
            addAction(WifiManager.NETWORK_STATE_CHANGED_ACTION)
            addAction(BluetoothAdapter.ACTION_STATE_CHANGED)
            addAction(BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED)
            addAction(Intent.ACTION_CONFIGURATION_CHANGED)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            context.registerReceiver(receiver, f)
        }
    }

    override fun handleOnDestroy() { receiver?.let { context.unregisterReceiver(it) } }

    private fun adapter(): BluetoothAdapter? =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    @Suppress("DEPRECATION", "MissingPermission")
    private fun state(): JSObject {
        val wifi = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
        val ssid = try { wifi.connectionInfo?.ssid?.trim('"')?.takeIf { it != "<unknown ssid>" } ?: "" } catch (_: Exception) { "" }
        val bt = adapter()
        var device = ""
        try {
            if (bt?.isEnabled == true && bt.getProfileConnectionState(BluetoothProfile.A2DP) == BluetoothProfile.STATE_CONNECTED) {
                device = bt.bondedDevices.firstOrNull()?.name ?: ""
            }
        } catch (_: SecurityException) { }
        return JSObject().apply {
            put("wifiEnabled", wifi.isWifiEnabled)
            put("wifiName", ssid)
            put("bluetoothEnabled", try { bt?.isEnabled == true } catch (_: SecurityException) { false })
            put("bluetoothDevice", device)
            put("nightMode", (context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES)
        }
    }

    @PluginMethod fun getState(call: PluginCall) = call.resolve(state())

    @PluginMethod fun openWifi(call: PluginCall) {
        val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) Settings.Panel.ACTION_WIFI else Settings.ACTION_WIFI_SETTINGS
        activity.startActivity(Intent(action)); call.resolve()
    }

    @PluginMethod fun toggleBluetooth(call: PluginCall) {
        val bt = adapter()
        val on = try { bt?.isEnabled == true } catch (_: SecurityException) { false }
        // Off → system dialog asks to turn on; On → Bluetooth settings to pair, connect or turn off.
        activity.startActivity(Intent(if (on) Settings.ACTION_BLUETOOTH_SETTINGS else BluetoothAdapter.ACTION_REQUEST_ENABLE))
        call.resolve()
    }

    @PluginMethod fun openBluetoothSettings(call: PluginCall) {
        activity.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS)); call.resolve()
    }
}
