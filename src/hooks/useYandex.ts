import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface YandexReport {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  gross_amount: number;
  deduction_pct: number;
  deduction_amount: number;
  net_amount: number;
  date: string;
  period_from: string;
  period_to: string;
  paid_out: boolean;
  received_by: string;
  notes: string;
  created_at: string;
}

export function useYandex() {
  const [reports, setReports] = useState<YandexReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from("yandex_reports").select("*").order("date", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  async function addReport(report: Omit<YandexReport, "id"|"created_at">) {
    const { data, error } = await supabase.from("yandex_reports").insert(report).select().single();
    if (error) throw error;
    setReports(prev => [data, ...prev]);
    return data;
  }

  async function markPaidOut(id: string, receivedBy: string) {
    const { data, error } = await supabase.from("yandex_reports")
      .update({ paid_out: true, received_by: receivedBy }).eq("id", id).select().single();
    if (error) throw error;
    setReports(prev => prev.map(r => r.id === id ? data : r));
  }

  return { reports, loading, addReport, markPaidOut, refetch: fetchAll };
}
