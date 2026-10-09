export function navigationNightMode(preferredDark: boolean, localTime: Date | null): boolean {
  if (!localTime || !Number.isFinite(localTime.getTime())) return preferredDark;
  const hour = localTime.getHours();
  return hour >= 18 || hour < 6 ? true : preferredDark;
}
