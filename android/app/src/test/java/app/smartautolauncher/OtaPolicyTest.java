package app.smartautolauncher;
import org.junit.Test;
import static org.junit.Assert.*;
import java.security.*;
import java.nio.charset.StandardCharsets;

public class OtaPolicyTest {
    @Test public void validSignatureAndTamper() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA"); generator.initialize(2048);
        KeyPair key = generator.generateKeyPair(); byte[] payload = "launcher-release".getBytes(StandardCharsets.UTF_8);
        Signature signer = Signature.getInstance("SHA256withRSA"); signer.initSign(key.getPrivate()); signer.update(payload);
        byte[] signature = signer.sign(); OtaPolicy.verify(payload, signature, key.getPublic().getEncoded());
        payload[0] ^= 1;
        try { OtaPolicy.verify(payload, signature, key.getPublic().getEncoded()); fail(); } catch (SecurityException expected) {}
    }
    @Test public void originAndVersion() throws Exception {
        OtaPolicy.requireOrigin("https://updates.example.org/a.zip", "https://updates.example.org/production.json");
        for (String bad : new String[]{"http://updates.example.org/a", "https://evil.org/a", "https://user@updates.example.org/a", "https://updates.example.org:444/a"}) {
            try { OtaPolicy.requireOrigin(bad, "https://updates.example.org/production.json"); fail(); } catch (SecurityException expected) {}
        }
        assertTrue(OtaPolicy.versionAtLeast("1.10.0", "1.2.0")); assertFalse(OtaPolicy.versionAtLeast("1.0", "1.0.0"));
    }
    @Test public void downgradeDenied() {
        OtaPolicy.requireSequence(4, 3);
        try { OtaPolicy.requireSequence(3, 3); fail(); } catch (SecurityException expected) {}
        try { OtaPolicy.requireSequence(2, 3); fail(); } catch (SecurityException expected) {}
    }
}