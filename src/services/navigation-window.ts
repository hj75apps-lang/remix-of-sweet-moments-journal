import type { NavApp } from "./launcher-system";

export interface NavigationWindowBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** CSS coordinates stay relative to the WebView; native code converts to screen pixels. */
export function navigationWindowBounds(rect: Pick<DOMRect, "left" | "top" | "right" | "bottom">): NavigationWindowBounds | null {
  const values = [rect.left, rect.top, rect.right, rect.bottom];
  if (!values.every(Number.isFinite) || rect.left < 0 || rect.top < 0 || rect.right <= rect.left || rect.bottom <= rect.top) return null;
  return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
}

interface WindowPlugin {
  openNavigationWindow(options: { app: NavApp; bounds: NavigationWindowBounds }): Promise<{ requested: boolean }>;
}

export async function openNavigationWindow(app: NavApp, bounds: NavigationWindowBounds): Promise<void> {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: { LauncherSystem?: WindowPlugin } } }).Capacitor;
  const plugin = cap?.Plugins?.LauncherSystem;
  if (!cap?.isNativePlatform?.() || !plugin?.openNavigationWindow) throw new Error("window_unavailable");
  const result = await plugin.openNavigationWindow({ app, bounds });
  // A request is not proof of the external window's position or persistence.
  if (!result.requested) throw new Error("window_unsupported");
}