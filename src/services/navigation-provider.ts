import type { VehiclePosition } from "./navigation-location";
import type { NavGuidance } from "./navigation-guidance";
import type { NavigationRoute } from "./navigation-state";

export interface NavigationProviderSnapshot {
  active: boolean;
  sourcePackage: string | null;
  guidance: NavGuidance | null;
  route: NavigationRoute | null;
  position: VehiclePosition | null;
}

export interface NavigationProvider {
  readonly id: string;
  getSnapshot(): NavigationProviderSnapshot;
}

/** Adapter contract for navigation sources. Route geometry is optional and must be authoritative. */
export class ExternalNavigationProvider implements NavigationProvider {
  readonly id = "external-navigation";
  constructor(private readonly snapshot: NavigationProviderSnapshot) {}
  getSnapshot(): NavigationProviderSnapshot { return this.snapshot; }
}