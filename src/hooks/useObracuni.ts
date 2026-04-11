import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ObracunStavka {
  id: string;
  obracun_id: string;
  type: string;
  direction: string;
  amount: number;
  description: string;
}

export interface Obracun {
  id: string;
  driver_id: string;
  date: string;
  total_duguje: number;
  total_prima: number;
  saldo: number;
  evidenced_by: string;
  notes: string;
  created_at: string;
  stavke?: ObracunStavka[];
}

export function useObracuni(driverId?: string) {
  const [obracuni, setObracuni] = useState<Obracun[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchAll(); }, [driverId]);

  async function fetchAll() {
    setLoading(true);
    let q = supabase.from("obracuni").select("*, stavke:obracun_stavke(*)").order("date", { ascending: false });
    if (driverId && driverId !== "none") q = q.eq("driver_id", driverId);
    const { data } = await q;
    setObracuni(data ?? []);
    setLoading(false);
  }

  async function saveObracun(data: {
    driver_id: string; date: string; total_duguje: number;
    total_prima: number; saldo: number; evidenced_by: string; notes: string;
    stavke: Omit<ObracunStavka, "id"|"obracun_id">[];
  }) {
    const { data: ob, error } = await supabase.from("obracuni").insert({
      driver_id: data.driver_id, date: data.date,
      total_duguje: data.total_duguje, total_prima: data.total_prima,
      saldo: data.saldo, evidenced_by: data.evidenced_by, notes: data.notes
    }).select().single();
    if (error) throw error;

    if (data.stavke.length > 0) {
      const { error: se } = await supabase.from("obracun_stavke").insert(
        data.stavke.map(s => ({ ...s, obracun_id: ob.id }))
      );
      if (se) throw se;
    }
    await fetchAll();
    return ob;
  }

  return { obracuni, loading, saveObracun, refetch: fetchAll };
}
