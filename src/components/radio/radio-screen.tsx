import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Play,
  Pause,
  Heart,
  Search,
  Volume2,
  VolumeX,
  Loader2,
  Radio as RadioIcon,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  BadgeCheck,
  X,
  Plus,
  Trash2,
} from "lucide-react";
import { discoverRadioWebsite } from "@/services/radio-network";
import {
  fetchCatalog,
  fetchByName,
  looksLikeUrl,
  type RadioStation,
} from "@/services/radio-browser";
import {
  searchStations,
  mergeStations,
  facetValues,
  normalizeText,
  type StationFilters,
} from "@/services/radio-search";
import { useRadio } from "@/contexts/radio-player-context";
import { rankRadioStations } from "@/services/radio-listening";
import { RadioEqualizer } from "./radio-equalizer";
import { CustomStationForm } from "./custom-station-form";
import { useCustomStations } from "@/hooks/use-custom-stations";
import { cn } from "@/lib/utils";

function StationLogo({ station, className }: { station: RadioStation; className?: string }) {
  const [broken, setBroken] = useState(false);
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-primary",
        className,
      )}
    >
      {station.favicon && !broken ? (
        <img
          src={station.favicon}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          className="size-full object-cover"
        />
      ) : (
        <RadioIcon className="size-1/2" aria-hidden />
      )}
    </span>
  );
}

function Bars({ active }: { active: boolean }) {
  return (
    <span className="flex h-6 items-end gap-1" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-1 origin-bottom rounded-full bg-primary",
            active ? "animate-[eq_0.9s_ease-in-out_infinite_alternate]" : "h-1",
          )}
          style={active ? { animationDelay: `${i * 0.12}s`, height: "100%" } : undefined}
        />
      ))}
    </span>
  );
}

const CODECS = ["MP3", "AAC"] as const;

