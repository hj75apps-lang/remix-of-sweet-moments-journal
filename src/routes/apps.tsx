import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LayoutGrid, Search, Smartphone } from "lucide-react";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import {
  isNativeAvailable,
  listInstalledApps,
  launchApp,
  onAppsChanged,
} from "@/services/installed-apps";
import { normalizeText } from "@/services/radio-search";

export const Route = createFileRoute("/apps")({
  head: () => ({
    meta: [
      { title: "Apps — Smart Auto Launcher" },
      { name: "description", content: "Todos os aplicativos instalados na central multimídia." },
      { property: "og:title", content: "Apps — Smart Auto Launcher" },
      { property: "og:description", content: "Gaveta de aplicativos da central multimídia." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppsPage,
});

const PAGE_SIZE = 8;

function AppsPage() {
  const [native, setNative] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window !== "undefined" && !window.localStorage.getItem("smart_auto_mock_apps")) {
      window.localStorage.setItem("smart_auto_mock_apps", "true");
    }
    setNative(isNativeAvailable());
  }, []);
  const apps = useQuery({
    queryKey: ["installed-apps"],
    queryFn: listInstalledApps,
    enabled: !!native,
  });
  // Installs/removals update the list automatically.
  useEffect(
    () =>
      native
        ? onAppsChanged(() => void qc.invalidateQueries({ queryKey: ["installed-apps"] }))
        : undefined,
    [native, qc],
  );
  const list = useMemo(() => {
    const n = normalizeText(q);
    return (apps.data ?? []).filter((a) => !n || normalizeText(a.label).includes(n));
  }, [apps.data, q]);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  useEffect(() => setPage(0), [q]);
  useEffect(() => {
    if (page > pages - 1) setPage(pages - 1);
  }, [page, pages]);
  const visible = list.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <StatusBar />
      <main className="flex min-h-0 flex-1 flex-col-reverse gap-3 px-2 pb-2 sm:px-4 sm:pb-4 md:flex-row md:gap-4">
        <Dock />
        <section
          className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 rounded-3xl border bg-card p-3 sm:p-4"
          aria-label="Aplicativos"
        >
          <div className="flex items-center gap-3">
            <h1 className="flex shrink-0 items-center gap-2 text-xl font-semibold">
              <LayoutGrid className="size-5 text-primary" />
              Apps
            </h1>
            {native && (
              <label className="ml-auto flex min-h-11 w-full max-w-sm items-center gap-2 rounded-2xl bg-secondary px-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar app"
                  aria-label="Buscar app"
                  className="min-w-0 flex-1 bg-transparent outline-none"
                />
              </label>
            )}
          </div>
          {native === false ? (
            <div className="m-auto flex max-w-md flex-col items-center gap-3 text-center">
              <Smartphone className="size-12 text-primary" />
              <p className="text-lg font-semibold">Disponível no app Android</p>
              <p className="text-sm text-muted-foreground">
                Quando o launcher estiver instalado na central, todos os apps instalados aparecem
                aqui com seus ícones e abrem com um toque.
              </p>
            </div>
          ) : apps.isError ? (
            <p className="m-auto text-sm text-muted-foreground">
              Não foi possível ler os apps instalados.
            </p>
          ) : !apps.data ? (
            <p className="m-auto text-sm text-muted-foreground" aria-live="polite">
              Carregando apps…
            </p>
          ) : (
            <>
            <ul className="grid min-h-0 flex-1 grid-cols-4 grid-rows-2 gap-2">
              {visible.map((a) => (
                <li key={a.packageName} className="flex min-h-0">
                  <button
                    type="button"
                    onClick={() => void launchApp(a.packageName)}
                    aria-label={`Abrir ${a.label}`}
                    className="flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl p-2 transition hover:bg-accent active:scale-95"
                  >
                    {a.icon ? (
                      <img
                        src={`data:image/png;base64,${a.icon}`}
                        alt=""
                        className="size-14"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/20 text-xl font-bold text-primary">
                        {a.label.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="w-full truncate text-center text-xs font-medium">
                      {a.label}
                    </span>
                  </button>
                </li>
              ))}
              {!list.length && (
                <li className="col-span-full p-6 text-center text-sm text-muted-foreground">
                  Nenhum app encontrado.
                </li>
              )}
            </ul>
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4" aria-label="Páginas de apps">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  aria-label="Página anterior"
                  className="flex size-11 items-center justify-center rounded-full bg-secondary transition active:scale-95 disabled:opacity-40"
                >
                  <ChevronLeft className="size-5" />
                </button>
                <span className="text-sm font-medium text-muted-foreground">
                  {page + 1} / {pages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                  disabled={page >= pages - 1}
                  aria-label="Próxima página"
                  className="flex size-11 items-center justify-center rounded-full bg-secondary transition active:scale-95 disabled:opacity-40"
                >
                  <ChevronRight className="size-5" />
                </button>
              </nav>
            )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
