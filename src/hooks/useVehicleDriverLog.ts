import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export type VDLogAction = "added" | "removed" | "deactivated";

export interface VehicleDriverLog {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  role: string | null;
  action: VDLogAction;
  date: string;
  performed_by: string | null;
  note: string | null;
  created_at: string;
}

function useVehicleDriverLogState() {
  const [logs, setLogs] = useState<VehicleDriverLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_driver_log")
      .select("*")
      .order("created_at", { ascending: false });
    setLogs(data ?? []);
    setLoading(false);
  }

  // Upis traga NE sme da obori glavnu operaciju (dodavanje/uklanjanje vozača).
  // Ako tabela još ne postoji (SQL nije pokrenut), samo upozori u konzoli.
  async function addLog(entry: Omit<VehicleDriverLog, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("vehicle_driver_log")
      .insert(entry)
      .select()
      .single();
    if (error) {
      console.warn("vehicle_driver_log upis nije uspeo (pokreni SQL migraciju?):", error.message);
      return null;
    }
    setLogs(prev => [data, ...prev]);
    return data;
  }

  const forVehicle = (vehicleId: string) => logs.filter(l => l.vehicle_id === vehicleId);
  const forDriver  = (driverId: string)  => logs.filter(l => l.driver_id === driverId);

  return { logs, loading, addLog, forVehicle, forDriver, refetch: fetchAll };
}

type LogApi = ReturnType<typeof useVehicleDriverLogState>;
const Ctx = createContext<LogApi | null>(null);

// Jedno deljeno stanje → novi trag je odmah vidljiv bez refresha.
export function VehicleDriverLogProvider({ children }: { children: ReactNode }) {
  const value = useVehicleDriverLogState();
  return createElement(Ctx.Provider, { value }, children);
}

export function useVehicleDriverLog(): LogApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useVehicleDriverLog mora biti unutar VehicleDriverLogProvider");
  return ctx;
}
