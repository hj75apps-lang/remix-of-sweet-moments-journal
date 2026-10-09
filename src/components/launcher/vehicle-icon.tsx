import { vehicleIconMarkup, type VehicleIcon as VehicleIconChoice } from "@/services/vehicle-icon";
export function VehicleIcon({ icon }: { icon: VehicleIconChoice }) {
  return <span className="vehicle-icon-preview" aria-hidden="true" dangerouslySetInnerHTML={{ __html: vehicleIconMarkup(icon) }} />;
}
