import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type PointerEvent as ReactPointerEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { X, Maximize2, Plus, Undo2, RotateCcw, Check } from "lucide-react";
import type { HomeItem, AppId, WidgetKind } from "@/types/home";
import { useHomeLayout } from "@/hooks/use-home-layout";
import { homeGridRows } from "@/services/home-grid";
import { appRegistry, widgetRegistry, sizesFor, GRID_COLS, GRID_ROWS } from "./home-registry";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { memo } from "react";

const LONG_PRESS_MS = 500;
const AddItemSheet = lazy(() => import("./add-item-sheet").then((module) => ({ default: module.AddItemSheet })));

const ItemContent = memo(function ItemContent({ item }: { item: HomeItem }) {
  const navigate = useNavigate();
  if (item.type === "WIDGET") return <div className="h-full w-full overflow-hidden">{widgetRegistry[item.ref as WidgetKind].render()}</div>;
  const app = appRegistry[item.ref as AppId];
  const Icon = app.icon;
  const routes: Record<AppId, "/apps" | "/radio" | "/telefone" | "/ajustes"> = {
    map: "/apps",
    music: "/apps",
    radio: "/radio",
    phone: "/telefone",
    settings: "/ajustes",
  };
  return (
    <Button
      type="button"
      variant="outline"
      aria-label={`Abrir ${app.label}`}
      onClick={() => void navigate({ to: routes[item.ref as AppId] })}
      className="home-app-tile flex h-full w-full flex-col items-center justify-center gap-2 rounded-3xl border bg-card text-sm font-semibold shadow-[var(--shadow-card)] transition-all duration-150 ease-out hover:border-primary/30 active:scale-[0.98]"
    >
      <span className="home-app-icon grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary">
        <Icon className="size-7" />
      </span>
      <span className="home-app-label">{app.label}</span>
    </Button>
  );
});

interface TileProps {
  item: HomeItem;
  editing: boolean;
  onLongPress: () => void;
  onRemove: () => void;
  onResize: () => void;
  onResizeTo: (size: { w: number; h: number }) => void;
  canResize: boolean;
  cols: number;
  maxRows: number;
  cellW: number;
  cellH: number;
  gap: number;
}

function Tile({
  item,
  editing,
  onLongPress,
  onRemove,
  onResize,
  onResizeTo,
  canResize,
  cols,
  maxRows,
  cellW,
  cellH,
  gap,
}: TileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !editing,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [preview, setPreview] = useState<{ w: number; h: number } | null>(null);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  const label =
    item.type === "WIDGET"
      ? widgetRegistry[item.ref as WidgetKind].label
      : appRegistry[item.ref as AppId].label;
  const size = preview ?? item.size;

  const startResize = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const baseW = Math.min(item.size.w, cols);
    const baseH = item.size.h;
    const stepX = cellW + gap;
    const stepY = cellH + gap;
    let current = { w: baseW, h: baseH };
    const move = (ev: PointerEvent) => {
      const w = Math.max(1, Math.min(cols, baseW + Math.round((ev.clientX - startX) / stepX)));
      const h = Math.max(1, Math.min(maxRows, baseH + Math.round((ev.clientY - startY) / stepY)));
      if (w !== current.w || h !== current.h) {
        current = { w, h };
        setPreview(current);
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      setPreview(null);
      if (current.w !== item.size.w || current.h !== item.size.h) onResizeTo(current);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        gridColumn: `span ${Math.min(size.w, cols)}`,
        gridRow: `span ${cols === 2 ? Math.min(size.h, 2) : size.h}`,
      }}
      className={cn(
        "relative min-h-0",
        isDragging && "z-20 opacity-80",
        preview && "z-20 ring-2 ring-primary rounded-3xl",
        editing && !preview && "animate-[wiggle_0.3s_ease-in-out_infinite_alternate] cursor-grab touch-none",
      )}
      onPointerDown={() => {
        if (editing) return;
        timer.current = setTimeout(onLongPress, LONG_PRESS_MS);
      }}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      {...(editing ? { ...attributes, ...listeners } : {})}
      aria-roledescription={editing ? "Item móvel" : undefined}
    >
      <div className={cn("h-full", editing && "pointer-events-none")}>
        <ItemContent item={item} />
      </div>
      {editing && (
        <div className="absolute right-2 top-2 z-10 flex gap-2">
          {canResize && (
            <TileButton label={`Redimensionar ${label}`} onClick={onResize}>
              <Maximize2 className="size-5" />
            </TileButton>
          )}
          <TileButton label={`Remover ${label}`} onClick={onRemove} destructive>
            <X className="size-5" />
          </TileButton>
        </div>
      )}
      {editing && (
        <button
          type="button"
          aria-label={`Arrastar para redimensionar ${label}`}
          onPointerDown={startResize}
          className="absolute bottom-0 right-0 z-10 grid size-12 touch-none cursor-se-resize place-items-end rounded-br-3xl p-2"
        >
          <span className="block size-5 rounded-br-xl border-b-4 border-r-4 border-primary" />
        </button>
      )}
    </div>
  );
}

