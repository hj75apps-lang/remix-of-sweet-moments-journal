import { watchVehicle, type VehiclePosition } from "./navigation-location";

type Subscriber = (position: VehiclePosition) => void;
const subscribers = new Set<Subscriber>();
let stopWatching: (() => void) | null = null;
let lastPosition: VehiclePosition | null = null;
const MAX_FIX_AGE = 10 * 60_000;

function validFix(position: VehiclePosition): boolean {
  return Number.isFinite(position.latitude) && Math.abs(position.latitude) <= 90 &&
    Number.isFinite(position.longitude) && Math.abs(position.longitude) <= 180 &&
    Number.isFinite(position.timestamp) && position.timestamp > 0;
}

function freshFix(position: VehiclePosition): boolean {
  const age = Date.now() - position.timestamp;
  return validFix(position) && age >= -30_000 && age <= MAX_FIX_AGE;
}

function ensureStarted(): void {
  if (stopWatching || subscribers.size === 0) return;
  const stop = watchVehicle((position) => {
    if (!validFix(position)) return;
    lastPosition = position;
    for (const subscriber of subscribers) subscriber(position);
  }, () => undefined);
  if (subscribers.size === 0) stop();
  else stopWatching = stop;
}

function maybeStop(): void {
  if (subscribers.size === 0 && stopWatching) {
    stopWatching();
    stopWatching = null;
  }
}

export function subscribeLocation(subscriber: Subscriber, replayLast = true): () => void {
  subscribers.add(subscriber);
  if (replayLast && lastPosition) subscriber(lastPosition);
  ensureStarted();
  return () => {
    subscribers.delete(subscriber);
    maybeStop();
  };
}

export function getLastLocation(): VehiclePosition | null {
  return lastPosition;
}

export function clearLastLocation(): void {
  lastPosition = null;
}

export function getLocationOnce(timeoutMs = 15_000): Promise<VehiclePosition> {
  if (lastPosition && freshFix(lastPosition)) return Promise.resolve(lastPosition);
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {};
    let settled = false;
    const timer: ReturnType<typeof setTimeout> = setTimeout(() => {
      settled = true;
      unsubscribe();
      reject(new Error("location_timeout"));
    }, timeoutMs);
    unsubscribe = subscribeLocation((position) => {
      if (settled || !freshFix(position)) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      resolve(position);
    }, false);
    // Some adapters can publish a fix synchronously during subscription.
    if (settled) unsubscribe();
  });
}
