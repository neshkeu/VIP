import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface FuelPdvEntry {
  id: string;
  driver_id: string;
  date: string;
  amount: number;
  evidenced_by: string;
  created_at: string;
}

const PDV_MONTHLY_LIMIT = 4000;

export function useFuelPdv(driverId: string, month: string) {
  const [entries, setEntries] = useState<FuelPdvEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId || driverId === "none") { setEntries([]); setLoading(false); return; }
    fetchAll();
  }, [driverId, month]);

  async function fetchAll() {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const { data } = await supabase
      .from("fuel_pdv_entries")
      .select("*")
      .eq("driver_id", driverId)
      .gte("date", `${month}-01`)
      .lte("date", `${month}-${String(lastDay).padStart(2,"0")}`)
      .order("date", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }

  async function addEntry(entry: Omit<FuelPdvEntry, "id"|"created_at">) {
    const { data, error } = await supabase.from("fuel_pdv_entries").insert(entry).select().single();
    if (error) throw error;
    setEntries(prev => [data, ...prev]);
    return data;
  }

  const totalThisMonth = entries.reduce((s, e) => s + e.amount, 0);
  const remaining = Math.max(0, PDV_MONTHLY_LIMIT - totalThisMonth);

  return { entries, loading, addEntry, totalThisMonth, remaining, PDV_MONTHLY_LIMIT, refetch: fetchAll };
}
