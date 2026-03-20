import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  taxi_license_number: string;
  pos_terminal_id: string;
  registration_expiry: string;
  insurance_expiry: string;
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
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("brand");
    if (error) setError(error.message);
    else setVehicles(data ?? []);
    setLoading(false);
  }

  async function addVehicle(vehicle: Omit<Vehicle, "id" | "created_at">) {
    const { data, error } = await supabase
      .from("vehicles")
      .insert(vehicle)
      .select()
      .single();
    if (error) throw error;
    setVehicles(prev => [...prev, data]);
    return data;
  }

  return { vehicles, loading, error, addVehicle, refetch: fetchVehicles };
}
