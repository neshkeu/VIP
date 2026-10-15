import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  date_from: string;
  date_to: string | null;
  // Snapshot naknada koje su važile tokom ovog perioda (za istorijsko računanje)
  daily_rate: number;
  weekly_membership: number;
  weekly_membership_own: number;
  pos_monthly_fee: number;
  komunalni_monthly: number;
  doprinosi_monthly: number;
  notes: string;
  created_at: string;
}

export interface AssignmentFees {
  daily_rate: number;
  weekly_membership: number;
  weekly_membership_own: number;
  pos_monthly_fee: number;
  komunalni_monthly: number;
  doprinosi_monthly: number;
}

export function useAssignments() {
  const [assignments, setAssignments] = useState<VehicleAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    const { data } = await supabase
      .from("vehicle_assignments")
      .select("*")
      .order("date_from", { ascending: false });
    setAssignments(data ?? []);
    setLoading(false);
  }

  // Kada vozač dobije novo vozilo — zatvori stari assignment i snimi cene za novi period
  async function assignVehicle(driverId: string, vehicleId: string, dateFrom: string, fees?: Partial<AssignmentFees>, notes: string = "", prevFees?: Partial<AssignmentFees>) {
    // Zatvori sve aktivne assigne za ovog vozača (date_to = dan prelaska).
    // Ako zatvarana dodela nema snimljenu cenu (stari podaci), upečati staru cenu (prevFees)
    // da bi se period pre prelaska računao po STAROJ ceni.
    const active = assignments.filter(a => a.driver_id === driverId && !a.date_to);
    for (const a of active) {
      const patch: Record<string, unknown> = { date_to: dateFrom };
      if (!((a.daily_rate ?? 0) > 0) && prevFees) {
        patch.daily_rate = prevFees.daily_rate ?? 0;
        patch.weekly_membership = prevFees.weekly_membership ?? 0;
        patch.weekly_membership_own = prevFees.weekly_membership_own ?? 0;
        patch.pos_monthly_fee = prevFees.pos_monthly_fee ?? 0;
        patch.komunalni_monthly = prevFees.komunalni_monthly ?? 0;
        patch.doprinosi_monthly = prevFees.doprinosi_monthly ?? 0;
      }
      await supabase.from("vehicle_assignments").update(patch).eq("id", a.id);
    }
    // Kreiraj novi sa snapshotom naknada
    const { data, error } = await supabase.from("vehicle_assignments")
      .insert({
        vehicle_id: vehicleId, driver_id: driverId, date_from: dateFrom, notes,
        daily_rate: fees?.daily_rate ?? 0,
        weekly_membership: fees?.weekly_membership ?? 0,
        weekly_membership_own: fees?.weekly_membership_own ?? 0,
        pos_monthly_fee: fees?.pos_monthly_fee ?? 0,
        komunalni_monthly: fees?.komunalni_monthly ?? 0,
        doprinosi_monthly: fees?.doprinosi_monthly ?? 0,
      })
      .select().single();
    if (error) throw error;
    await fetchAll();
    return data;
  }

  async function closeAssignment(id: string, dateTo: string) {
    const { error } = await supabase.from("vehicle_assignments")
      .update({ date_to: dateTo }).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }

  async function updateAssignment(id: string, updates: Partial<VehicleAssignment>) {
    const { error } = await supabase.from("vehicle_assignments")
      .update(updates).eq("id", id);
    if (error) throw error;
    await fetchAll();
  }

  async function deleteAssignment(id: string) {
    const { error } = await supabase.from("vehicle_assignments").delete().eq("id", id);
    if (error) throw error;
    setAssignments(prev => prev.filter(a => a.id !== id));
  }

  function getByVehicle(vehicleId: string) {
    return assignments.filter(a => a.vehicle_id === vehicleId)
      .sort((a, b) => b.date_from.localeCompare(a.date_from));
  }

  function getActiveDriver(vehicleId: string) {
    return assignments.find(a => a.vehicle_id === vehicleId && !a.date_to) ?? null;
  }

  function getByDriver(driverId: string) {
    return assignments.filter(a => a.driver_id === driverId)
      .sort((a, b) => b.date_from.localeCompare(a.date_from));
  }

  return { assignments, loading, assignVehicle, closeAssignment, updateAssignment, deleteAssignment, getByVehicle, getActiveDriver, getByDriver, refetch: fetchAll };
}
