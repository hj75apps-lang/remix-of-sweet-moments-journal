import type { NavApp } from "./launcher-system";

export interface NavigationLaunch {
  app: NavApp;
  destination: string;
  latitude?: number;
  longitude?: number;
}

export function buildNavigationUrl(input: NavigationLaunch): string {
  const destination = input.destination.trim();
  const coordinates =
    Number.isFinite(input.latitude) && Number.isFinite(input.longitude)
      ? `${input.latitude},${input.longitude}`
      : "";

  if (input.app === "waze") {
    if (coordinates) return `https://waze.com/ul?ll=${encodeURIComponent(coordinates)}&navigate=yes`;
    return `https://waze.com/ul?q=${encodeURIComponent(destination)}&navigate=yes`;
  }

  const target = coordinates || destination;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}&travelmode=driving&dir_action=navigate`;
}