import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import type { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export interface Driver {
  id: string; full_name: string; phone: string; license_number: string;
  status: "active" | "inactive"; driver_type: "renta" | "vlastito_vozilo";
  vehicle_id: string | null; daily_rate: number; weekly_membership: number;
  pos_monthly_fee: number; komunalni_monthly: number; doprinosi_monthly: number;
  weekly_membership_own: number; notes: string; created_at: string;
}
export interface Vehicle {
  id: string; brand: string; model: string; year: number;
  license_plate: string; taxi_license_number: string; pos_terminal_id: string;
  registration_expiry: string; insurance_expiry: string;
  status: "active" | "maintenance" | "inactive"; notes: string; created_at: string;
}
export interface YandexReport {
  id: string; driver_id: string; vehicle_id: string | null;
  gross_amount: number; deduction_pct: number; deduction_amount: number; net_amount: number;
  date: string; period_from: string; period_to: string;
  paid_out: boolean; received_by: string; notes: string; created_at: string;
}
export interface CardReport {
  id: string; driver_id: string; vehicle_id: string | null;
  card_type: string; gross_amount: number; deduction_pct: number;
  deduction_amount: number; net_amount: number;
  date: string; period_from: string; period_to: string;
  paid_out: boolean; received_by: string; notes: string; created_at: string;
}

interface AppContextType {
  drivers: Driver[];
  vehicles: Vehicle[];
  yandexReports: YandexReport[];
  cardReports: CardReport[];
  displayName: string;
  user: User | null;
  loading: boolean;
  error: string | null;
  addDriver: (d: Omit<Driver, "id" | "created_at">) => Promise<Driver>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<Driver>;
  addVehicle: (v: Omit<Vehicle, "id" | "created_at">) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  addYandex: (r: Omit<YandexReport, "id" | "created_at">) => Promise<YandexReport>;
  markYandexPaid: (id: string, by: string) => Promise<void>;
  addCard: (r: Omit<CardReport, "id" | "created_at">) => Promise<CardReport>;
  markCardPaid: (id: string, by: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchDrivers: () => Promise<void>;
  refetchAll: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [yandexReports, setYandex] = useState<YandexReport[]>([]);
  const [cardReports, setCards] = useState<CardReport[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error: err } = await supabase
      .from("profiles").select("display_name").eq("id", userId).maybeSingle();
    if (err) {
      console.error("loadProfile:", err);
      return;
    }
    setDisplayName(data?.display_name ?? "");
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, dRes, vRes, yRes, cRes] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from("drivers").select("*").order("full_name"),
        supabase.from("vehicles").select("*").order("brand"),
        supabase.from("yandex_reports").select("*").order("date", { ascending: false }),
        supabase.from("card_reports").select("*").order("date", { ascending: false }),
      ]);

      const firstErr = [dRes.error, vRes.error, yRes.error, cRes.error].find(Boolean);
      if (firstErr) throw firstErr;

      setDrivers(dRes.data ?? []);
      setVehicles(vRes.data ?? []);
      setYandex(yRes.data ?? []);
      setCards(cRes.data ?? []);

      if (userRes.data.user) {
        setUser(userRes.data.user);
        await loadProfile(userRes.data.user.id);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Greška pri učitavanju podataka";
      setError(msg);
      console.error("loadAll:", e);
    } finally {
      setLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    loadAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setDisplayName("");
    });
    return () => { subscription.unsubscribe(); };
  }, [loadAll, loadProfile]);

  async function addDriver(driver: Omit<Driver, "id" | "created_at">) {
    const { data, error } = await supabase.from("drivers").insert(driver).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setDrivers(prev => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)));
    return data;
  }
  async function updateDriver(id: string, updates: Partial<Driver>) {
    const { data, error } = await supabase.from("drivers").update(updates).eq("id", id).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setDrivers(prev => prev.map(d => d.id === id ? data : d));
    return data;
  }
  async function addVehicle(vehicle: Omit<Vehicle, "id" | "created_at">) {
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setVehicles(prev => [...prev, data].sort((a, b) => a.brand.localeCompare(b.brand)));
    return data;
  }
  async function updateVehicle(id: string, updates: Partial<Vehicle>) {
    const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setVehicles(prev => prev.map(v => v.id === id ? data : v));
    return data;
  }
  async function addYandex(report: Omit<YandexReport, "id" | "created_at">) {
    const { data, error } = await supabase.from("yandex_reports").insert(report).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setYandex(prev => [data, ...prev]);
    return data;
  }
  async function markYandexPaid(id: string, by: string) {
    const { data, error } = await supabase.from("yandex_reports")
      .update({ paid_out: true, received_by: by }).eq("id", id).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setYandex(prev => prev.map(r => r.id === id ? data : r));
  }
  async function addCard(report: Omit<CardReport, "id" | "created_at">) {
    const { data, error } = await supabase.from("card_reports").insert(report).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setCards(prev => [data, ...prev]);
    return data;
  }
  async function markCardPaid(id: string, by: string) {
    const { data, error } = await supabase.from("card_reports")
      .update({ paid_out: true, received_by: by }).eq("id", id).select().single();
    if (error) { toast.error("Greška: " + error.message); throw error; }
    setCards(prev => prev.map(r => r.id === id ? data : r));
  }
  async function logout() { await supabase.auth.signOut(); }
  async function refetchDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("full_name");
    setDrivers(data ?? []);
  }

  return (
    <AppContext.Provider value={{
      drivers, vehicles, yandexReports, cardReports, displayName, user, loading, error,
      addDriver, updateDriver, addVehicle, updateVehicle,
      addYandex, markYandexPaid, addCard, markCardPaid,
      logout, refetchDrivers, refetchAll: loadAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
