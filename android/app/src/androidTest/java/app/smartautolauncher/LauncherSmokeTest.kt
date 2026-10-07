package app.smartautolauncher

import android.content.Intent
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class LauncherSmokeTest {
    @Test
    fun packageAndHomeIntentAreAvailable() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("app.smartautolauncher", context.packageName)
        val homeIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        assertNotNull(context.packageManager.resolveActivity(homeIntent, 0))
    }
}
