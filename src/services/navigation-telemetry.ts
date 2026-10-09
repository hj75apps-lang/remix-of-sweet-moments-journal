import type { NavigationConnectTelemetry } from "./navigation-connect";

/** Preserve geometry identity when only the progress/ETA snapshot changed. */
export function reconcileNavigationTelemetry(previous: NavigationConnectTelemetry | null, next: NavigationConnectTelemetry): NavigationConnectTelemetry {
  if (!previous || previous.tripId !== next.tripId) return next;
  const oldPoints = previous.route?.points;
  const points = next.route?.points;
  const samePoints = oldPoints === points || Boolean(oldPoints && points && oldPoints.length === points.length &&
    oldPoints.every((point, index) => point.latitude === points[index]?.latitude && point.longitude === points[index]?.longitude));
  let route = next.route;
  if (previous.route && route && samePoints) {
    const sameMetrics = previous.route.remainingDistanceMeters === route.remainingDistanceMeters &&
      previous.route.remainingDurationSeconds === route.remainingDurationSeconds && previous.route.etaEpochMs === route.etaEpochMs;
    route = sameMetrics ? previous.route : { ...route, points: previous.route.points };
  }
  if (previous.state === next.state && previous.active === next.active && previous.sourcePackage === next.sourcePackage &&
    previous.latitude === next.latitude && previous.longitude === next.longitude && previous.etaEpochMs === next.etaEpochMs &&
    previous.remainingDistanceMeters === next.remainingDistanceMeters && previous.remainingDurationSeconds === next.remainingDurationSeconds &&
    previous.updatedAt === next.updatedAt && previous.route === route) return previous;
  return route && route !== next.route ? { ...next, route } : next;
}