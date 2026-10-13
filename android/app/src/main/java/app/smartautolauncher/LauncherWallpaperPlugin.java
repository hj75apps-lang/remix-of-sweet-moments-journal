package app.smartautolauncher;
import android.util.AtomicFile;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
/** Private, atomic wallpaper persistence: no shared-storage permissions or remote URLs. */
@CapacitorPlugin(name = "LauncherWallpaper")
public class LauncherWallpaperPlugin extends Plugin {
    private static final int MAX_BYTES = 6 * 1024 * 1024;
    private final Object lock = new Object();
    private AtomicFile store() { return new AtomicFile(new File(getContext().getFilesDir(), "launcher-wallpaper.json")); }
    @PluginMethod
    public void read(PluginCall call) {
        getBridge().execute(() -> {
            synchronized (lock) {
                try {
                    AtomicFile file = store();
                    if (!file.getBaseFile().exists()) { call.resolve(new JSObject().put("value", JSONObject.NULL)); return; }
                    if (file.getBaseFile().length() > MAX_BYTES) throw new Exception("Arquivo muito grande.");
                    String value = new String(file.readFully(), StandardCharsets.UTF_8);
                    validate(value); call.resolve(new JSObject().put("value", value));
                } catch (Exception e) { call.reject("Não foi possível recuperar o papel de parede."); }
            }
        });
    }
    @PluginMethod
    public void write(PluginCall call) {
        getBridge().execute(() -> {
            synchronized (lock) {
                AtomicFile file = store(); FileOutputStream output = null;
                try {
                    String value = call.getString("value", ""); validate(value);
                    output = file.startWrite(); output.write(value.getBytes(StandardCharsets.UTF_8));
                    file.finishWrite(output); call.resolve();
                } catch (Exception e) { if (output != null) file.failWrite(output); call.reject("Não foi possível salvar o papel de parede."); }
            }
        });
    }
    private void validate(String value) throws Exception {
        if (value.length() > MAX_BYTES || value.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) throw new Exception("Limite excedido.");
        JSONObject json = new JSONObject(value); String fit = json.getString("fit");
        if (json.getInt("version") != 1 || !(json.get("active") instanceof Boolean) || !(fit.equals("cover") || fit.equals("contain") || fit.equals("center"))) throw new Exception("Configuração inválida.");
        if (json.isNull("image")) { if (json.getBoolean("active")) throw new Exception("Imagem ausente."); }
        else {
            JSONObject image = json.getJSONObject("image"); String data = image.getString("data");
            int comma = data.indexOf(',');
            String prefix = comma < 0 ? "" : data.substring(0, comma);
            if (image.getString("name").length() > 160 || data.length() > 5 * 1024 * 1024 ||
                !(prefix.equals("data:image/png;base64") || prefix.equals("data:image/jpeg;base64") || prefix.equals("data:image/webp;base64")) || comma == data.length() - 1)
                throw new Exception("Imagem inválida.");
            for (int i = comma + 1; i < data.length(); i++) {
                char c = data.charAt(i);
                if (!((c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c == '+' || c == '/' || c == '='))
                    throw new Exception("Imagem inválida.");
            }
        }
    }
}