/** Live internet radio: tolerant search, filters, resilient playback, safe EQ. */
export function RadioScreen() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "fav" | "mine">("all");
  const [showAdd, setShowAdd] = useState(false);
  const custom = useCustomStations();
  const [filters, setFilters] = useState<StationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [showEq, setShowEq] = useState(false);
  const deferred = useDeferredValue(query);
  const [remoteQuery, setRemoteQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setRemoteQuery(deferred.trim().slice(0, 300)), 300);
    return () => window.clearTimeout(timer);
  }, [deferred]);

  const catalog = useQuery({
    queryKey: ["radio-catalog"],
    queryFn: () => fetchCatalog(),
    staleTime: 30 * 60_000,
  });
  const remote = useQuery({
    queryKey: ["radio-name", remoteQuery],
    queryFn: () => fetchByName(remoteQuery),
    enabled: remoteQuery.length >= 3,
    staleTime: 10 * 60_000,
  });

  const isUrl = looksLikeUrl(deferred);
  const remoteIsUrl = looksLikeUrl(remoteQuery);
  const site = useQuery({
    queryKey: ["radio-site", remoteQuery],
    queryFn: () => discoverRadioWebsite(remoteQuery),
    enabled: remoteIsUrl,
    staleTime: 30 * 60_000,
    retry: false,
  });
  const siteStation = useMemo<RadioStation[]>(() => {
    const d = site.data;
    if (!remoteIsUrl || !d || d.status !== "found") return [];
    return [
      {
        id: `site-${d.homepage}`,
        name: d.name,
        sources: d.sources,
        favicon: d.favicon,
        tags: [],
        state: "",
        bitrate: 0,
        codec: "",
        homepage: d.homepage,
      },
    ];
  }, [site.data, remoteIsUrl]);
  const all = useMemo(
    () =>
      mergeStations(custom.stations, siteStation, catalog.data?.stations ?? [], remote.data ?? []),
    [custom.stations, siteStation, catalog.data, remote.data],
  );
  const facets = useMemo(() => facetValues(all), [all]);
  const results = useMemo(() => searchStations(all, deferred, filters), [all, deferred, filters]);

  const player = useRadio();
  const setQueue = player.setQueue;
  const filteredList = useMemo(() =>
    tab === "fav"
      ? searchStations(player.favorites, deferred, filters)
      : tab === "mine"
        ? searchStations(custom.stations, deferred, filters)
        : results, [tab, player.favorites, custom.stations, deferred, filters, results]);
  const list = useMemo(() => rankRadioStations(filteredList, player.listeningHistory), [filteredList, player.listeningHistory]);
  const current = player.station;
  // Listening updates reorder the display, not the next/previous traversal.
  useEffect(() => setQueue(filteredList), [filteredList, setQueue]);
  const step = player.step;
  const isFav = (s: RadioStation) => player.favorites.some((f) => f.id === s.id);
  const playing = player.status === "playing";
  const busy = player.status === "loading" || player.status === "reconnecting";
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const isLoading = tab === "all" && catalog.isLoading;

  return (
    <div className="grid min-h-0 min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:gap-4">
      {/* Now playing */}
      <section
        aria-label="Tocando agora"
        className="relative flex min-h-0 flex-col overflow-hidden rounded-3xl border bg-card p-4 shadow-[var(--shadow-card)] lg:p-6"
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl transition-opacity duration-700",
            playing ? "opacity-100" : "opacity-30",
          )}
        />
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <RadioIcon className="size-4" aria-hidden /> Rádios Online
          </p>
          <button
            type="button"
            onClick={() => setShowEq((v) => !v)}
            aria-expanded={showEq}
            aria-label="Equalizador"
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-2xl px-3 text-xs font-semibold transition",
              showEq ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            <SlidersHorizontal className="size-4" /> EQ
          </button>
        </div>

        {showEq ? (
          <RadioEqualizer
            enabled={player.eqEnabled}
            status={player.eqStatus}
            gains={player.gains}
            onToggle={player.setEq}
            onGain={player.setGain}
          />
        ) : current ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <div className="relative">
              <span
                className={cn(
                  "absolute inset-0 rounded-full border-2 border-primary/40",
                  playing && "animate-ping",
                )}
                aria-hidden
              />
              <StationLogo station={current} className="relative size-20 rounded-full lg:size-32" />
            </div>
            <div className="min-w-0 max-w-full">
              <h2 className="truncate font-display text-xl font-semibold lg:text-2xl">
                {current.name}
              </h2>
              <p className="truncate text-sm text-muted-foreground">
                {[current.state, current.bitrate ? `${current.bitrate} kbps` : "", current.codec]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div
              className="flex min-h-6 flex-wrap items-center justify-center gap-2 text-sm"
              aria-live="polite"
              data-testid="radio-status"
            >
              {player.status === "loading" && (
                <>
                  <Loader2 className="size-4 animate-spin text-primary" /> Conectando…
                </>
              )}
              {player.status === "reconnecting" && (
                <>
                  <Loader2 className="size-4 animate-spin text-primary" /> Conexão caiu,
                  reconectando…
                </>
              )}
              {playing && (
                <>
                  <Bars active /> <span className="font-medium text-primary">AO VIVO</span>
                </>
              )}
              {playing && player.sourceIndex > 0 && (
                <span className="text-xs text-muted-foreground">(fonte alternativa)</span>
              )}
              {player.status === "paused" && <span className="text-muted-foreground">Pausado</span>}
              {player.status === "error" && (
                <span className="text-destructive">
                  Esta rádio não respondeu após várias tentativas. Tente outra.
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
            <RadioIcon className="size-12 text-primary" aria-hidden />
            <p className="font-semibold">Escolha uma rádio</p>
            <p className="text-sm text-muted-foreground">
              Toque em uma estação da lista para ouvir ao vivo.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Rádio anterior"
            onClick={() => step(-1)}
            disabled={!list.length}
            className="grid size-12 place-items-center rounded-full bg-secondary transition active:scale-95 disabled:opacity-40"
          >
            <SkipBack className="size-5" />
          </button>
          <button
            type="button"
            aria-label={playing || busy ? "Pausar" : "Tocar"}
            onClick={player.toggle}
            disabled={!current}
            className="grid size-16 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-card)] transition active:scale-95 disabled:opacity-40"
          >
            {playing || busy ? (
              <Pause className="size-7" />
            ) : (
              <Play className="size-7 translate-x-0.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Próxima rádio"
            onClick={() => step(1)}
            disabled={!list.length}
            className="grid size-12 place-items-center rounded-full bg-secondary transition active:scale-95 disabled:opacity-40"
          >
            <SkipForward className="size-5" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            aria-label={player.volume === 0 ? "Ativar som" : "Silenciar"}
            onClick={() => player.setVolume(player.volume === 0 ? 0.8 : 0)}
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground"
          >
            {player.volume === 0 ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={player.volume}
            aria-label="Volume"
            onChange={(e) => player.setVolume(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer accent-primary"
          />
          {current && (
            <button
              type="button"
              aria-label={isFav(current) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
              aria-pressed={isFav(current)}
              onClick={() => player.toggleFavorite(current)}
              className="grid size-11 shrink-0 place-items-center rounded-full"
            >
              <Heart
                className={cn(
                  "size-5",
                  isFav(current) ? "fill-primary text-primary" : "text-muted-foreground",
                )}
              />
            </button>
          )}
        </div>
      </section>

      {/* Station list */}
      <section
        aria-label="Estações"
        className="flex min-h-0 flex-col gap-2 overflow-hidden rounded-3xl border bg-card p-3 lg:p-4"
      >
        <div className="flex flex-wrap gap-2">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-2xl bg-secondary px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="sr-only">Buscar rádio</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nome, frequência, cidade, estado ou endereço…"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            {(remote.isFetching || site.isFetching) && (
              <Loader2
                className="size-4 shrink-0 animate-spin text-muted-foreground"
                aria-label="Buscando mais rádios"
              />
            )}
          </label>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            aria-expanded={showFilters}
            aria-label="Filtros"
            className={cn(
              "relative grid size-11 shrink-0 place-items-center rounded-2xl",
              showFilters ? "bg-primary text-primary-foreground" : "bg-secondary",
            )}
          >
            <SlidersHorizontal className="size-4" />
            {activeFilters > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[0.625rem] text-primary-foreground ring-2 ring-card">
                {activeFilters}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            aria-label="Adicionar rádio manualmente"
            className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary"
          >
            <Plus className="size-4" />
          </button>
          <div role="tablist" aria-label="Lista" className="flex rounded-2xl bg-secondary p-1">
            {(["all", "fav", "mine"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  "min-h-9 rounded-xl px-3 text-xs font-semibold transition",
                  tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                )}
              >
                {t === "all"
                  ? "Todas"
                  : t === "mine"
                    ? `Minhas${custom.stations.length ? ` (${custom.stations.length})` : ""}`
                    : `Favoritas${player.favorites.length ? ` (${player.favorites.length})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        {showFilters && (
          <div
            className="flex flex-col gap-2 rounded-2xl bg-secondary/50 p-2"
            aria-label="Filtros de rádio"
          >
            <div className="flex flex-wrap gap-2">
              <select
                value={filters.state ?? ""}
                onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value || undefined }))}
                aria-label="Estado"
                className="min-h-9 rounded-xl border bg-card px-2 text-xs"
              >
                <option value="">Todos os estados</option>
                {facets.states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {CODECS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={filters.codec === c}
                  onClick={() =>
                    setFilters((f) => ({ ...f, codec: f.codec === c ? undefined : c }))
                  }
                  className={cn(
                    "min-h-9 rounded-xl px-3 text-xs font-semibold",
                    filters.codec === c ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {c}
                </button>
              ))}
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters({})}
                  className="flex min-h-9 items-center gap-1 rounded-xl px-2 text-xs text-muted-foreground"
                >
                  <X className="size-3" /> Limpar
                </button>
              )}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1" aria-label="Estilos">
              {facets.genres.map((g) => (
                <button
                  key={g}
                  type="button"
                  aria-pressed={filters.genre === g}
                  onClick={() =>
                    setFilters((f) => ({ ...f, genre: f.genre === g ? undefined : g }))
                  }
                  className={cn(
                    "min-h-8 shrink-0 rounded-full px-3 text-xs capitalize",
                    filters.genre === g ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}

        <ul
          className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto overscroll-contain pr-1"
          aria-label="Lista de rádios"
        >
          {isLoading &&
            Array.from({ length: 8 }, (_, i) => (
              <li key={i} className="h-24 animate-pulse rounded-2xl bg-secondary" />
            ))}
          {!isLoading && list.length === 0 && (
            <li className="col-span-full p-4 text-center text-sm text-muted-foreground">
              {tab === "mine"
                ? "Toque em + para adicionar uma rádio pelo endereço da transmissão."
                : tab === "fav"
                  ? "Toque no coração de uma rádio para salvá-la aqui."
                  : site.isFetching
                    ? "Procurando a transmissão no site da rádio…"
                    : isUrl && site.data?.status === "blocked"
                      ? "O site desta rádio bloqueia a busca automática. Use + para adicionar pelo endereço da transmissão."
                      : isUrl && site.data
                        ? "Não achei a transmissão neste site. Use + para adicionar pelo endereço da transmissão."
                        : remote.isFetching
                          ? "Buscando…"
                          : "Nenhuma rádio encontrada. Tente outro nome ou limpe os filtros."}
            </li>
          )}
          {list.slice(0, 150).map((s) => {
            const active = current?.id === s.id;
            return (
              <li key={s.id} className="radio-station-row flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => player.play(s)}
                  aria-current={active || undefined}
                  className={cn(
                    "flex min-h-24 w-full min-w-0 flex-1 items-center gap-[1.125rem] rounded-2xl p-3 text-left transition active:scale-[0.98]",
                    active ? "bg-primary/15 ring-1 ring-primary" : "hover:bg-secondary",
                  )}
                >
                  <StationLogo station={s} className="size-[4.5rem]" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1">
                      <span className="min-w-0 break-words text-[1.3125rem] font-semibold leading-snug">{s.name}</span>
                      {s.verified && (
                        <BadgeCheck
                          className="size-[1.3125rem] shrink-0 text-primary"
                          aria-label="Transmissão verificada"
                        />
                      )}
                    </span>
                    <span className="block break-words text-lg leading-snug text-muted-foreground">
                      {[s.frequency, s.city, s.state, ...s.tags.slice(0, 2)]
                        .filter(Boolean)
                        .join(" · ") || "Ao vivo"}
                      {s.sources.length > 1 ? ` · ${s.sources.length} fontes` : ""}
                    </span>
                  </span>
                  {active && <Bars active={playing} />}
                </button>
                {s.custom && (
                  <button
                    type="button"
                    onClick={() => custom.remove(s.id)}
                    aria-label={`Remover ${s.name}`}
                    className="grid size-11 shrink-0 place-items-center rounded-2xl text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="text-[0.625rem] text-muted-foreground">
          {catalog.data?.offlineCatalog
            ? "Diretório Radio Browser indisponível: mostrando só as rádios verificadas."
            : `${all.length} estações · diretório Radio Browser + catálogo verificado`}
        </p>
      </section>
      <CustomStationForm
        open={showAdd}
        onOpenChange={setShowAdd}
        onSave={(st) => {
          custom.add(st);
          setTab("mine");
          player.play(st);
        }}
      />
    </div>
  );
}
