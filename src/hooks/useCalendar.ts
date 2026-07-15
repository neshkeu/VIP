import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type OffStatus = "nije_radio" | "servis" | "praznik" | null;

export interface CalendarEntry {
  id: string; driver_id: string; date: string;
  status: "izmireno"|"neizmireno"|null;
  sunday_status: "radi"|"slobodan"|null;
  off_status: OffStatus;
  evidenced_by: string;
}
export interface CalendarAmount {
  id: string; driver_id: string; date: string;
  type: string; amount: number; evidenced_by: string;
}

export function useCalendar(year: number, month: number) {
  const [entries, setEntries]   = useState<CalendarEntry[]>([]);
  const [amounts, setAmounts]   = useState<CalendarAmount[]>([]);
  const [loading, setLoading]   = useState(true);
  const prefix = `${year}-${String(month).padStart(2,"0")}`;

  useEffect(() => {
    fetchAll();
  }, [prefix]);

  async function fetchAll() {
    setLoading(true);
    const pfx  = `${year}-${String(month).padStart(2,"0")}`;
    const from = `${pfx}-01`;
    const lastDay = new Date(year, month, 0).getDate(); // stvarni zadnji dan
    const to   = `${pfx}-${String(lastDay).padStart(2,"0")}`;
    const [{ data: e }, { data: a }] = await Promise.all([
      supabase.from("calendar_entries").select("*").gte("date", from).lte("date", to),
      supabase.from("calendar_amounts").select("*").gte("date", from).lte("date", to),
    ]);
    setEntries(e ?? []); setAmounts(a ?? []);
    setLoading(false);
  }

  async function saveStatus(driverId: string, date: string, status: "izmireno"|"neizmireno", evidencedBy: string) {
    const { data, error } = await supabase.from("calendar_entries")
      .upsert({ driver_id: driverId, date, status, evidenced_by: evidencedBy }, { onConflict: "driver_id,date" })
      .select().single();
    if (error) throw error;
    setEntries(prev => {
      const exists = prev.find(e => e.driver_id === driverId && e.date === date);
      return exists ? prev.map(e => e.driver_id === driverId && e.date === date ? data : e) : [...prev, data];
    });
  }

  async function saveOffStatus(driverId: string, date: string, offStatus: OffStatus) {
    const payload: Record<string, unknown> = { driver_id: driverId, date, off_status: offStatus };
    const { data, error } = await supabase.from("calendar_entries")
      .upsert(payload, { onConflict: "driver_id,date" })
      .select().single();
    if (error) throw error;
    setEntries(prev => {
      const exists = prev.find(e => e.driver_id === driverId && e.date === date);
      return exists ? prev.map(e => e.driver_id === driverId && e.date === date ? data : e) : [...prev, data];
    });
  }

  function getOffStatus(driverId: string, date: string): OffStatus {
    return entries.find(e => e.driver_id === driverId && e.date === date)?.off_status ?? null;
  }

  async function saveSundayStatus(driverId: string, date: string, sundayStatus: "radi"|"slobodan") {
    const { data, error } = await supabase.from("calendar_entries")
      .upsert({ driver_id: driverId, date, sunday_status: sundayStatus }, { onConflict: "driver_id,date" })
      .select().single();
    if (error) throw error;
    setEntries(prev => {
      const exists = prev.find(e => e.driver_id === driverId && e.date === date);
      return exists ? prev.map(e => e.driver_id === driverId && e.date === date ? data : e) : [...prev, data];
    });
  }

  async function saveAmount(driverId: string, date: string, type: string, amount: number, evidencedBy: string) {
    const { data, error } = await supabase.from("calendar_amounts")
      .insert({ driver_id: driverId, date, type, amount, evidenced_by: evidencedBy })
      .select().single();
    if (error) throw error;
    setAmounts(prev => [...prev, data]);
  }

  async function updateAmount(id: string, amount: number) {
    const { data, error } = await supabase.from("calendar_amounts")
      .update({ amount }).eq("id", id).select().single();
    if (error) throw error;
    setAmounts(prev => prev.map(a => a.id === id ? data : a));
  }

  async function deleteAmount(id: string) {
    // Nađi koji driver_id i date ima ovaj amount
    const amount = amounts.find(a => a.id === id);
    if (!amount) return;

    const { error } = await supabase.from("calendar_amounts").delete().eq("id", id);
    if (error) throw error;

    const remaining = amounts.filter(a => a.id !== id && a.driver_id === amount.driver_id && a.date === amount.date);

    // Ako nema više iznosa za taj dan — obriši i status
    if (remaining.length === 0) {
      await supabase.from("calendar_entries").delete().eq("driver_id", amount.driver_id).eq("date", amount.date);
      setEntries(prev => prev.filter(e => !(e.driver_id === amount.driver_id && e.date === amount.date)));
    }

    setAmounts(prev => prev.filter(a => a.id !== id));
  }

  function getStatus(driverId: string, date: string) {
    return entries.find(e => e.driver_id === driverId && e.date === date)?.status ?? null;
  }
  function getSundayStatus(driverId: string, date: string) {
    return entries.find(e => e.driver_id === driverId && e.date === date)?.sunday_status ?? null;
  }
  function getAmounts(driverId: string, date: string) {
    return amounts.filter(a => a.driver_id === driverId && a.date === date);
  }
  function getDriverMonthSummary(driverId: string) {
    const driverAmounts = amounts.filter(a => a.driver_id === driverId);
    const uplaceno = driverAmounts.reduce((s, a) => s + a.amount, 0);
    const izm   = entries.filter(e => e.driver_id === driverId && e.status === "izmireno").length;
    const neizm = entries.filter(e => e.driver_id === driverId && e.status === "neizmireno").length;
    return { uplaceno, izm, neizm };
  }

  return { loading, entries, amounts, saveStatus, saveSundayStatus, saveOffStatus, saveAmount, updateAmount, deleteAmount, getStatus, getSundayStatus, getOffStatus, getAmounts, getDriverMonthSummary, refetch: fetchAll };
}
