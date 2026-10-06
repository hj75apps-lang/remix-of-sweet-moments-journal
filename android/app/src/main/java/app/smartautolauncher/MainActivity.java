package app.smartautolauncher;

import android.os.Bundle;

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
        // Async playlist/site resolution must not consume the user's playback gesture.
        getBridge().getWebView().getSettings().setMediaPlaybackRequiresUserGesture(false);
    }
}
