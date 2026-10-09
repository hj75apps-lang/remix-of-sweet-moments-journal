export const VEHICLE_ICONS = [
  { value: "arrow", label: "Seta" },
  { value: "white", label: "Carro Branco" },
  { value: "blue", label: "Carro Azul" },
  { value: "red", label: "Carro Vermelho" },
  { value: "yellow", label: "Carro Amarelo" },
] as const;
export type VehicleIcon = (typeof VEHICLE_ICONS)[number]["value"];
export function isVehicleIcon(value: unknown): value is VehicleIcon {
  return VEHICLE_ICONS.some((icon) => icon.value === value);
}
/** Fixed artwork only: never interpolate stored/user-provided markup. */
export function vehicleIconMarkup(icon: VehicleIcon): string {
  const artwork = icon === "arrow"
    ? '<path class="vehicle-arrow-shape" d="M32 14 46 46 32 39 18 46Z" stroke-linejoin="round"/>'
    : '<g stroke-linejoin="round"><path class="vehicle-tires" d="M20 24h4v9h-4zm20 0h4v9h-4zM20 40h4v9h-4zm20 0h4v9h-4z"/><rect class="vehicle-body" x="23" y="12" width="18" height="42" rx="7"/><path class="vehicle-glass" d="m26 23 12 0-1 9H27Zm1 17h10l1 7H26Z"/><path class="vehicle-roof" d="M27 34h10v4H27Z"/><path class="vehicle-lights" d="M26 17h3m6 0h3M26 50h3m6 0h3"/></g>';
  return `<svg viewBox="0 0 64 64" class="vehicle-art vehicle-art-${icon}" aria-hidden="true"><circle class="vehicle-halo" cx="32" cy="32" r="29"/><circle class="vehicle-disc" cx="32" cy="32" r="24"/><g class="vehicle-orientation">${artwork}</g></svg>`;
}
