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
        super.onCreate(savedInstanceState);
    }
}
