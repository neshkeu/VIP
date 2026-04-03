import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface MembershipEntry {
  id: string;
  driver_id: string;
  date_from: string;
  date_to: string;
  amount: number;
  evidenced_by: string;
  created_at: string;
}

export function useMembership(driverId: string) {
  const [entries, setEntries] = useState<MembershipEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!driverId || driverId === "none") { setEntries([]); setLoading(false); return; }
    fetchAll();
  }, [driverId]);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("membership_entries")
      .select("*")
      .eq("driver_id", driverId)
      .order("date_from", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }

  async function addEntry(entry: Omit<MembershipEntry, "id"|"created_at">) {
    const { data, error } = await supabase.from("membership_entries").insert(entry).select().single();
    if (error) throw error;
    setEntries(prev => [data, ...prev]);
    return data;
  }

  // Posljednji plaćeni period
  const lastPaid = entries[0] ?? null;

  return { entries, loading, addEntry, lastPaid, refetch: fetchAll };
}
