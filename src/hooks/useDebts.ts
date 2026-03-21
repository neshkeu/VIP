import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface DriverDebt {
  id: string;
  driver_id: string;
  type: "steta" | "kazna" | "pozajmica" | "ostalo";
  amount: number;
  paid_amount: number;
  date: string;
  description: string;
  created_by: string;
  status: "open" | "partial" | "closed";
  created_at: string;
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  driver_id: string;
  amount: number;
  date: string;
  received_by: string;
  notes: string;
}

export function useDebts() {
  const [debts, setDebts]       = useState<DriverDebt[]>([]);
  const [payments, setPayments] = useState<DebtPayment[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const [{ data: d }, { data: p }] = await Promise.all([
      supabase.from("driver_debts").select("*").order("created_at", { ascending: false }),
      supabase.from("debt_payments").select("*").order("date", { ascending: false }),
    ]);
    setDebts(d ?? []);
    setPayments(p ?? []);
    setLoading(false);
  }

  async function addDebt(debt: Omit<DriverDebt, "id"|"created_at"|"paid_amount"|"status">) {
    const { data, error } = await supabase.from("driver_debts")
      .insert({ ...debt, paid_amount: 0, status: "open" }).select().single();
    if (error) throw error;
    setDebts(prev => [data, ...prev]);
    return data;
  }

  async function addPayment(payment: Omit<DebtPayment, "id">) {
    const { data, error } = await supabase.from("debt_payments").insert(payment).select().single();
    if (error) throw error;
    setPayments(prev => [data, ...prev]);
    // Ažuriraj paid_amount i status na dugu
    const debt = debts.find(d => d.id === payment.debt_id);
    if (debt) {
      const newPaid  = debt.paid_amount + payment.amount;
      const newStatus = newPaid >= debt.amount ? "closed" : newPaid > 0 ? "partial" : "open";
      await supabase.from("driver_debts").update({ paid_amount: newPaid, status: newStatus }).eq("id", debt.id);
      setDebts(prev => prev.map(d => d.id === debt.id ? { ...d, paid_amount: newPaid, status: newStatus } : d));
    }
    return data;
  }

  function getPaymentsForDebt(debtId: string) {
    return payments.filter(p => p.debt_id === debtId);
  }

  function getDebtsByDriver(driverId: string) {
    return debts.filter(d => d.driver_id === driverId);
  }

  return { debts, payments, loading, addDebt, addPayment, getPaymentsForDebt, getDebtsByDriver, refetch: fetchAll };
}
