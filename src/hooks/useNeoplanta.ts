import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface NeoplantaRide {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  date: string;
  route: string;
  amount: number;
  paid_out: boolean;
  paid_amount?: number;
  payment_basis?: string | null;
  received_by: string;
  notes: string;
  evidenced_by: string;
  created_at: string;
}

export function useNeoplanta() {
  const [rides, setRides] = useState<NeoplantaRide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from("neoplanta_rides").select("*").order("date", { ascending: false });
    setRides(data ?? []);
    setLoading(false);
  }

  async function addRide(ride: Omit<NeoplantaRide, "id" | "created_at">) {
    const { data, error } = await supabase.from("neoplanta_rides").insert(ride).select().single();
    if (error) throw error;
    setRides(prev => [data, ...prev]);
    return data;
  }

  async function updateRide(id: string, updates: Partial<NeoplantaRide>) {
    const { data, error } = await supabase.from("neoplanta_rides").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setRides(prev => prev.map(r => r.id === id ? data : r));
    return data;
  }

  async function deleteRide(id: string) {
    const { error } = await supabase.from("neoplanta_rides").delete().eq("id", id);
    if (error) throw error;
    setRides(prev => prev.filter(r => r.id !== id));
  }

  return { rides, loading, addRide, updateRide, deleteRide, refetch: fetchAll };
}
