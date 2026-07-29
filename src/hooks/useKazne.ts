import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface Penalty {
  id: string;
  vehicle_id: string | null;
  driver_id: string | null;
  penalty_number: string;
  violation_date: string | null;
  amount: number;
  description: string;
  status: "open" | "partial" | "closed";
  debt_id: string | null;
  created_by: string;
  created_at: string;
}

export function useKazne() {
  const [penalties, setPenalties] = useState<Penalty[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from("penalties")
      .select("*")
      .order("created_at", { ascending: false });
    if (err) setError(err.message);
    setPenalties(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  async function addPenalty(p: {
    vehicle_id: string | null;
    driver_id: string | null;
    penalty_number: string;
    violation_date: string | null;
    amount: number;
    description: string;
    created_by: string;
  }) {
    // 1) Kreiraj dug (type='kazna') vezano za vozača
    let debtId: string | null = null;
    if (p.driver_id) {
      const { data: debt, error: de } = await supabase.from("driver_debts").insert({
        driver_id: p.driver_id,
        type: "kazna",
        amount: p.amount,
        paid_amount: 0,
        status: "open",
        date: p.violation_date ?? new Date().toISOString().split("T")[0],
        description: `Kazna${p.penalty_number ? " #" + p.penalty_number : ""}${p.description ? " — " + p.description : ""}`,
        created_by: p.created_by,
      }).select().single();
      if (de) throw de;
      debtId = debt.id;
    }

    // 2) Kreiraj kaznu
    const { data, error } = await supabase.from("penalties").insert({
      vehicle_id: p.vehicle_id,
      driver_id: p.driver_id,
      penalty_number: p.penalty_number,
      violation_date: p.violation_date,
      amount: p.amount,
      description: p.description,
      status: "open",
      debt_id: debtId,
      created_by: p.created_by,
    }).select().single();
    if (error) throw error;

    setPenalties(prev => [data, ...prev]);
    return data;
  }

  async function deletePenalty(penalty: Penalty) {
    // Obriši vezani dug ako postoji i nije plaćen
    if (penalty.debt_id) {
      await supabase.from("driver_debts").delete().eq("id", penalty.debt_id).eq("paid_amount", 0);
    }
    const { error } = await supabase.from("penalties").delete().eq("id", penalty.id);
    if (error) throw error;
    setPenalties(prev => prev.filter(p => p.id !== penalty.id));
  }

  return { penalties, loading, error, addPenalty, deletePenalty, refetch };
}
