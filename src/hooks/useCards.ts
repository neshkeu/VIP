import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CardType = "visa" | "mastercard" | "dina" | "amex" | "ostalo";

export interface CardReport {
  id: string;
  driver_id: string;
  vehicle_id: string | null;
  card_type: CardType;
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

export const CARD_DEDUCTIONS: Record<CardType, number> = {
  visa: 1.5, mastercard: 1.5, dina: 1.0, amex: 2.5, ostalo: 1.5,
};

export function useCards() {
  const [reports, setReports] = useState<CardReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase.from("card_reports").select("*").order("date", { ascending: false });
    setReports(data ?? []);
    setLoading(false);
  }

  async function addReport(report: Omit<CardReport, "id"|"created_at">) {
    const { data, error } = await supabase.from("card_reports").insert(report).select().single();
    if (error) throw error;
    setReports(prev => [data, ...prev]);
    return data;
  }

  async function markPaidOut(id: string, receivedBy: string) {
    const { data, error } = await supabase.from("card_reports")
      .update({ paid_out: true, received_by: receivedBy }).eq("id", id).select().single();
    if (error) throw error;
    setReports(prev => prev.map(r => r.id === id ? data : r));
  }

  return { reports, loading, addReport, markPaidOut, refetch: fetchAll };
}
