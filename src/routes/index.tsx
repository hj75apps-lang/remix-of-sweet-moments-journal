import { createFileRoute } from "@tanstack/react-router";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import { useEffect } from "react";
import { markHomeVisible } from "@/services/startup-metrics";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { isLauncherNative, startNavigation } from "@/services/launcher-system";
import { useNavigationApps } from "@/services/navigation-apps";

import { CustomizableHome } from "@/components/launcher/customizable-home";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Auto Launcher — Tela inicial" },
      {
        name: "description",
        content:
          "Tela inicial premium para centrais multimídia Android com navegação, mídia e atalhos.",
      },
      { property: "og:title", content: "Smart Auto Launcher" },
      {
        property: "og:description",
        content: "Tela inicial premium para centrais multimídia Android.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});

function Home() {
  const { settings, loaded } = useLauncherSettings();
  const { apps, ready } = useNavigationApps();

  useEffect(() => {
    if (!loaded || !ready || !isLauncherNative() || !settings.openNavigatorOnStartup) return;
    if (settings.navApp === "system" || !apps.some((app) => app.id === settings.navApp)) return;
    // One launch per WebView session, not on every return from the navigator.
    const marker = "sal.navigator-started-once";
    try {
      if (sessionStorage.getItem(marker)) return;
      sessionStorage.setItem(marker, "1");
    } catch {
      return; // Do not risk a launch loop when storage is unavailable.
    }
    void startNavigation(settings.navApp, "").catch(() => {
      // Allow retry on a future launcher startup, not repeatedly in this session.
    });
  }, [loaded, ready, settings.openNavigatorOnStartup, settings.navApp, apps]);

  useEffect(() => {
    markHomeVisible();
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <div id="launcher-home-workspace" className="relative isolate flex min-h-0 min-w-0 flex-1 flex-col gap-3 md:gap-4">
          <CustomizableHome />
        </div>
      </main>
    </div>
  );
}
