import { createContext, useContext, useEffect, useState, createElement, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";

export interface DriverDebt {
  id: string;
  driver_id: string;
  type: "steta" | "kazna" | "pozajmica" | "doprinosi" | "ostalo";
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

// Uplata na dug — paid_amount se računa iz SVEŽEG stanja u bazi (ne iz prikaza),
// da zastareo prikaz nikad ne pregazi stvarno plaćeno (dvostruka uplata).
export async function applyDebtPayment(debtId: string, amount: number) {
  const { data: cur, error } = await supabase.from("driver_debts")
    .select("amount, paid_amount").eq("id", debtId).single();
  if (error) throw error;
  const newPaid   = (cur.paid_amount || 0) + amount;
  const newStatus = newPaid >= cur.amount - 0.01 ? "closed" : newPaid > 0 ? "partial" : "open";
  const { error: ue } = await supabase.from("driver_debts")
    .update({ paid_amount: newPaid, status: newStatus }).eq("id", debtId);
  if (ue) throw ue;
  return { paid_amount: newPaid, status: newStatus as DriverDebt["status"] };
}

function useDebtsState() {
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
    const debt = debts.find(d => d.id === payment.debt_id);
    const upd = await applyDebtPayment(payment.debt_id, payment.amount);
    setDebts(prev => prev.map(d => d.id === payment.debt_id ? { ...d, ...upd } : d));
    // Direktna uplata duga (van obračuna) — upiši i u kasu da bude vidljiva kroz Kasu.
    // (Uplata kroz obračun ovo radi posebno, pa nema dupliranja.)
    await supabase.from("cash_entries").insert({
      type: "dugovanje", direction: "in", driver_id: payment.driver_id,
      amount: payment.amount, date: payment.date,
      description: `Uplata dugovanja${debt ? ": " + (debt.description || debt.type) : ""}`,
      received_by: payment.received_by || "", notes: payment.notes || "",
    });
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

type DebtsApi = ReturnType<typeof useDebtsState>;
const Ctx = createContext<DebtsApi | null>(null);

// Jedno deljeno stanje dugovanja za celu aplikaciju (Dugovanja, Kasa, Vozači) —
// uplata na jednom mestu je odmah vidljiva svuda, bez refresha.
export function DebtsProvider({ children }: { children: ReactNode }) {
  const value = useDebtsState();
  return createElement(Ctx.Provider, { value }, children);
}

export function useDebts(): DebtsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDebts mora biti unutar DebtsProvider");
  return ctx;
}
