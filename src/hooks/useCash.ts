import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CashEntry {
  id: string; type: string; direction: "in"|"out";
  driver_id: string|null; amount: number; date: string;
  description: string; received_by: string; notes: string; created_at: string;
}

export function useCash(month: string) {
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string|null>(null);

  useEffect(() => { fetchEntries(); }, [month]);

  async function fetchEntries() {
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const from = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const to = `${month}-${String(lastDay).padStart(2,"0")}`;
    const { data, error } = await supabase
      .from("cash_entries").select("*")
      .gte("date", from).lte("date", to)
      .order("date", { ascending: false });
    if (error) setError(error.message);
    else setEntries(data ?? []);
    setLoading(false);
  }

  async function addEntry(entry: Omit<CashEntry, "id"|"created_at">) {
    const { data, error } = await supabase.from("cash_entries").insert(entry).select().single();
    if (error) throw error;
    setEntries(prev => [data, ...prev]);
    return data;
  }

  const total_in  = entries.filter(e => e.direction === "in").reduce((s,e) => s+e.amount, 0);
  const total_out = entries.filter(e => e.direction === "out").reduce((s,e) => s+e.amount, 0);
  const balance   = total_in - total_out;

  return { entries, loading, error, addEntry, refetch: fetchEntries, total_in, total_out, balance };
}
