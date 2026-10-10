package app.smartautolauncher;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;

/** Platform-independent trust policy; Android owns key/origin and monotonic release counter. */
public final class OtaPolicy {
    private OtaPolicy() {}
    public static void verify(byte[] payload, byte[] signature, byte[] publicKey) throws Exception {
        Signature verifier = Signature.getInstance("SHA256withRSA");
        verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(publicKey)));
        verifier.update(payload);
        if (!verifier.verify(signature)) throw new SecurityException("Assinatura da atualização inválida.");
    }
    public static void requireOrigin(String value, String trusted) throws Exception {
        URI url = new URI(value), origin = new URI(trusted);
        if (!"https".equals(url.getScheme()) || url.getHost() == null || url.getUserInfo() != null
            || url.getFragment() != null || !url.getHost().equals(origin.getHost())
            || url.getPort() != origin.getPort() || !"https".equals(origin.getScheme()))
            throw new SecurityException("Origem da atualização não autorizada.");
    }
    public static void requireSequence(long sequence, long highest) {
        if (sequence <= highest || sequence <= 0) throw new SecurityException("Versão antiga ou já processada.");
    }
    public static boolean versionAtLeast(String installed, String minimum) {
        if (!installed.matches("\\d+\\.\\d+\\.\\d+") || !minimum.matches("\\d+\\.\\d+\\.\\d+")) return false;
        String[] a = installed.split("\\."), b = minimum.split("\\.");
        for (int i = 0; i < 3; i++) {
            long x = Long.parseLong(a[i]), y = Long.parseLong(b[i]);
            if (x != y) return x > y;
        }
        return true;
    }
}