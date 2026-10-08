package app.smartautolauncher;

import android.Manifest;
import android.app.role.RoleManager;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallAudioState;
import android.telecom.TelecomManager;
import android.os.Bundle;
import android.content.pm.PackageManager;
import androidx.core.app.NotificationManagerCompat;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(name = "CarPhone", permissions = {
    @Permission(alias = "call", strings = { Manifest.permission.CALL_PHONE }),
    @Permission(alias = "phone", strings = { Manifest.permission.READ_PHONE_STATE }),
    @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
})
public final class CarPhonePlugin extends Plugin {
    private AudioManager audioManager;
    private boolean pendingPhoneScreen;
    private String pendingNumber = "";

    @Override public void load() {
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        CarInCallService.setStateListener(() -> notifyListeners("callStateChanged", createState()));
        acceptPhoneIntent(getActivity().getIntent());
    }

    private boolean isDefaultDialer() {
        TelecomManager telecom = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
        return telecom != null && getContext().getPackageName().equals(telecom.getDefaultDialerPackage());
    }

    private String callStatus(Call call) {
        if (call == null) return "idle";
        int state = call.getState();
        if (state == 9) return "dialing"; // STATE_CONNECTING, unavailable as a named constant on API 24.
        switch (state) {
            case Call.STATE_RINGING: return "ringing";
            case Call.STATE_DIALING:
            case Call.STATE_SELECT_PHONE_ACCOUNT: return "dialing";
            case Call.STATE_ACTIVE:
            case Call.STATE_HOLDING: return "active";
            default: return "idle";
        }
    }

    private JSObject createState() {
        Call activeCall = CarInCallService.getCurrentCall();
        String number = "";
        if (activeCall != null && activeCall.getDetails() != null && activeCall.getDetails().getHandle() != null) {
            number = activeCall.getDetails().getHandle().getSchemeSpecificPart();
        }
        JSObject state = new JSObject();
        state.put("available", getContext().getPackageManager().hasSystemFeature(PackageManager.FEATURE_TELEPHONY));
        state.put("callAlertsEnabled", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        state.put("isDefaultDialer", isDefaultDialer());
        state.put("status", callStatus(activeCall));
        state.put("number", number);
        CarInCallService service = CarInCallService.getInstance();
        CallAudioState route = service == null ? null : service.getCallAudioState();
        state.put("speakerOn", route != null ? route.getRoute() == CallAudioState.ROUTE_SPEAKER : audioManager != null && audioManager.isSpeakerphoneOn());
        return state;
    }

    @PluginMethod public void getState(PluginCall call) { call.resolve(createState()); }

    @PluginMethod public synchronized void getPendingPhoneScreen(PluginCall call) {
        call.resolve(new JSObject().put("requested", pendingPhoneScreen).put("number", pendingNumber));
        pendingPhoneScreen = false;
        pendingNumber = "";
    }

    private synchronized void acceptPhoneIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        boolean tel = data != null && "tel".equals(data.getScheme());
        if (!Intent.ACTION_DIAL.equals(intent.getAction()) && !(Intent.ACTION_VIEW.equals(intent.getAction()) && tel)) return;
        pendingPhoneScreen = true;
        pendingNumber = tel ? sanitize(data.getSchemeSpecificPart()) : "";
        notifyListeners("phoneScreenRequested", new JSObject());
    }

