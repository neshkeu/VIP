import { useVehicleDrivers } from "@/hooks/useVehicleDrivers";

type DriverLike = { id: string; role: string; vehicle_id: string | null };

// Ko je operativni i na kom vozilu vozi — po STVARNIM vezama vozač↔vozilo
// (vehicle_drivers). Staro polje role/vehicle_id ostaje kao rezerva, pa niko ko je
// do sada bio vidljiv ne nestaje (npr. vlastito vozilo bez veze), a vidljivi postaju
// i oni koji su operativni samo preko nove veze (npr. papirološki na jednom,
// operativni na drugom vozilu).
export function useDriverRoles() {
  const { links } = useVehicleDrivers();

  const isOperativni = (d: DriverLike) =>
    links.some(l => l.driver_id === d.id && l.role === "operativni") || d.role === "operativni";

  const operativeVehicleId = (d: DriverLike): string | null =>
    links.find(l => l.driver_id === d.id && l.role === "operativni")?.vehicle_id ?? d.vehicle_id ?? null;

  // Operativni vozač datog vozila (za predlog vozača po vozilu)
  const operativniForVehicle = <T extends DriverLike>(drivers: T[], vehicleId: string): T | undefined =>
    drivers.find(d => links.some(l => l.vehicle_id === vehicleId && l.driver_id === d.id && l.role === "operativni"))
    ?? drivers.find(d => d.vehicle_id === vehicleId && d.role === "operativni");

  return { isOperativni, operativeVehicleId, operativniForVehicle };
}
