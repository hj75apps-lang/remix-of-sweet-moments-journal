package app.smartautolauncher;

import android.telecom.Call;
import android.telecom.InCallService;

public final class CarInCallService extends InCallService {
    private static CarInCallService instance;
    private static Call currentCall;
    private static Runnable stateListener;

    private final Call.Callback callback = new Call.Callback() {
        @Override public void onStateChanged(Call call, int state) { notifyStateChanged(); }
        @Override public void onDetailsChanged(Call call, Call.Details details) { notifyStateChanged(); }
    };

    public static CarInCallService getInstance() { return instance; }
    public static Call getCurrentCall() { return currentCall; }
    public static void setStateListener(Runnable listener) { stateListener = listener; }
    private static void notifyStateChanged() { if (stateListener != null) stateListener.run(); }

    @Override public void onCreate() { super.onCreate(); instance = this; }

    @Override public void onCallAdded(Call call) {
        super.onCallAdded(call);
        if (currentCall != null) currentCall.unregisterCallback(callback);
        currentCall = call;
        call.registerCallback(callback);
        notifyStateChanged();
    }

    @Override public void onCallRemoved(Call call) {
        call.unregisterCallback(callback);
        if (currentCall == call) currentCall = null;
        notifyStateChanged();
        super.onCallRemoved(call);
    }

    @Override public void onDestroy() {
        if (currentCall != null) currentCall.unregisterCallback(callback);
        currentCall = null;
        instance = null;
        super.onDestroy();
    }
}