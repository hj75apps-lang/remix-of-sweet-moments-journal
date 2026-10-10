import type { CapacitorConfig } from "@capacitor/cli";
import "@capgo/capacitor-updater";

const config: CapacitorConfig = {
  appId: "app.smartautolauncher",
  appName: "Smart Auto Launcher",
  webDir: "dist/client",
  bundledWebRuntime: false,
  android: {
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  server: {
    androidScheme: "https"
  },
  plugins: {
    LauncherOta: {
      manifestUrl: process.env['OTA_MANIFEST_URL'] ?? "",
      publicKey: process.env['OTA_PUBLIC_KEY'] ?? "",
      channel: process.env['OTA_CHANNEL'] ?? "production",
      builtinSequence: Number(process.env['OTA_BUILTIN_SEQUENCE'] ?? "0"),
    },
    CapacitorUpdater: {
      autoUpdate: false,
      updateUrl: "",
      channelUrl: "",
      statsUrl: "",
      allowModifyUrl: false,
      resetWhenUpdate: true,
      autoDeletePrevious: false,
      autoDeleteFailed: true,
      appReadyTimeout: 30000,
      responseTimeout: 20,
      shakeMenu: false,
      disableJSLogging: true,
      osLogging: false,
    },
  },
};

export default config;
