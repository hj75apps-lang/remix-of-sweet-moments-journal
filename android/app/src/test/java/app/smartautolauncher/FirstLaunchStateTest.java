package app.smartautolauncher;

import org.junit.Rule;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class FirstLaunchStateTest {
    @Rule public TemporaryFolder installation = new TemporaryFolder();

    @Test public void freshInstallationShowsArtwork() {
        assertTrue(new FirstLaunchState(installation.getRoot()).shouldShow());
    }

    @Test public void reopeningAndUpdatesRetainMarker() {
        new FirstLaunchState(installation.getRoot()).markShown();
        assertFalse(new FirstLaunchState(installation.getRoot()).shouldShow());
    }

    @Test public void markingTwiceIsSafe() {
        FirstLaunchState state = new FirstLaunchState(installation.getRoot());
        state.markShown();
        state.markShown();
        assertFalse(state.shouldShow());
    }

    @Test public void reinstallHasNewInstallationDirectory() throws Exception {
        new FirstLaunchState(installation.getRoot()).markShown();
        assertTrue(new FirstLaunchState(installation.newFolder("reinstalled")).shouldShow());
    }

    @Test public void storageFailureDoesNotBlockStartup() {
        FirstLaunchState state = new FirstLaunchState(new java.io.File(installation.getRoot(), "missing/path"));
        state.markShown();
        assertTrue(state.shouldShow());
    }
}