import { useEffect, useRef } from "react";
import { mapViewZoom, resolveMapPerspective, type MapPerspective } from "@/services/navigation-view";
import { VehicleIcon } from "./vehicle-icon";
import L from "leaflet";
import "leaflet-rotate";
import type { NavigationRoute } from "@/services/navigation-state";
import "leaflet/dist/leaflet.css";
import type { VehiclePosition } from "@/services/navigation-location";
import { useLauncherSettings } from "@/hooks/use-launcher-settings";
import { vehicleIconMarkup } from "@/services/vehicle-icon";
import { followHeading, headingDelta, INITIAL_HEADING } from "@/services/navigation-heading";

/** Browser-only map adapter: stable instance, theme layers and smoothed GPS following. */
export default function LiveMap({ dark, position, visible, animated, route, navigating = false }: { dark: boolean; position: VehiclePosition | null; visible: boolean; animated: boolean; route?: NavigationRoute | null; navigating?: boolean }) {
  const { settings } = useLauncherSettings();
  const el = useRef<HTMLDivElement | null>(null);
  const viewport = useRef<HTMLDivElement | null>(null);
  const previousPerspective = useRef<MapPerspective>("2d");
  const perspective = resolveMapPerspective(settings.mapView, navigating || Boolean(route?.points?.length), position?.speed ?? null, previousPerspective.current);
  useEffect(() => { previousPerspective.current = perspective; }, [perspective]);
  const zoom = mapViewZoom(perspective);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const routeRef = useRef<L.Polyline | null>(null);
  const firstFix = useRef(true);
  const heading = useRef(INITIAL_HEADING);
  const rotationFrame = useRef<number | null>(null);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { rotate: true, rotateControl: false, touchRotate: false, shiftKeyRotate: false, zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false }).setView([-15.78, -47.93], 4);
    map.attributionControl.setPrefix(false);
    // Credit stays readable outside the tilted ground plane.
    const credit = map.attributionControl.getContainer();
    if (credit && viewport.current) viewport.current.appendChild(credit);
    mapRef.current = map;
    markerRef.current = L.marker([0, 0], { interactive: false, zIndexOffset: 1000 });
    const resize = () => map.invalidateSize({ pan: false });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(el.current);
    window.addEventListener("resize", resize);
    return () => { if (rotationFrame.current !== null) cancelAnimationFrame(rotationFrame.current); ro?.disconnect(); window.removeEventListener("resize", resize); map.remove(); mapRef.current = null; tilesRef.current = null; markerRef.current = null; routeRef.current = null; firstFix.current = true; };
  }, []);
  useEffect(() => {
    markerRef.current?.setIcon(L.divIcon({ className: "vehicle-marker", html: vehicleIconMarkup(settings.vehicleIcon), iconSize: [64, 64], iconAnchor: [32, 32] }));
  }, [settings.vehicleIcon]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Keep the same layer/cache when the theme changes.
    if (!tilesRef.current) tilesRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap", className: "navigation-tiles", keepBuffer: 2 }).addTo(map);
    tilesRef.current.getContainer()?.classList.toggle("map-tiles-dark", dark);
  }, [dark]);
  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !position || !visible) return;
    const ll: L.LatLngExpression = [position.latitude, position.longitude];
    marker.setLatLng(ll);
    if (!map.hasLayer(marker)) marker.addTo(map);
    heading.current = followHeading(heading.current, position);
    const smooth = animated && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !firstFix.current;
    if (rotationFrame.current !== null) cancelAnimationFrame(rotationFrame.current);
    const targetBearing = -heading.current.heading;
    if (!smooth) map.setBearing(targetBearing);
    else {
      const from = map.getBearing();
      const delta = headingDelta(from, (targetBearing + 360) % 360);
      const started = performance.now();
      const rotate = (now: number) => {
        const progress = Math.min(1, (now - started) / 500);
        map.setBearing(from + delta * (1 - (1 - progress) ** 3));
        rotationFrame.current = progress < 1 ? requestAnimationFrame(rotate) : null;
      };
      rotationFrame.current = requestAnimationFrame(rotate);
    }
    map.stop();
    if (firstFix.current) map.setView(ll, zoom, { animate: false });
    else map.panTo(ll, { animate: smooth, duration: 0.8, easeLinearity: 0.5 });
    firstFix.current = false;
  }, [position, visible, animated, settings.vehicleIcon, zoom]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !position || !visible) return;
    map.setView([position.latitude, position.longitude], zoom, { animate: false });
  }, [zoom, visible]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!route?.points?.length) {
      routeRef.current?.removeFrom(map);
      routeRef.current = null;
      return;
    }
    const points = route.points
      .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
      .map((p) => [p.latitude, p.longitude] as L.LatLngExpression);
    if (!points.length) return;
    if (!routeRef.current) {
      routeRef.current = L.polyline(points, {
        color: "var(--primary)",
        weight: 6,
        opacity: 0.82,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(map);
    } else {
      routeRef.current.setLatLngs(points);
    }
  }, [route]);

  useEffect(() => { if (visible) mapRef.current?.invalidateSize({ pan: false }); else { mapRef.current?.stop(); if (rotationFrame.current !== null) cancelAnimationFrame(rotationFrame.current); } }, [visible]);
  return <div ref={viewport} className="navigation-map-viewport absolute inset-0 z-0 overflow-hidden" data-map-view={perspective} data-map-mode={settings.mapView} data-map-zoom={position ? zoom : 4} aria-hidden>
    <div className="navigation-map-ground"><div ref={el} className="navigation-live-map absolute inset-0 z-0" /></div>
    {perspective === "3d" && position && <div className="navigation-perspective-vehicle"><VehicleIcon icon={settings.vehicleIcon} /></div>}
  </div>;
}
