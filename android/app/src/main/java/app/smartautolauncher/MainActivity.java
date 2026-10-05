package app.smartautolauncher;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(CarPhonePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
