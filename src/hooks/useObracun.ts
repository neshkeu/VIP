import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ObracunDay {
  id: string;
  date: string;
  confirmed: boolean;
  confirmed_by: string;
  total_in: number;
  total_out: number;
}

export interface StornoLog {
  id: string;
  date: string;
  reason: string;
  storno_by: string;
  created_at: string;
}

export function useObracun(month: string) {
  const [obracunDays, setObracunDays] = useState<ObracunDay[]>([]);
  const [stornoLogs, setStornoLogs]   = useState<StornoLog[]>([]);

  useEffect(() => { fetchObracun(); }, [month]);

  async function fetchObracun() {
    const from = `${month}-01`;
    const to   = `${month}-31`;
    const [{ data }, { data: logs }] = await Promise.all([
      supabase.from("obracun_days").select("*").gte("date", from).lte("date", to),
      supabase.from("obracun_storno_log").select("*").gte("date", from).lte("date", to).order("created_at", { ascending: false }),
    ]);
    // Normalizuj datum (ako kolona vraća timestamp sa vremenom) na YYYY-MM-DD
    const norm = (rows: any[] | null) => (rows ?? []).map(r => ({ ...r, date: (r.date ?? "").slice(0, 10) }));
    setObracunDays(norm(data));
    setStornoLogs(norm(logs));
  }

  function getStornoLogs(date: string) {
    return stornoLogs.filter(l => l.date === date);
  }

  async function closeObracun(date: string, confirmedBy: string, totalIn: number, totalOut: number) {
    const { data, error } = await supabase
      .from("obracun_days")
      .upsert({ date, confirmed: true, confirmed_by: confirmedBy, total_in: totalIn, total_out: totalOut }, { onConflict: "date" })
      .select().single();
    if (error) throw error;
    const row = { ...data, date: (data.date ?? "").slice(0, 10) };
    setObracunDays(prev => {
      const exists = prev.find(o => o.date === row.date);
      return exists ? prev.map(o => o.date === row.date ? row : o) : [...prev, row];
    });
  }

  async function stornoObracun(date: string, reason: string, by: string) {
    // 1) Zapiši u audit log (ostaje trag zauvek)
    const { data: log, error: le } = await supabase
      .from("obracun_storno_log")
      .insert({ date, reason, storno_by: by })
      .select().single();
    if (le) throw le;
    // 2) Otvori obračun ponovo
    const { data, error } = await supabase
      .from("obracun_days")
      .update({ confirmed: false, confirmed_by: "" })
      .eq("date", date)
      .select().single();
    if (error) throw error;
    const row = { ...data, date: (data.date ?? "").slice(0, 10) };
    const logRow = { ...log, date: (log.date ?? "").slice(0, 10) };
    setObracunDays(prev => prev.map(o => o.date === row.date ? row : o));
    setStornoLogs(prev => [logRow, ...prev]);
  }

  function isConfirmed(date: string) {
    return obracunDays.find(o => o.date === date)?.confirmed ?? false;
  }

  function getConfirmedBy(date: string) {
    return obracunDays.find(o => o.date === date)?.confirmed_by ?? "";
  }

  return { obracunDays, stornoLogs, closeObracun, stornoObracun, getStornoLogs, isConfirmed, getConfirmedBy, refetch: fetchObracun };
}
