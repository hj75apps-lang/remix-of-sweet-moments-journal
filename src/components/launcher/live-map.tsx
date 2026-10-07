import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { VehiclePosition } from "@/services/navigation-location";

/** Browser-only map adapter: stable instance, theme layers and smoothed GPS following. */
export default function LiveMap({ dark, position, visible, animated }: { dark: boolean; position: VehiclePosition | null; visible: boolean; animated: boolean }) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const firstFix = useRef(true);
  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, { zoomControl: false, attributionControl: true, dragging: false, scrollWheelZoom: false, doubleClickZoom: false, touchZoom: false, keyboard: false }).setView([-15.78, -47.93], 4);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    markerRef.current = L.marker([0, 0], { interactive: false, icon: L.divIcon({ className: "vehicle-marker", html: '<span class="vehicle-heading"></span><span class="vehicle-dot"></span>', iconSize: [36, 36], iconAnchor: [18, 18] }) });
    const resize = () => map.invalidateSize({ pan: false });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    ro?.observe(el.current);
    window.addEventListener("resize", resize);
    return () => { ro?.disconnect(); window.removeEventListener("resize", resize); map.remove(); mapRef.current = null; tilesRef.current = null; markerRef.current = null; firstFix.current = true; };
  }, []);
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
    const icon = marker.getElement();
    icon?.style.setProperty("--vehicle-heading", `${position.heading ?? 0}deg`);
    icon?.classList.toggle("has-heading", position.heading !== null);
    const smooth = animated && !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !firstFix.current;
    map.stop();
    if (firstFix.current) map.setView(ll, 16, { animate: false });
    else map.panTo(ll, { animate: smooth, duration: 0.8, easeLinearity: 0.5 });
    firstFix.current = false;
  }, [position, visible, animated]);
  useEffect(() => { if (visible) mapRef.current?.invalidateSize({ pan: false }); else mapRef.current?.stop(); }, [visible]);
  return <div ref={el} className="absolute inset-0 z-0" aria-hidden />;
}
