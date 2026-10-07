import { createFileRoute } from "@tanstack/react-router";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import { useEffect } from "react";
import { markHomeVisible } from "@/services/startup-metrics";

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
  useEffect(() => {
    markHomeVisible();
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 p-2 sm:p-4 md:flex-row md:gap-4">
        <Dock />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 md:gap-4">
          <CustomizableHome />
        </div>
      </main>
    </div>
  );
}
