import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface MonthlyAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  year: number;
  month: number;
  created_by: string;
  created_at: string;
}

export function useMonthlyAssignments(year: number, month: number) {
  const [assignments, setAssignments] = useState<MonthlyAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, [year, month]);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("monthly_assignments")
      .select("*")
      .eq("year", year)
      .eq("month", month);
    setAssignments(data ?? []);
    setLoading(false);
  }

  async function assign(driverId: string, vehicleId: string, createdBy: string) {
    const { data, error } = await supabase
      .from("monthly_assignments")
      .upsert({ driver_id: driverId, vehicle_id: vehicleId, year, month, created_by: createdBy }, { onConflict: "driver_id,year,month" })
      .select().single();
    if (error) throw error;
    setAssignments(prev => {
      const exists = prev.find(a => a.driver_id === driverId);
      return exists ? prev.map(a => a.driver_id === driverId ? data : a) : [...prev, data];
    });
  }

  async function unassign(driverId: string) {
    const { error } = await supabase
      .from("monthly_assignments")
      .delete()
      .eq("driver_id", driverId)
      .eq("year", year)
      .eq("month", month);
    if (error) throw error;
    setAssignments(prev => prev.filter(a => a.driver_id !== driverId));
  }

  function getVehicleForDriver(driverId: string) {
    return assignments.find(a => a.driver_id === driverId)?.vehicle_id ?? null;
  }

  return { assignments, loading, assign, unassign, getVehicleForDriver, refetch: fetchAll };
}
