package app.smartautolauncher;

import android.content.SharedPreferences;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.net.URL;
import javax.net.ssl.HttpsURLConnection;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "LauncherOta")
public class LauncherOtaPlugin extends Plugin {
    private boolean startupClaimed = false;
    private SharedPreferences prefs;
    @Override public void load() { prefs = getContext().getSharedPreferences("launcher-ota-v1", 0); }
    private String config(String key) { return getConfig().getString(key, ""); }
    private boolean configured() { return !config("manifestUrl").isEmpty() && !config("publicKey").isEmpty(); }
    private long highest() { return prefs.getLong("highest", getConfig().getInt("builtinSequence", 0)); }

    private JSONObject verify(JSONObject envelope, boolean fresh) throws Exception {
        if (!configured()) throw new SecurityException("Distribuição de atualizações não configurada.");
        byte[] payload = Base64.decode(envelope.getString("payload"), Base64.NO_WRAP);
        if (payload.length > 65536) throw new SecurityException("Manifesto excessivo.");
        String key = config("publicKey").replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replaceAll("\\s", "");
        OtaPolicy.verify(payload, Base64.decode(envelope.getString("signature"), Base64.NO_WRAP), Base64.decode(key, Base64.NO_WRAP));
        JSONObject m = new JSONObject(new String(payload, StandardCharsets.UTF_8));
        if (m.getInt("schema") != 1 || !getContext().getPackageName().equals(m.getString("appId")) || !config("channel").equals(m.getString("channel")))
            throw new SecurityException("Manifesto de outro aplicativo ou canal.");
        if (fresh) OtaPolicy.requireSequence(m.getLong("sequence"), highest());
        if (m.getLong("expiresAt") < System.currentTimeMillis() || m.getLong("publishedAt") > System.currentTimeMillis() + 300000)
            throw new SecurityException("Manifesto vencido ou data inválida.");
        if (!m.getString("version").matches("\\d+\\.\\d+\\.\\d+") || m.getString("notes").length() > 4000)
            throw new SecurityException("Identificação da versão inválida.");
        boolean compatible = BuildConfig.VERSION_CODE >= m.getLong("minNativeCode")
            && BuildConfig.VERSION_CODE <= m.getLong("maxNativeCode")
            && OtaPolicy.versionAtLeast(BuildConfig.VERSION_NAME, m.getString("minLauncherVersion"))
            && m.getInt("bridgeRevision") == 1;
        if (!m.getString("kind").equals("ota") && !m.getString("kind").equals("native")) throw new SecurityException("Tipo de atualização inválido.");
        if (m.getString("kind").equals("ota")) {
            OtaPolicy.requireOrigin(m.getString("url"), config("manifestUrl"));
            if (!m.getString("sha256").matches("[a-f0-9]{64}") || m.getLong("bytes") <= 0 || m.getLong("bytes") > 52428800)
                throw new SecurityException("Hash ou tamanho do pacote inválido.");
        } else OtaPolicy.requireOrigin(m.getString("url"), config("manifestUrl"));
        m.put("compatible", compatible && m.getString("kind").equals("ota"));
        return m;
    }

    @PluginMethod public void info(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", configured()); result.put("nativeVersion", BuildConfig.VERSION_NAME);
        result.put("nativeCode", BuildConfig.VERSION_CODE); result.put("highest", highest());
        result.put("channel", config("channel")); result.put("pending", prefs.getString("pending", ""));
        result.put("previous", prefs.getString("previous", "builtin"));
        result.put("lastResult", prefs.getString("lastResult", ""));
        call.resolve(result);
    }
    /** Called once per native Activity instance, never on route changes or resume. */
    @PluginMethod public synchronized void claimStartup(PluginCall call) {
        JSObject result = new JSObject();
        if (!startupClaimed) {
            startupClaimed = true;
            String id = prefs.getString("pending", "");
            if (!id.isEmpty()) {
                boolean sameNative = prefs.getInt("pendingNative", -1) == BuildConfig.VERSION_CODE;
                if (prefs.edit().remove("pending").putString("lastResult", sameNative ? "activation_pending" : "native_changed").commit() && sameNative) result.put("id", id);
            }
        }
        call.resolve(result);
    }
    @PluginMethod public void check(PluginCall call) {
        new Thread(() -> {
            HttpsURLConnection connection = null;
            try {
                if (!configured()) throw new SecurityException("Distribuição de atualizações não configurada.");
                OtaPolicy.requireOrigin(config("manifestUrl"), config("manifestUrl"));
                connection = (HttpsURLConnection) new URL(config("manifestUrl")).openConnection();
                connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(10000); connection.setReadTimeout(10000);
                connection.setRequestProperty("Accept", "application/json");
                if (connection.getResponseCode() == 204) { call.resolve(); return; }
                if (connection.getResponseCode() != 200) throw new Exception("Servidor de atualização indisponível (" + connection.getResponseCode() + ").");
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                try (InputStream in = connection.getInputStream()) {
                    byte[] block = new byte[4096]; int n;
                    while ((n = in.read(block)) != -1) { if (buffer.size() + n > 131072) throw new SecurityException("Manifesto excessivo."); buffer.write(block, 0, n); }
                }
                JSONObject envelope = new JSONObject(new String(buffer.toByteArray(), StandardCharsets.UTF_8));
                JSONObject manifest = verify(envelope, false);
                if (manifest.getLong("sequence") <= highest()) { call.resolve(); return; }
                JSObject result = new JSObject(); result.put("manifest", manifest); result.put("envelope", envelope); call.resolve(result);
            } catch (Exception e) { call.reject(e.getMessage() == null ? "Atualização recusada." : e.getMessage()); }
            finally { if (connection != null) connection.disconnect(); }
        }, "launcher-ota-check").start();
    }
    @PluginMethod public synchronized void stage(PluginCall call) {
        try {
            JSObject envelope = call.getObject("envelope"); String id = call.getString("id", "");
            if (envelope == null || !id.matches("[a-zA-Z0-9]{1,64}")) throw new SecurityException("Pacote não identificado.");
            JSONObject m = verify(envelope, true);
            if (!m.getBoolean("compatible") || m.optBoolean("suspended", false)) throw new SecurityException("Esta versão exige outro APK ou está suspensa.");
            if (!prefs.edit().putLong("highest", m.getLong("sequence")).putInt("pendingNative", BuildConfig.VERSION_CODE).putString("pending", id).putString("lastResult", "staged").commit())
                throw new Exception("Não foi possível salvar a atualização.");
            call.resolve();
        } catch (Exception e) { call.reject(e.getMessage()); }
    }
    @PluginMethod public void confirmed(PluginCall call) {
        String current = call.getString("id", "builtin");
        String before = prefs.getString("confirmed", "builtin");
        SharedPreferences.Editor edit = prefs.edit().putString("confirmed", current).putString("lastResult", "confirmed");
        if (!current.equals(before)) edit.putString("previous", before);
        edit.commit(); call.resolve();
    }
}