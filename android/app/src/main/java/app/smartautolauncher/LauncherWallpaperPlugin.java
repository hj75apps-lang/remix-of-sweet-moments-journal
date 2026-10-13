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
            if (image.getString("name").length() > 160 || data.length() > 5 * 1024 * 1024 || !data.matches("data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+")) throw new Exception("Imagem inválida.");
        }
    }
}
