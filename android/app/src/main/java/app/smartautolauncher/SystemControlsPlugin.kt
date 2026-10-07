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
import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
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
import com.getcapacitor.PermissionState
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(
    name = "SystemControls",
    permissions = [Permission(alias = "nearby", strings = [android.Manifest.permission.BLUETOOTH_CONNECT])],
)
class SystemControlsPlugin : Plugin() {
    private var receiver: BroadcastReceiver? = null
    private var car: Car? = null
    private var carPropertyManager: CarPropertyManager? = null
    @Volatile private var vehicleHeadlightsOn: Boolean? = null

    private val carPropertyCallback = object : CarPropertyManager.CarPropertyEventCallback {
        override fun onChangeEvent(value: CarPropertyValue<*>) {
            if (value.propertyId == VehiclePropertyIds.HEADLIGHTS_STATE && value.areaId == 0) {
                val on = (value.value as? Int) == 1
                vehicleHeadlightsOn = on
                notifyListeners("stateChanged", state())
            }
        }

        override fun onErrorEvent(propertyId: Int, areaId: Int) {
            if (propertyId == VehiclePropertyIds.HEADLIGHTS_STATE && areaId == 0) {
                notifyListeners("stateChanged", state())
            }
        }
    }

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
        startVehicleLightMonitor()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(receiver, f, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("DEPRECATION")
            context.registerReceiver(receiver, f)
        }
    }

    override fun handleOnDestroy() {
        receiver?.let { runCatching { context.unregisterReceiver(it) } }
        runCatching { carPropertyManager?.unregisterCallback(carPropertyCallback) }
        runCatching { car?.disconnect() }
        carPropertyManager = null
        car = null
        super.handleOnDestroy()
    }

    private fun startVehicleLightMonitor() {
        if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_AUTOMOTIVE)) return
        Thread {
            try {
                val connectedCar = Car.createCar(context)
                val manager = connectedCar?.getCarManager(Car.PROPERTY_SERVICE) as? CarPropertyManager
                    ?: return@Thread
                car = connectedCar
                carPropertyManager = manager

                // HEADLIGHTS_STATE is the authoritative exterior-light signal.
                // VehicleLightState.STATE_ON is 1; daytime-running lights do not trigger night mode.
                val registered = manager.registerCallback(
                    carPropertyCallback,
                    VehiclePropertyIds.HEADLIGHTS_STATE,
                    CarPropertyManager.SENSOR_RATE_ONCHANGE,
                )
                if (!registered) {
                    vehicleHeadlightsOn = null
                }
            } catch (_: SecurityException) {
                // The property is signature/privileged on AAOS. If this APK is not
                // installed with the OEM/system privilege, retain the Android night-mode fallback.
                vehicleHeadlightsOn = null
            } catch (_: Exception) {
                vehicleHeadlightsOn = null
            }
        }.start()
    }

    private fun adapter(): BluetoothAdapter? =
        (context.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager)?.adapter

    @Suppress("DEPRECATION", "MissingPermission", "WrongConstant")
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
            put(
                "nightMode",
                vehicleHeadlightsOn ?: ((context.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES),
            )
            put("nightModeSource", when {
                vehicleHeadlightsOn != null -> "vehicle-headlights"
                else -> "android-system"
            })
        }
    }

    @PluginMethod fun getState(call: PluginCall) = call.resolve(state())

    @PluginMethod fun openWifi(call: PluginCall) {
        val action = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) Settings.Panel.ACTION_WIFI else Settings.ACTION_WIFI_SETTINGS
        activity.startActivity(Intent(action)); call.resolve()
    }

    @PluginMethod fun toggleBluetooth(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            getPermissionState("nearby") != PermissionState.GRANTED) {
            requestPermissionForAlias("nearby", call, "nearbyPermission")
            return
        }
        openBluetoothPanel(call)
    }

    @PermissionCallback
    private fun nearbyPermission(call: PluginCall) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S ||
            getPermissionState("nearby") == PermissionState.GRANTED) {
            openBluetoothPanel(call)
        } else {
            call.reject("permission_denied")
        }
    }

    private fun openBluetoothPanel(call: PluginCall) {
        val bt = adapter()
        val on = try { bt?.isEnabled == true } catch (_: SecurityException) { false }
        // Off → system dialog asks to turn on; On → Bluetooth settings to pair, connect or turn off.
        try {
            activity.startActivity(
                Intent(if (on) Settings.ACTION_BLUETOOTH_SETTINGS else BluetoothAdapter.ACTION_REQUEST_ENABLE)
            )
            call.resolve()
        } catch (_: SecurityException) {
            call.reject("permission_denied")
        }
    }

    @PluginMethod fun openBluetoothSettings(call: PluginCall) {
        try {
            activity.startActivity(Intent(Settings.ACTION_BLUETOOTH_SETTINGS))
            call.resolve()
        } catch (_: SecurityException) {
            call.reject("permission_denied")
        }
    }
}
