import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface CalendarEntry {
  id: string;
  driver_id: string;
  date: string;
  status: "izmireno" | "neizmireno" | null;
  sunday_status: "radi" | "slobodan" | null;
  evidenced_by: string;
}

export interface CalendarAmount {
  id: string;
  driver_id: string;
  date: string;
  type: string;
  amount: number;
  evidenced_by: string;
}

export function useCalendar(year: number, month: number) {
  const [entries, setEntries]   = useState<CalendarEntry[]>([]);
  const [amounts, setAmounts]   = useState<CalendarAmount[]>([]);
  const [loading, setLoading]   = useState(true);

  const prefix = `${year}-${String(month).padStart(2, "0")}`;

  useEffect(() => {
    fetchAll();
  }, [year, month]);

  async function fetchAll() {
    setLoading(true);
    const [{ data: entriesData }, { data: amountsData }] = await Promise.all([
      supabase.from("calendar_entries").select("*").like("date", `${prefix}%`),
      supabase.from("calendar_amounts").select("*").like("date", `${prefix}%`),
    ]);
    setEntries(entriesData ?? []);
    setAmounts(amountsData ?? []);
    setLoading(false);
  }

  async function saveStatus(driverId: string, date: string, status: "izmireno" | "neizmireno", evidencedBy: string) {
    const { data, error } = await supabase
      .from("calendar_entries")
      .upsert({ driver_id: driverId, date, status, evidenced_by: evidencedBy }, { onConflict: "driver_id,date" })
      .select()
      .single();
    if (error) throw error;
    setEntries(prev => {
      const exists = prev.find(e => e.driver_id === driverId && e.date === date);
      if (exists) return prev.map(e => e.driver_id === driverId && e.date === date ? data : e);
      return [...prev, data];
    });
  }

  async function saveSundayStatus(driverId: string, date: string, sundayStatus: "radi" | "slobodan") {
    const { data, error } = await supabase
      .from("calendar_entries")
      .upsert({ driver_id: driverId, date, sunday_status: sundayStatus }, { onConflict: "driver_id,date" })
      .select()
      .single();
    if (error) throw error;
    setEntries(prev => {
      const exists = prev.find(e => e.driver_id === driverId && e.date === date);
      if (exists) return prev.map(e => e.driver_id === driverId && e.date === date ? data : e);
      return [...prev, data];
    });
  }

  async function saveAmount(driverId: string, date: string, type: string, amount: number, evidencedBy: string) {
    const { data, error } = await supabase
      .from("calendar_amounts")
      .insert({ driver_id: driverId, date, type, amount, evidenced_by: evidencedBy })
      .select()
      .single();
    if (error) throw error;
    setAmounts(prev => [...prev, data]);
  }

  // Helper — status za vozača i datum
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
    const driverEntries = entries.filter(e => e.driver_id === driverId);
    const driverAmounts = amounts.filter(a => a.driver_id === driverId);
    const uplaceno = driverAmounts.reduce((s, a) => s + a.amount, 0);
    const izm   = driverEntries.filter(e => e.status === "izmireno").length;
    const neizm = driverEntries.filter(e => e.status === "neizmireno").length;
    return { uplaceno, izm, neizm };
  }

  return {
    loading, entries, amounts,
    saveStatus, saveSundayStatus, saveAmount,
    getStatus, getSundayStatus, getAmounts,
    getDriverMonthSummary,
    refetch: fetchAll,
  };
}
