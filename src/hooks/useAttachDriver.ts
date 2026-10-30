import { useApp, type Driver, type Vehicle } from "@/context/AppContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useVehicleDrivers, type VDRole } from "@/hooks/useVehicleDrivers";
import { useVehicleDriverLog } from "@/hooks/useVehicleDriverLog";
import { todayISO } from "@/lib/date";

// Jedino mesto gde se vozač vezuje za komunalni broj (vozilo) — operativni ili
// papirološki: veza, reaktivacija, period dodele (renta), staro polje i trag promena.
// Koriste ga: Komunalni broj (novo vozilo + "Vozači i istorija") i Vozači (novi vozač).
export function useAttachDriver() {
  const { drivers, updateDriver, displayName } = useApp();
  const { assignVehicle } = useAssignments();
  const { addLink, forDriver: forDriverLinks } = useVehicleDrivers();
  const { addLog } = useVehicleDriverLog();

  // driverOverride: za tek kreiranog vozača koji još nije u listi `drivers`
  return async (vehicle: Vehicle, driverId: string, role: VDRole, driverOverride?: Driver) => {
    const today = todayISO();
    const drv = driverOverride ?? drivers.find(d => d.id === driverId);
    await addLink(vehicle.id, driverId, role);
    // Ako je vozač bio neaktivan, dodavanje na vozilo ga ponovo aktivira.
    if (drv?.status === "inactive") await updateDriver(driverId, { status: "active" });
    if (role === "operativni") {
      // ZAŠTITA: stara 'legacy' papirološka veza (preko vehicle_id) na drugom vozilu
      // se sačuva kao prava veza PRE nego što prepišemo vehicle_id.
      if (drv?.vehicle_id && drv.vehicle_id !== vehicle.id && drv.role === "papiroloski"
          && !forDriverLinks(drv.id).some(l => l.vehicle_id === drv.vehicle_id)) {
        await addLink(drv.vehicle_id, drv.id, "papiroloski");
      }
      // Operativni vozač stvarno vozi auto → period dodele (snapshot rente) + staro polje.
      const snapRate = (drv?.daily_rate ?? 0) > 0 ? drv!.daily_rate : (vehicle.daily_rate || 0);
      await assignVehicle(driverId, vehicle.id, today, {
        daily_rate: snapRate,
        weekly_membership: drv?.weekly_membership ?? 0,
        weekly_membership_own: drv?.weekly_membership_own ?? 0,
        pos_monthly_fee: drv?.pos_monthly_fee ?? 0,
        komunalni_monthly: drv?.komunalni_monthly ?? 0,
        doprinosi_monthly: drv?.doprinosi_monthly ?? 0,
      }, "Dodeljeno na vozilu");
      await updateDriver(driverId, { vehicle_id: vehicle.id });
    }
    await addLog({ vehicle_id: vehicle.id, driver_id: driverId, role, action: "added", date: today, performed_by: displayName, note: null });
  };
}
