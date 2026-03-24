import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface VehicleAssignment {
  id: string;
  vehicle_id: string;
  driver_id: string;
  date_from: string;
  date_to: string | null;
  notes: string;
  created_at: string;
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

  // Kada vozač dobije novo vozilo — zatvori stari assignment
  async function assignVehicle(driverId: string, vehicleId: string, dateFrom: string, notes: string = "") {
    // Zatvori sve aktivne assigne za ovog vozača
    const active = assignments.filter(a => a.driver_id === driverId && !a.date_to);
    for (const a of active) {
      await supabase.from("vehicle_assignments")
        .update({ date_to: dateFrom })
        .eq("id", a.id);
    }
    // Kreiraj novi
    const { data, error } = await supabase.from("vehicle_assignments")
      .insert({ vehicle_id: vehicleId, driver_id: driverId, date_from: dateFrom, notes })
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

  return { assignments, loading, assignVehicle, closeAssignment, updateAssignment, getByVehicle, getActiveDriver, getByDriver, refetch: fetchAll };
}
