package app.smartautolauncher;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.InetAddress;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import javax.net.ssl.HttpsURLConnection;

/** Bounded public HTTPS requests for station pages and playlists, never audio transport. */
@CapacitorPlugin(name = "RadioNetwork")
public class RadioNetworkPlugin extends Plugin {
    @PluginMethod
    public void request(PluginCall call) {
        getBridge().execute(() -> {
            HttpsURLConnection connection = null;
            try {
                URL url = new URL(call.getString("url", ""));
                int timeout = Math.min(10000, Math.max(1000, call.getInt("timeout", 8000)));
                boolean probe = Boolean.TRUE.equals(call.getBoolean("probe", false));
                for (int redirect = 0; redirect <= 3; redirect++) {
                    validate(url);
                    connection = (HttpsURLConnection) url.openConnection();
                    connection.setInstanceFollowRedirects(false);
                    connection.setConnectTimeout(timeout);
                    connection.setReadTimeout(timeout);
                    connection.setRequestProperty("Accept", "*/*");
                    connection.setRequestProperty("User-Agent", "SmartAutoLauncher/1.0 Android Radio");
                    int status = connection.getResponseCode();
                    if (status >= 300 && status < 400) {
                        String location = connection.getHeaderField("Location");
                        if (location == null || redirect == 3) throw new Exception("redirect_limit");
                        url = new URL(url, location);
                        connection.disconnect();
                        connection = null;
                        continue;
                    }
                    String type = connection.getContentType();
                    String body = "";
                    if (!probe && status >= 200 && status < 300) {
                        try (InputStream input = connection.getInputStream();
                             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
                            byte[] buffer = new byte[4096];
                            int count;
                            while (output.size() < 400000 && (count = input.read(buffer, 0,
                                    Math.min(buffer.length, 400000 - output.size()))) != -1) {
                                output.write(buffer, 0, count);
                            }
                            body = new String(output.toByteArray(), StandardCharsets.UTF_8);
                        }
                    }
                    JSObject result = new JSObject();
                    result.put("status", status);
                    result.put("contentType", type == null ? "" : type);
                    result.put("body", body);
                    call.resolve(result);
                    return;
                }
                call.reject("redirect_limit");
            } catch (Exception error) {
                call.reject("radio_request_failed");
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    private void validate(URL url) throws Exception {
        if (!"https".equalsIgnoreCase(url.getProtocol()) || url.getUserInfo() != null
                || !url.getHost().contains(".") || url.getHost().endsWith(".local")) {
            throw new Exception("invalid_url");
        }
        for (InetAddress address : InetAddress.getAllByName(url.getHost())) {
            if (address.isAnyLocalAddress() || address.isLoopbackAddress()
                    || address.isLinkLocalAddress() || address.isSiteLocalAddress()
                    || address.isMulticastAddress()) throw new Exception("private_address");
            byte[] bytes = address.getAddress();
            int first = bytes[0] & 255;
            if ((bytes.length == 4 && (first == 0 || first >= 224
                    || (first == 100 && (bytes[1] & 255) >= 64 && (bytes[1] & 255) <= 127)))
                    || (bytes.length == 16 && (first & 254) == 252)) {
                throw new Exception("private_address");
            }
        }
    }
}