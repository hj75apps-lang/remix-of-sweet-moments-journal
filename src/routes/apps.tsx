import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, LayoutGrid, Search, Smartphone, Check, RotateCcw, GripVertical } from "lucide-react";
import { StatusBar } from "@/components/launcher/status-bar";
import { Dock } from "@/components/launcher/dock";
import {
  isNativeAvailable,
  listInstalledApps,
  launchApp,
  onAppsChanged,
} from "@/services/installed-apps";
import { normalizeText } from "@/services/radio-search";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
const CUSTOM_APPS_ORDER_KEY = "sal.custom-apps-order";
const LONG_PRESS_DURATION = 1500;

function AppsPage() {
  const [native, setNative] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(false);
  const [customOrder, setCustomOrder] = useState<string[]>([]);
  const qc = useQueryClient();

  useEffect(() => {
    setNative(isNativeAvailable());
    try {
      const raw = localStorage.getItem(CUSTOM_APPS_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setCustomOrder([...new Set(parsed.filter((value): value is string => typeof value === "string"))].slice(0, 1000));
      }
    } catch {
      // ignore
    }
  }, []);

  const appsQuery = useQuery({
    queryKey: ["installed-apps"],
    queryFn: listInstalledApps,
    enabled: !!native,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
  });

  useEffect(
    () =>
      native
        ? onAppsChanged(() => void qc.invalidateQueries({ queryKey: ["installed-apps"] }))
        : undefined,
    [native, qc],
  );

  const sortedApps = useMemo(() => {
    const rawList = appsQuery.data ?? [];
    if (!customOrder.length) return rawList;
    const map = new Map(rawList.map((a) => [a.packageName, a]));
    const ordered: typeof rawList = [];
    for (const pkg of customOrder) {
      const found = map.get(pkg);
      if (found) {
        ordered.push(found);
        map.delete(pkg);
      }
    }
    for (const a of map.values()) ordered.push(a);
    return ordered;
  }, [appsQuery.data, customOrder]);

  const list = useMemo(() => {
    const n = normalizeText(q);
    return sortedApps.filter((a) => !n || normalizeText(a.label).includes(n));
  }, [sortedApps, q]);

  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPage((current) => Math.min(current, pages - 1));
  }, [pages]);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swipeLocked = useRef(false);
  const suppressClick = useRef(false);

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

  const onSwipeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editing || event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onSwipeEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (editing || !swipeStart.current || swipeLocked.current) return;
    const start = swipeStart.current;
    swipeStart.current = null;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const threshold = Math.max(56, (scroller.current?.clientWidth ?? 0) * 0.12);

    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.2) return;

    // One gesture = one page. Native horizontal scrolling is disabled below,
    // so a long/flick gesture can never coast through multiple pages.
    swipeLocked.current = true;
    suppressClick.current = true;
    goTo(page + (dx < 0 ? 1 : -1));
    window.setTimeout(() => {
      swipeLocked.current = false;
      suppressClick.current = false;
    }, 380);
  };

  const onSwipeCancel = () => {
    swipeStart.current = null;
  };

  const pageGroups = useMemo(() => {
    const out: (typeof list)[] = [];
    for (let i = 0; i < list.length; i += PAGE_SIZE) out.push(list.slice(i, i + PAGE_SIZE));
    return out;
  }, [list]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: editing ? 0 : LONG_PRESS_DURATION, tolerance: 5 } }),
  );

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const currentList = sortedApps;
    const fromIndex = currentList.findIndex((a) => a.packageName === active.id);
    const toIndex = currentList.findIndex((a) => a.packageName === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      const copy = [...currentList];
      const [moved] = copy.splice(fromIndex, 1);
      if (moved) copy.splice(toIndex, 0, moved);
      const newPkgs = copy.map((a) => a.packageName);
      setCustomOrder(newPkgs);
      try { localStorage.setItem(CUSTOM_APPS_ORDER_KEY, JSON.stringify(newPkgs)); } catch { /* optional preference */ }
    }
  };

  const resetOrder = () => {
    setCustomOrder([]);
    try { localStorage.removeItem(CUSTOM_APPS_ORDER_KEY); } catch { /* optional preference */ }
  };

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
            {editing ? (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={resetOrder}
                  className="gap-1"
                >
                  <RotateCcw className="size-4" />
                  Padrão
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => setEditing(false)}
                  className="gap-1 bg-primary text-primary-foreground"
                >
                  <Check className="size-4" />
                  Concluir
                </Button>
              </div>
            ) : (
              native && (
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
              )
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
          ) : appsQuery.isError ? (
            <p className="m-auto text-sm text-muted-foreground">
              Não foi possível ler os apps instalados.
            </p>
          ) : !appsQuery.data ? (
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
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={list.map((a) => a.packageName)} strategy={rectSortingStrategy}>
                    <div
                      ref={scroller}
                      onPointerDown={onSwipeStart}
                      onPointerUp={onSwipeEnd}
                      onPointerCancel={onSwipeCancel}
                      onClickCapture={(event) => {
                        if (suppressClick.current) {
                          event.preventDefault();
                          event.stopPropagation();
                        }
                      }}
                      className="flex min-h-0 flex-1 overflow-hidden"
                      style={{ touchAction: "none" }}
                    >
                      {pageGroups.map((group, gi) => (
                        <ul
                          key={gi}
                          aria-label={`Página ${gi + 1}`}
                          className="grid h-full w-full shrink-0 snap-start grid-cols-4 grid-rows-2 gap-2"
                        >
                          {group.map((a) => (
                            <SortableAppItem
                              key={a.packageName}
                              app={a}
                              editing={editing}
                              onStartEditing={() => setEditing(true)}
                            />
                          ))}
                        </ul>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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

interface SortableAppItemProps {
  app: Awaited<ReturnType<typeof listInstalledApps>>[number];
  editing: boolean;
  onStartEditing: () => void;
}

function SortableAppItem({ app, editing, onStartEditing }: SortableAppItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: app.packageName,
    disabled: !editing,
  });

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (editing) return;
    clearTimer();
    timerRef.current = setTimeout(() => {
      onStartEditing();
    }, LONG_PRESS_DURATION);
  };

  useEffect(() => clearTimer, []);

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex min-h-0 relative",
        isDragging && "z-20 opacity-80",
        editing && "animate-[wiggle_0.3s_ease-in-out_infinite_alternate] cursor-grab touch-none"
      )}
      onPointerDown={handlePointerDown}
      onPointerUp={clearTimer}
      onPointerLeave={clearTimer}
      onPointerCancel={clearTimer}
      onContextMenu={(e) => e.preventDefault()}
      {...(editing ? { ...attributes, ...listeners } : {})}
    >
      {editing && (
        <span className="absolute right-2 top-2 z-10 grid size-8 place-items-center rounded-full bg-primary/20 text-primary">
          <GripVertical className="size-4" />
        </span>
      )}
      <button
        type="button"
        onClick={() => {
          if (!editing) void launchApp(app.packageName);
        }}
        aria-label={`Abrir ${app.label}`}
        className={cn(
          "flex h-full w-full min-w-0 flex-col items-center justify-center gap-2 rounded-2xl p-2 transition hover:bg-accent active:scale-95",
          editing && "pointer-events-none"
        )}
      >
        {app.icon ? (
          <img
            src={`data:image/png;base64,${app.icon}`}
            alt=""
            className="size-42"
            loading="lazy"
          />
        ) : (
          <div className="flex size-42 items-center justify-center rounded-2xl bg-primary/20 text-4xl font-bold text-primary">
            {app.label.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className="w-full truncate text-center text-xs font-medium">
          {app.label}
        </span>
      </button>
    </li>
  );
}