function TileButton({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={destructive ? "destructive" : "secondary"}
      size="icon"
      aria-label={label}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className={cn(
        "grid size-11 place-items-center rounded-full shadow-[var(--shadow-card)]",
        destructive
          ? "bg-destructive text-destructive-foreground"
          : "bg-popover text-popover-foreground",
      )}
    >
      {children}
    </Button>
  );
}

/** Home grid where widgets and apps share one free-form, reorderable layout. */
export function CustomizableHome() {
  const home = useHomeLayout();
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: 1280, height: 600 });
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setBox((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const cols = box.width < 520 ? 2 : box.width < 900 ? 4 : GRID_COLS;
  const gap = box.width < 640 ? 8 : 16;
  // Fit every card into the visible area: no scrolling, like a head-unit launcher.
  const sizes = home.items.map((item) => item.size);
  if (editing) sizes.push({ w: 1, h: 1 });
  const rows = Math.max(cols === GRID_COLS ? GRID_ROWS : 1, homeGridRows(sizes, cols));
  const rowHeight = Math.max(32, (box.height - (rows - 1) * gap) / rows);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = home.items.findIndex((i) => i.id === active.id);
    const to = home.items.findIndex((i) => i.id === over.id);
    home.reorder(from, to);
  };

  const cycleSize = (item: HomeItem) => {
    const sizes = sizesFor(item.type, item.ref);
    const idx = sizes.findIndex((s) => s.w === item.size.w && s.h === item.size.h);
    const next = sizes[(idx + 1) % sizes.length];
    if (next) home.resize(item.id, next);
  };

  return (
    <div id="launcher-home-grid" className="flex min-h-0 flex-1 flex-col gap-3">
      {!editing && <Button type="button" onClick={() => setEditing(true)} className="sr-only focus:not-sr-only">Personalizar tela inicial</Button>}
      {editing && (
        <div
          className="flex flex-col gap-2 rounded-3xl bg-card p-2 lg:flex-row lg:items-center"
          role="toolbar"
          aria-label="Editar tela inicial"
        >
          <p className="hidden px-3 text-sm text-muted-foreground sm:block">
            Arraste para mover. Use os botões para redimensionar ou remover.
          </p>
          <div className="grid grid-cols-4 gap-2 lg:ml-auto lg:flex">
            <ToolbarButton onClick={() => setAdding(true)} disabled={!home.canAdd} icon={<Plus className="size-5" />}>
              Adicionar
            </ToolbarButton>
            <ToolbarButton
              onClick={home.undo}
              disabled={!home.canUndo}
              icon={<Undo2 className="size-5" />}
            >
              Desfazer
            </ToolbarButton>
            <ToolbarButton onClick={home.reset} icon={<RotateCcw className="size-5" />}>
              Padrão
            </ToolbarButton>
            <ToolbarButton
              onClick={() => setEditing(false)}
              primary
              icon={<Check className="size-5" />}
            >
              Concluir
            </ToolbarButton>
          </div>
        </div>
      )}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={home.items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div
            ref={gridRef}
            className="grid min-h-0 flex-1 grid-flow-dense overflow-hidden"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridAutoRows: `${rowHeight}px`,
              gap: `${gap}px`,
            }}
          >
            {home.items.map((item) => (
              <Tile
                key={item.id}
                item={item}
                editing={editing}
                onLongPress={() => setEditing(true)}
                onRemove={() => home.remove(item.id)}
                onResize={() => cycleSize(item)}
                onResizeTo={(size) => home.resize(item.id, size)}
                canResize={sizesFor(item.type, item.ref).length > 1}
                cols={cols}
                maxRows={cols === 2 ? 2 : GRID_ROWS}
                cellW={(box.width - (cols - 1) * gap) / cols}
                cellH={rowHeight}
                gap={gap}
              />
            ))}
            {editing && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdding(true)}
                disabled={!home.canAdd}
                aria-label="Adicionar item"
                className="grid place-items-center rounded-3xl border-2 border-dashed text-muted-foreground transition hover:text-primary"
              >
                <Plus className="size-8" />
              </Button>
            )}
          </div>
        </SortableContext>
      </DndContext>
      {!editing && (
        <p className="sr-only">
          Pressione e segure qualquer cartão para personalizar a tela inicial.
        </p>
      )}
      {adding && <Suspense fallback={null}><AddItemSheet
        open={adding}
        onOpenChange={setAdding}
        onAdd={(item) => {
          home.add(item);
          setAdding(false);
        }}
      /></Suspense>}
    </div>
  );
}

function ToolbarButton({
  onClick,
  icon,
  children,
  primary,
  disabled,
}: {
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={primary ? "default" : "secondary"}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 text-xs sm:flex-row sm:gap-2 sm:px-4 sm:text-sm font-semibold transition active:scale-95 disabled:opacity-40",
        primary ? "bg-primary text-primary-foreground" : "bg-secondary",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </Button>
  );
}
