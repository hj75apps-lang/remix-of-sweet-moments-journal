package app.smartautolauncher

import android.car.Car
import android.car.VehiclePropertyIds
import android.car.hardware.CarPropertyValue
import android.car.hardware.property.CarPropertyManager
import android.content.Context

/** Loaded only on AAOS after the optional android.car library is confirmed. */
class VehicleLightMonitor(context: Context, private val changed: (Boolean?) -> Unit) : AutoCloseable {
    private val lock = Any()
    @Volatile private var closed = false
    private var car: Car? = null
    private var manager: CarPropertyManager? = null
    private val callback = object : CarPropertyManager.CarPropertyEventCallback {
        override fun onChangeEvent(value: CarPropertyValue<*>) {
            if (!closed && value.propertyId == VehiclePropertyIds.HEADLIGHTS_STATE && value.areaId == 0) {
                changed((value.value as? Int)?.let { it == 1 })
            }
        }
        override fun onErrorEvent(propertyId: Int, areaId: Int) {
            if (!closed && propertyId == VehiclePropertyIds.HEADLIGHTS_STATE && areaId == 0) changed(null)
        }
    }

    init {
        Thread {
            var connected: Car? = null
            try {
                connected = Car.createCar(context)
                val properties = connected?.getCarManager(Car.PROPERTY_SERVICE) as? CarPropertyManager
                synchronized(lock) {
                    if (closed || properties == null) {
                        connected?.disconnect()
                    } else {
                        car = connected
                        manager = properties
                        if (!properties.registerCallback(callback, VehiclePropertyIds.HEADLIGHTS_STATE,
                                CarPropertyManager.SENSOR_RATE_ONCHANGE)) changed(null)
                    }
                }
            } catch (_: Exception) {
                runCatching { connected?.disconnect() }
                if (!closed) changed(null)
            } catch (_: LinkageError) {
                runCatching { connected?.disconnect() }
                if (!closed) changed(null)
            }
        }.start()
    }

    override fun close() {
        synchronized(lock) {
            closed = true
            runCatching { manager?.unregisterCallback(callback) }
            runCatching { car?.disconnect() }
            manager = null
            car = null
        }
    }
}