    @Override protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        acceptPhoneIntent(intent);
    }

    @PluginMethod public void requestCallAlerts(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsPermission");
        } else call.resolve();
    }

    @PermissionCallback private void notificationsPermission(PluginCall call) { call.resolve(); }

    @PluginMethod public void requestDefaultDialer(PluginCall call) {
        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            RoleManager roles = getContext().getSystemService(RoleManager.class);
            if (roles == null || !roles.isRoleAvailable(RoleManager.ROLE_DIALER) || roles.isRoleHeld(RoleManager.ROLE_DIALER)) {
                call.resolve(new JSObject().put("requested", isDefaultDialer()));
                return;
            }
            intent = roles.createRequestRoleIntent(RoleManager.ROLE_DIALER);
        } else {
            intent = new Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                .putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, getContext().getPackageName());
        }
        startActivityForResult(call, intent, "defaultDialerResult");
    }

    @ActivityCallback private void defaultDialerResult(PluginCall call, ActivityResult result) {
        if (call != null) call.resolve(new JSObject().put("requested", isDefaultDialer()));
    }

    @PluginMethod public void call(PluginCall call) {
        String number = sanitize(call.getString("number"));
        if (number.isEmpty()) { call.reject("Número inválido"); return; }
        if (getPermissionState("call") != PermissionState.GRANTED) {
            requestPermissionForAlias("call", call, "callPermission");
            return;
        }
        startCall(number, call);
    }

    @PermissionCallback private void callPermission(PluginCall call) {
        if (getPermissionState("call") != PermissionState.GRANTED) {
            call.reject("Permissão de chamada negada");
            return;
        }
        String number = sanitize(call.getString("number"));
        if (number.isEmpty()) { call.reject("Número inválido"); return; }
        startCall(number, call);
    }

    private String sanitize(String number) { return number == null ? "" : number.replaceAll("[^0-9+*#]", ""); }

    private void startCall(String number, PluginCall call) {
        Uri uri = Uri.fromParts("tel", number, null);
        TelecomManager telecom = (TelecomManager) getContext().getSystemService(Context.TELECOM_SERVICE);
        if (isDefaultDialer() && telecom != null) {
            try {
                telecom.placeCall(uri, new Bundle());
            } catch (SecurityException e) {
                call.reject("Permissão de chamada negada", e);
                return;
            }
        } else {
            Intent intent = new Intent(Intent.ACTION_CALL, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { getContext().startActivity(intent); } catch (RuntimeException error) {
                call.reject("Não foi possível iniciar a chamada", error);
                return;
            }
        }
        call.resolve();
    }

    @PluginMethod public void answer(PluginCall call) {
        Call activeCall = CarInCallService.getCurrentCall();
        if (activeCall == null) { call.reject("Nenhuma chamada"); return; }
        activeCall.answer(0);
        call.resolve();
    }

    @PluginMethod public void reject(PluginCall call) {
        Call activeCall = CarInCallService.getCurrentCall();
        if (activeCall == null) { call.reject("Nenhuma chamada"); return; }
        activeCall.reject(false, null);
        call.resolve();
    }

    @PluginMethod public void hangUp(PluginCall call) {
        Call activeCall = CarInCallService.getCurrentCall();
        if (activeCall == null) { call.reject("Nenhuma chamada"); return; }
        activeCall.disconnect();
        call.resolve();
    }

    @SuppressWarnings("deprecation")
    @PluginMethod public void setSpeaker(PluginCall call) {
        boolean enabled = Boolean.TRUE.equals(call.getBoolean("enabled"));
        CarInCallService service = CarInCallService.getInstance();
        if (service != null) {
            CallAudioState audioState = service.getCallAudioState();
            int supported = audioState == null ? 0 : audioState.getSupportedRouteMask();
            int route = enabled ? CallAudioState.ROUTE_SPEAKER :
                (supported & CallAudioState.ROUTE_BLUETOOTH) != 0 ? CallAudioState.ROUTE_BLUETOOTH :
                (supported & CallAudioState.ROUTE_WIRED_HEADSET) != 0 ? CallAudioState.ROUTE_WIRED_HEADSET : CallAudioState.ROUTE_EARPIECE;
            if ((supported & route) == 0) { call.reject("Rota de áudio indisponível"); return; }
            service.setAudioRoute(route);
        } else { call.reject("Nenhuma chamada"); return; }
        call.resolve(new JSObject().put("speakerOn", createState().optBoolean("speakerOn")));
        notifyListeners("callStateChanged", createState());
    }

    @Override protected void handleOnDestroy() {
        CarInCallService.setStateListener(null);
        super.handleOnDestroy();
    }
}
