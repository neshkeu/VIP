import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type DocStatus = "KOPIJA" | "ORIGINAL" | "NEMA" | null;

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  taxi_license_number: string;
  vin: string | null;
  pos_terminal_id: string;
  registration_expiry: string;
  insurance_expiry: string;
  taxi_license_expiry: string | null;
  udruzenje: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  leg_vozila_status: DocStatus;
  inspekcijski_status: DocStatus;
  saobracajna_status: DocStatus;
  status: "active" | "maintenance" | "inactive";
  notes: string;
  created_at: string;
}

export function useVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => { fetchVehicles(); }, []);

  async function fetchVehicles() {
    setLoading(true);
    const { data, error } = await supabase.from("vehicles").select("*").order("brand");
    if (error) setError(error.message);
    else setVehicles(data ?? []);
    setLoading(false);
  }

  async function addVehicle(vehicle: Omit<Vehicle, "id" | "created_at">) {
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
    if (error) throw error;
    setVehicles(prev => [...prev, data]);
    return data;
  }

  async function updateVehicle(id: string, updates: Partial<Vehicle>) {
    const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setVehicles(prev => prev.map(v => v.id === id ? data : v));
    return data;
  }

  return { vehicles, loading, error, addVehicle, updateVehicle, refetch: fetchVehicles };
}
