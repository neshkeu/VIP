import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { DocStatus } from "./useVehicles";

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  license_number: string;
  status: "active" | "inactive";
  driver_type: "renta" | "vlastito_vozilo";
  vehicle_id: string | null;
  daily_rate: number;
  weekly_membership: number;
  pos_monthly_fee: number;
  komunalni_monthly: number;
  doprinosi_monthly: number;
  weekly_membership_own: number;
  lk_status: DocStatus;
  vozacka_status: DocStatus;
  lekarski_status: DocStatus;
  ugovor_status: DocStatus;
  ma_status: DocStatus;
  leg_vozaca_status: DocStatus;
  diploma_status: DocStatus;
  cpc_status: DocStatus;
  uverenje_grad_status: DocStatus;
  sst_status: "IMA" | "NEMA" | null;
  dipl_cpc_sst: string | null;
  notes: string;
  created_at: string;
}

export function useDrivers() {
  const [drivers, setDrivers]   = useState<Driver[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    fetchDrivers();
  }, []);

  async function fetchDrivers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("drivers")
      .select("*")
      .order("full_name");
    if (error) setError(error.message);
    else setDrivers(data ?? []);
    setLoading(false);
  }

  async function addDriver(driver: Omit<Driver, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("drivers")
      .insert(driver)
      .select()
      .single();
    if (error) throw error;
    setDrivers(prev => [...prev, data]);
    return data;
  }

  async function updateDriver(id: string, updates: Partial<Driver>) {
    const { data, error } = await supabase
      .from("drivers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setDrivers(prev => prev.map(d => d.id === id ? data : d));
    return data;
  }

  return { drivers, loading, error, addDriver, updateDriver, refetch: fetchDrivers };
}
