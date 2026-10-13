import { Capacitor, registerPlugin } from "@capacitor/core";
export type WallpaperFit = "cover" | "contain" | "center";
export interface WallpaperImage { data: string; name: string }
export interface WallpaperState { version: 1; active: boolean; fit: WallpaperFit; image: WallpaperImage | null }
export const DEFAULT_WALLPAPER: WallpaperState = { version: 1, active: false, fit: "cover", image: null };
const MAX_DATA = 5 * 1024 * 1024;
const NativeWallpaper = registerPlugin<{ read(): Promise<{ value: string | null }>; write(options: { value: string }): Promise<void> }>("LauncherWallpaper");
export function isWallpaperState(value: unknown): value is WallpaperState {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<WallpaperState>;
  return v.version === 1 && typeof v.active === "boolean" &&
    (v.fit === "cover" || v.fit === "contain" || v.fit === "center") &&
    (v.image === null ? !v.active : !!v.image && typeof v.image.name === "string" && v.image.name.length <= 160 &&
      typeof v.image.data === "string" && v.image.data.length <= MAX_DATA && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v.image.data));
}
function openStore(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("sal-wallpaper", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("preferences");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(new Error("Não foi possível acessar o armazenamento do papel de parede."));
  });
}
export async function readWallpaper(): Promise<WallpaperState> {
  let value: unknown;
  if (Capacitor.isNativePlatform()) {
    const result = await NativeWallpaper.read();
    value = result.value ? JSON.parse(result.value) : null;
  } else {
    const db = await openStore();
    try {
      value = await new Promise<unknown>((resolve, reject) => {
        const r = db.transaction("preferences").objectStore("preferences").get("current");
        r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error);
      });
    } finally { db.close(); }
  }
  return isWallpaperState(value) ? value : DEFAULT_WALLPAPER;
}
export async function writeWallpaper(value: WallpaperState): Promise<void> {
  if (!isWallpaperState(value)) throw new Error("Papel de parede inválido.");
  if (Capacitor.isNativePlatform()) { await NativeWallpaper.write({ value: JSON.stringify(value) }); return; }
  const db = await openStore();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("preferences", "readwrite");
      tx.objectStore("preferences").put(value, "current");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(new Error("Sem espaço para salvar o papel de parede."));
    });
  } finally { db.close(); }
}
export async function importWallpaper(file: File): Promise<WallpaperImage> {
  if (!/\.(jpe?g|png|webp)$/i.test(file.name) || (file.type && !/^image\/(jpeg|png|webp)$/.test(file.type))) throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
  if (!file.size || file.size > 20 * 1024 * 1024) throw new Error("A imagem deve ter até 20 MB e não pode estar vazia.");
  const source = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image(); img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Não foi possível abrir a imagem. O arquivo pode estar corrompido.")); img.src = source;
    });
    if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24000000) throw new Error("Escolha uma imagem de até 24 megapixels.");
    const scale = Math.min(1, 2560 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d"); if (!context) throw new Error("Não foi possível preparar a imagem.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL("image/png");
    if (data.length > MAX_DATA) data = canvas.toDataURL("image/jpeg", 0.9);
    if (data.length > MAX_DATA) data = canvas.toDataURL("image/jpeg", 0.75);
    if (data.length > MAX_DATA) throw new Error("A imagem é muito grande para salvar. Escolha uma versão menor.");
    return { data, name: file.name.slice(0, 160) };
  } finally { URL.revokeObjectURL(source); }
}
