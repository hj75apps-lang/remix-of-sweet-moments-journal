package app.smartautolauncher;

import java.io.File;
import java.io.IOException;

/** Installation-local state, deliberately outside Android backup and transfer. */
final class FirstLaunchState {
    private final File marker;

    FirstLaunchState(File noBackupDirectory) {
        marker = new File(noBackupDirectory, "hjcar-opening-shown");
    }

    boolean shouldShow() {
        return !marker.exists();
    }

    void markShown() {
        try {
            marker.createNewFile();
        } catch (IOException ignored) {
            // Storage failures must never prevent the launcher from opening.
        }
    }
}