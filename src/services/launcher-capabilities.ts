import { getDeviceInfo, type DeviceInfo } from "./launcher-system";

let cached: DeviceInfo | null = null;
let pending: Promise<DeviceInfo | null> | null = null;

export async function getLauncherCapabilities(options: { refresh?: boolean } = {}): Promise<DeviceInfo | null> {
  if (!options.refresh && cached) return cached;
  if (!options.refresh && pending) return pending;
  pending = getDeviceInfo().then((info) => {
    cached = info;
    return info;
  }).finally(() => {
    pending = null;
  });
  return pending;
}

export function clearLauncherCapabilities(): void {
  cached = null;
}

export function supportsCapability(
  capabilities: DeviceInfo | null,
  capability: keyof Pick<DeviceInfo, "hasTelephony" | "hasBluetooth" | "hasGps" | "hasCamera" | "hasMicrophone" | "googleMaps" | "waze" | "isDefaultHome">,
): boolean {
  return capabilities?.[capability] === true;
}
