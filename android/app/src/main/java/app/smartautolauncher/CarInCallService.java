package app.smartautolauncher;

import android.telecom.Call;
import android.telecom.InCallService;
import android.telecom.CallAudioState;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.Manifest;
import android.content.pm.PackageManager;
import androidx.core.content.ContextCompat;
import androidx.core.app.NotificationCompat;
import java.util.ArrayList;
import java.util.List;

public final class CarInCallService extends InCallService {
    private static CarInCallService instance;
    private static final List<Call> calls = new ArrayList<>();
    private static volatile Runnable stateListener;
    private static final int CALL_NOTIFICATION = 1001;
    private static final String CALL_CHANNEL = "launcher-calls";

    private final Call.Callback callback = new Call.Callback() {
        @Override public void onStateChanged(Call call, int state) { notifyStateChanged(); }
        @Override public void onDetailsChanged(Call call, Call.Details details) { notifyStateChanged(); }
    };

    public static CarInCallService getInstance() { return instance; }
    public static Call getCurrentCall() {
        synchronized (calls) {
            // Call waiting must not make the original call disappear when the new call ends.
            for (int state : new int[] { Call.STATE_RINGING, Call.STATE_DIALING, 9, Call.STATE_SELECT_PHONE_ACCOUNT, Call.STATE_ACTIVE, Call.STATE_HOLDING }) {
                for (int i = calls.size() - 1; i >= 0; i--) if (calls.get(i).getState() == state) return calls.get(i);
            }
            return null;
        }
    }
    public static void setStateListener(Runnable listener) { stateListener = listener; }
    private static void notifyStateChanged() {
        if (instance != null) instance.updateCallNotification();
        if (stateListener != null) stateListener.run();
    }

    @Override public void onCreate() { super.onCreate(); instance = this; }

    @Override public void onCallAdded(Call call) {
        super.onCallAdded(call);
        synchronized (calls) { if (!calls.contains(call)) calls.add(call); }
        call.registerCallback(callback);
        notifyStateChanged();
    }

    @Override public void onCallRemoved(Call call) {
        call.unregisterCallback(callback);
        synchronized (calls) { calls.remove(call); }
        notifyStateChanged();
        super.onCallRemoved(call);
    }

    @Override public void onBringToForeground(boolean showDialpad) {
        super.onBringToForeground(showDialpad);
        try { startActivity(phoneIntent()); } catch (RuntimeException ignored) { updateCallNotification(); }
    }

    @SuppressWarnings("deprecation")
    @Override public void onCallAudioStateChanged(CallAudioState state) {
        super.onCallAudioStateChanged(state);
        notifyStateChanged();
    }

    private Intent phoneIntent() {
        return new Intent(this, MainActivity.class).setAction(Intent.ACTION_DIAL)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
    }

    private void updateCallNotification() {
        NotificationManager notifications = getSystemService(NotificationManager.class);
        if (notifications == null) return;
        Call call = getCurrentCall();
        if (call == null) { notifications.cancel(CALL_NOTIFICATION); return; }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(CALL_CHANNEL, "Chamadas", NotificationManager.IMPORTANCE_HIGH);
            // Telecom remains responsible for ringing; do not play a second ringtone.
            channel.setSound(null, null);
            notifications.createNotificationChannel(channel);
        }
        PendingIntent open = PendingIntent.getActivity(this, CALL_NOTIFICATION, phoneIntent(),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        boolean incoming = call.getState() == Call.STATE_RINGING;
        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CALL_CHANNEL)
            .setSmallIcon(android.R.drawable.sym_action_call)
            .setContentTitle(incoming ? "Chamada recebida" : "Chamada em andamento")
            .setContentText("Abra o telefone para controlar a chamada")
            .setContentIntent(open).setCategory(Notification.CATEGORY_CALL)
            .setPriority(NotificationCompat.PRIORITY_HIGH).setOngoing(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        if (incoming) builder.setFullScreenIntent(open, true);
        try { notifications.notify(CALL_NOTIFICATION, builder.build()); } catch (SecurityException ignored) { /* notification permission may be denied */ }
    }

    @Override public void onDestroy() {
        synchronized (calls) {
            for (Call call : calls) call.unregisterCallback(callback);
            calls.clear();
        }
        NotificationManager notifications = getSystemService(NotificationManager.class);
        if (notifications != null) notifications.cancel(CALL_NOTIFICATION);
        instance = null;
        super.onDestroy();
    }
}
