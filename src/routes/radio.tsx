import { createFileRoute } from "@tanstack/react-router";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import { RadioScreen } from "@/components/radio/radio-screen";

export const Route = createFileRoute("/radio")({
  head: () => ({
    meta: [
      { title: "Rádios Online — Smart Auto Launcher" },
      { name: "description", content: "Ouça rádios brasileiras ao vivo, busque estações e salve suas favoritas." },
      { property: "og:title", content: "Rádios Online — Smart Auto Launcher" },
      { property: "og:description", content: "Rádios brasileiras ao vivo com busca e favoritas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RadioPage,
});

function RadioPage() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <RadioScreen />
      </main>
    </div>
  );
}
