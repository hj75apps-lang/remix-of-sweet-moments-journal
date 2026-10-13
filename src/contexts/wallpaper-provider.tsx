import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { WallpaperContext } from "./wallpaper-context";
import { DEFAULT_WALLPAPER, readWallpaper, writeWallpaper, type WallpaperState } from "@/services/wallpaper";
export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState(DEFAULT_WALLPAPER);
  const [draft, setDraft] = useState<WallpaperState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void readWallpaper().then(value => { if (active) setSaved(value); })
      .catch(() => { if (active) setError("Não foi possível recuperar o papel de parede salvo."); })
      .finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);
  const visible = draft ?? saved;
  useEffect(() => {
    const body = document.body;
    const image = visible.active ? visible.image : null;
    body.classList.toggle("wallpaper-active", !!image);
    if (image) {
      body.style.setProperty("--wallpaper-image", `url("${image.data}")`);
      body.style.setProperty("--wallpaper-size", visible.fit === "center" ? "auto" : visible.fit);
    } else { body.style.removeProperty("--wallpaper-image"); body.style.removeProperty("--wallpaper-size"); }
    return () => { body.classList.remove("wallpaper-active"); body.style.removeProperty("--wallpaper-image"); body.style.removeProperty("--wallpaper-size"); };
  }, [visible]);
  const save = useCallback(async (value: WallpaperState) => {
    await writeWallpaper(value); setSaved(value); setDraft(null); setError("");
  }, []);
  const value = useMemo(() => ({ saved, visible, ready, error, preview: setDraft, save }), [saved, visible, ready, error, save]);
  return <WallpaperContext.Provider value={value}>{children}</WallpaperContext.Provider>;
}
