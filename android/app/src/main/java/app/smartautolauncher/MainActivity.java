package app.smartautolauncher;

import android.os.Bundle;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(CarPhonePlugin.class);
        registerPlugin(LauncherAppsPlugin.class);
        registerPlugin(NowPlayingPlugin.class);
        registerPlugin(SystemControlsPlugin.class);
        registerPlugin(VoiceControlPlugin.class);
        registerPlugin(LauncherSystemPlugin.class);
        registerPlugin(RadioNetworkPlugin.class);
        super.onCreate(savedInstanceState);

        // Android 15+ enforces edge-to-edge for apps targeting modern SDKs.
        // Keep launcher content clear of whatever system bars the head unit exposes.
        ViewCompat.setOnApplyWindowInsetsListener(getBridge().getWebView(), (view, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return insets;
        });
        ViewCompat.requestApplyInsets(getBridge().getWebView());

        // Async playlist/site resolution must not consume the user's playback gesture.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
