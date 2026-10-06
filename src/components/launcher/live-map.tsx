import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/** Browser-only live map following the vehicle position (OpenStreetMap tiles). */
export default function LiveMap({ dark }: { dark: boolean }) {
  const el = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    if (!el.current) return;
    const map = L.map(el.current, {
      zoomControl: false,
      attributionControl: true,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      keyboard: false,
    }).setView([-15.78, -47.93], 4);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    const marker = L.circleMarker([0, 0], {
      radius: 9,
      color: "#fff",
      weight: 3,
      fillColor: "var(--primary)",
      fillOpacity: 1,
    });
    let first = true;
    const watch = navigator.geolocation?.watchPosition(
      (p) => {
        const ll: L.LatLngExpression = [p.coords.latitude, p.coords.longitude];
        marker.setLatLng(ll).addTo(map);
        map.setView(ll, first ? 16 : map.getZoom(), { animate: !first });
        first = false;
      },
      () => undefined,
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(el.current);
    return () => {
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    tilesRef.current?.remove();
    tilesRef.current = L.tileLayer(
      dark
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 19, attribution: "© OpenStreetMap © CARTO" },
    ).addTo(map);
  }, [dark]);

  return <div ref={el} className="absolute inset-0 z-0" aria-hidden />;
}
