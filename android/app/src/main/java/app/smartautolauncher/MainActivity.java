package app.smartautolauncher;

import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.widget.FrameLayout;
import android.widget.ImageView;

import androidx.core.graphics.Insets;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        SplashScreen.installSplashScreen(this);
        registerPlugin(CarPhonePlugin.class);
        registerPlugin(LauncherAppsPlugin.class);
        registerPlugin(NowPlayingPlugin.class);
        registerPlugin(SystemControlsPlugin.class);
        registerPlugin(VoiceControlPlugin.class);
        registerPlugin(LauncherSystemPlugin.class);
        registerPlugin(RadioNetworkPlugin.class);
        super.onCreate(savedInstanceState);

        showFirstOpening();

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

    private void showFirstOpening() {
        FirstLaunchState opening = new FirstLaunchState(getNoBackupFilesDir());
        if (!opening.shouldShow()) return;

        FrameLayout cover = new FrameLayout(this);
        cover.setBackgroundColor(getResources().getColor(R.color.launch_background, getTheme()));
        cover.setClickable(true);
        cover.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_YES);
        cover.setContentDescription("HJCar");

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.hjcar_opening);
        logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
        logo.setImportantForAccessibility(View.IMPORTANT_FOR_ACCESSIBILITY_NO);
        int inset = Math.round(32 * getResources().getDisplayMetrics().density);
        logo.setPadding(inset, inset, inset, inset);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT, Gravity.CENTER
        );
        cover.addView(logo, logoParams);
        addContentView(cover, new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT
        ));

        // Consume only after the artwork reaches its first frame, never on resume or navigation.
        cover.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                cover.getViewTreeObserver().removeOnPreDrawListener(this);
                opening.markShown();
                cover.postDelayed(() -> {
                    if (cover.getParent() instanceof ViewGroup) {
                        ((ViewGroup) cover.getParent()).removeView(cover);
                    }
                }, 1800);
                return true;
            }
        });
    }
}
