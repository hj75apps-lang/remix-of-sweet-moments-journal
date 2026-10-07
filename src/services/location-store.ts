import { watchVehicle, type VehiclePosition } from "./navigation-location";

type Subscriber = (position: VehiclePosition) => void;
const subscribers = new Set<Subscriber>();
let stopWatching: (() => void) | null = null;
let lastPosition: VehiclePosition | null = null;
let lastPositionAt = 0;

function ensureStarted(): void {
  if (stopWatching || subscribers.size === 0) return;
  stopWatching = watchVehicle((position) => {
    lastPosition = position;
    lastPositionAt = Date.now();
    for (const subscriber of subscribers) subscriber(position);
  }, () => undefined);
}

function maybeStop(): void {
  if (subscribers.size === 0 && stopWatching) {
    stopWatching();
    stopWatching = null;
  }
}

export function subscribeLocation(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  if (lastPosition) subscriber(lastPosition);
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
  if (lastPosition && Date.now() - lastPositionAt <= 10 * 60_000) return Promise.resolve(lastPosition);
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = subscribeLocation((position) => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      resolve(position);
    });
    timer = setTimeout(() => {
      unsubscribe();
      reject(new Error("location_timeout"));
    }, timeoutMs);
  });
}
