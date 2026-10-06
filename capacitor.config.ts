import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.smartautolauncher",
  appName: "Smart Auto Launcher",
  webDir: "dist/client",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  server: {
    androidScheme: "https"
  }
};

export default config;
