import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/lib/supabase";

interface Driver {
  id: string; full_name: string; phone: string; license_number: string;
  status: "active"|"inactive"; driver_type: "renta"|"vlastito_vozilo";
  vehicle_id: string|null; daily_rate: number; weekly_membership: number;
  pos_monthly_fee: number; komunalni_monthly: number; doprinosi_monthly: number;
  weekly_membership_own: number; notes: string; created_at: string;
}
interface Vehicle {
  id: string; brand: string; model: string; year: number;
  license_plate: string; taxi_license_number: string; pos_terminal_id: string;
  registration_expiry: string; insurance_expiry: string;
  status: "active"|"maintenance"|"inactive"; notes: string; created_at: string;
}

interface AppContextType {
  drivers: Driver[]; vehicles: Vehicle[];
  displayName: string; user: any;
  loading: boolean;
  addDriver: (d: Omit<Driver,"id"|"created_at">) => Promise<Driver>;
  updateDriver: (id: string, updates: Partial<Driver>) => Promise<Driver>;
  addVehicle: (v: Omit<Vehicle,"id"|"created_at">) => Promise<Vehicle>;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => Promise<Vehicle>;
  logout: () => Promise<void>;
  refetchDrivers: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [drivers, setDrivers]     = useState<Driver[]>([]);
  const [vehicles, setVehicles]   = useState<Vehicle[]>([]);
  const [user, setUser]           = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    loadAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadProfile(session.user.id);
      else setDisplayName("");
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [{ data: userData }, { data: d }, { data: v }] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from("drivers").select("*").order("full_name"),
      supabase.from("vehicles").select("*").order("brand"),
    ]);
    setDrivers(d ?? []);
    setVehicles(v ?? []);
    if (userData.user) {
      setUser(userData.user);
      await loadProfile(userData.user.id);
    }
    setLoading(false);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", userId).single();
    setDisplayName(data?.display_name ?? "");
  }

  async function addDriver(driver: Omit<Driver,"id"|"created_at">) {
    const { data, error } = await supabase.from("drivers").insert(driver).select().single();
    if (error) throw error;
    setDrivers(prev => [...prev, data].sort((a,b) => a.full_name.localeCompare(b.full_name)));
    return data;
  }

  async function updateDriver(id: string, updates: Partial<Driver>) {
    const { data, error } = await supabase.from("drivers").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setDrivers(prev => prev.map(d => d.id === id ? data : d));
    return data;
  }

  async function addVehicle(vehicle: Omit<Vehicle,"id"|"created_at">) {
    const { data, error } = await supabase.from("vehicles").insert(vehicle).select().single();
    if (error) throw error;
    setVehicles(prev => [...prev, data].sort((a,b) => a.brand.localeCompare(b.brand)));
    return data;
  }

  async function updateVehicle(id: string, updates: Partial<Vehicle>) {
    const { data, error } = await supabase.from("vehicles").update(updates).eq("id", id).select().single();
    if (error) throw error;
    setVehicles(prev => prev.map(v => v.id === id ? data : v));
    return data;
  }

  async function logout() { await supabase.auth.signOut(); }
  async function refetchDrivers() {
    const { data } = await supabase.from("drivers").select("*").order("full_name");
    setDrivers(data ?? []);
  }

  return (
    <AppContext.Provider value={{ drivers, vehicles, displayName, user, loading, addDriver, updateDriver, addVehicle, updateVehicle, logout, refetchDrivers }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
