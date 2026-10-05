import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.smartautolauncher",
  appName: "Smart Auto Launcher",
  webDir: ".output/public",
  android: {
    allowMixedContent: true,
  },
};

export default config;
