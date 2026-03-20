import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface ObracunDay {
  id: string;
  date: string;
  confirmed: boolean;
  confirmed_by: string;
  total_in: number;
  total_out: number;
  created_at: string;
}

export function useObracun(month: string) {
  const [obracunDays, setObracunDays] = useState<ObracunDay[]>([]);

  useEffect(() => {
    fetchObracun();
  }, [month]);

  async function fetchObracun() {
    const { data } = await supabase
      .from("obracun_days")
      .select("*")
      .like("date", `${month}%`);
    setObracunDays(data ?? []);
  }

  async function closeObracun(date: string, confirmedBy: string, totalIn: number, totalOut: number) {
    const { data, error } = await supabase
      .from("obracun_days")
      .upsert({ date, confirmed: true, confirmed_by: confirmedBy, total_in: totalIn, total_out: totalOut }, { onConflict: "date" })
      .select()
      .single();
    if (error) throw error;
    setObracunDays(prev => {
      const exists = prev.find(o => o.date === date);
      if (exists) return prev.map(o => o.date === date ? data : o);
      return [...prev, data];
    });
    return data;
  }

  function isConfirmed(date: string) {
    return obracunDays.find(o => o.date === date)?.confirmed ?? false;
  }

  function getConfirmedBy(date: string) {
    return obracunDays.find(o => o.date === date)?.confirmed_by ?? "";
  }

  return { obracunDays, closeObracun, isConfirmed, getConfirmedBy, refetch: fetchObracun };
}
