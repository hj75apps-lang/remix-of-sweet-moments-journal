import { useEffect, useMemo, useRef, useState } from "react";
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
    window.localStorage.removeItem("smart_auto_mock_apps");
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
  const scroller = useRef<HTMLDivElement>(null);
  const goTo = (target: number) => {
    const el = scroller.current;
    const next = Math.min(pages - 1, Math.max(0, target));
    if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setPage(next);
  };
  useEffect(() => {
    scroller.current?.scrollTo({ left: 0 });
    setPage(0);
  }, [q]);
  const onScroll = () => {
    const el = scroller.current;
    if (el && el.clientWidth) setPage(Math.round(el.scrollLeft / el.clientWidth));
  };
  const pageGroups = useMemo(() => {
    const out: (typeof list)[] = [];
    for (let i = 0; i < list.length; i += PAGE_SIZE) out.push(list.slice(i, i + PAGE_SIZE));
    return out;
  }, [list]);

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
            {!list.length ? (
              <p className="m-auto p-6 text-center text-sm text-muted-foreground">
                {q ? "Nenhum app encontrado." : "Nenhum app instalado reconhecido."}
              </p>
            ) : (
            <div
              ref={scroller}
              onScroll={onScroll}
              className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ touchAction: "pan-x", WebkitOverflowScrolling: "touch" }}
            >
            {pageGroups.map((group, gi) => (
            <ul
              key={gi}
              aria-label={`Página ${gi + 1}`}
              className="grid h-full w-full shrink-0 snap-start grid-cols-4 grid-rows-2 gap-2"
            >
              {group.map((a) => (
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
            </ul>
            ))}
            </div>
            )}
            {pages > 1 && (
              <nav className="flex items-center justify-center gap-4" aria-label="Páginas de apps">
                <button
                  type="button"
                  onClick={() => goTo(page - 1)}
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
                  onClick={() => goTo(page + 1)}
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
