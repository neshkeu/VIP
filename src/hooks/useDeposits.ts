import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

export interface DepositTransaction {
  id: string;
  driver_id: string;
  amount: number; // + uplata na depozit, − isplata sa depozita
  date: string;
  description: string;
  created_by: string;
  created_at: string;
}

export function useDeposits() {
  const [transactions, setTransactions] = useState<DepositTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("deposit_transactions")
      .select("*")
      .order("created_at", { ascending: false });
    setTransactions(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  function balanceFor(driverId: string): number {
    return transactions
      .filter(t => t.driver_id === driverId)
      .reduce((s, t) => s + t.amount, 0);
  }

  function transactionsFor(driverId: string): DepositTransaction[] {
    return transactions.filter(t => t.driver_id === driverId);
  }

  async function addTransaction(t: {
    driver_id: string;
    amount: number;
    date: string;
    description: string;
    created_by: string;
  }) {
    const { data, error } = await supabase
      .from("deposit_transactions")
      .insert(t)
      .select()
      .single();
    if (error) throw error;
    setTransactions(prev => [data, ...prev]);
    return data;
  }

  async function deleteTransaction(id: string) {
    const { error } = await supabase.from("deposit_transactions").delete().eq("id", id);
    if (error) throw error;
    setTransactions(prev => prev.filter(t => t.id !== id));
  }

  return { transactions, loading, balanceFor, transactionsFor, addTransaction, deleteTransaction, refetch };
}
