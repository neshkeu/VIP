import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type VDRole = "operativni" | "papiroloski";

export interface VehicleDriver {
  id: string;
  vehicle_id: string;
  driver_id: string;
  role: VDRole;
  created_at: string;
}

function useVehicleDriversState() {
  const [links, setLinks] = useState<VehicleDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from("vehicle_drivers").select("*");
    setLinks(data ?? []);
    setLoading(false);
  }

  async function addLink(vehicleId: string, driverId: string, role: VDRole) {
    const { data, error } = await supabase.from("vehicle_drivers")
      .upsert({ vehicle_id: vehicleId, driver_id: driverId, role }, { onConflict: "vehicle_id,driver_id" })
      .select().single();
    if (error) throw error;
    setLinks(prev => {
      const exists = prev.find(l => l.vehicle_id === vehicleId && l.driver_id === driverId);
      return exists ? prev.map(l => l.id === data.id ? data : l) : [...prev, data];
    });
    return data;
  }

  async function removeLink(id: string) {
    const { error } = await supabase.from("vehicle_drivers").delete().eq("id", id);
    if (error) throw error;
    setLinks(prev => prev.filter(l => l.id !== id));
  }

  const forVehicle = (vehicleId: string) => links.filter(l => l.vehicle_id === vehicleId);
  const forDriver  = (driverId: string) => links.filter(l => l.driver_id === driverId);

  return { links, loading, addLink, removeLink, forVehicle, forDriver, refetch: fetchAll };
}

type VDApi = ReturnType<typeof useVehicleDriversState>;
const Ctx = createContext<VDApi | null>(null);

// Jedno deljeno stanje za celu aplikaciju → izmena u modalu je odmah vidljiva u listi.
export function VehicleDriversProvider({ children }: { children: ReactNode }) {
  const value = useVehicleDriversState();
  return createElement(Ctx.Provider, { value }, children);
}

export function useVehicleDrivers(): VDApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVehicleDrivers mora biti unutar VehicleDriversProvider");
  return ctx;
}
