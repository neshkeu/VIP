// ============================================================
//  VIP TAXI — Mock Data
// ============================================================

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  license_number: string;
  status: "active" | "inactive";
  created_at: string;
  daily_rate: number;
  pos_monthly_fee: number;
  vehicle_id: string;
  notes: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  taxi_license_number: string;
  pos_terminal_id: string;
  registration_expiry: string;
  insurance_expiry: string;
  status: "active" | "maintenance" | "inactive";
  notes: string;
}

export type CalendarEventType = "rent" | "pos_fee" | "debt" | "off_day" | "fuel_vat";

export interface CalendarEvent {
  id: string;
  driver_id: string;
  date: string;
  type: CalendarEventType;
  amount: number;
  description: string;
  is_done: boolean;
  done_at?: string;
  done_by?: string;
}

export type CashFlowType = "rent_payment" | "pos_fee_payment" | "debt_payment" | "fuel_vat_payout" | "other_income" | "other_expense";

export interface CashEntry {
  id: string;
  driver_id: string | null;
  type: CashFlowType;
  amount: number;
  direction: "in" | "out";
  date: string;
  description: string;
  received_by: string;
  event_id?: string;
}

export const drivers: Driver[] = [
  { id: "d1", full_name: "Marko Petrović",    phone: "064-111-2233", license_number: "NS-2024-001", status: "active", created_at: "2024-01-15", daily_rate: 3500, pos_monthly_fee: 800,  vehicle_id: "v1", notes: "" },
  { id: "d2", full_name: "Nemanja Đorđević",  phone: "065-222-3344", license_number: "NS-2024-002", status: "active", created_at: "2024-02-10", daily_rate: 3000, pos_monthly_fee: 600,  vehicle_id: "v2", notes: "" },
  { id: "d3", full_name: "Milica Stojanović", phone: "063-333-4455", license_number: "NS-2024-003", status: "active", created_at: "2024-03-05", daily_rate: 4000, pos_monthly_fee: 1000, vehicle_id: "v3", notes: "" },
  { id: "d4", full_name: "Stefan Nikolić",    phone: "066-444-5566", license_number: "NS-2024-004", status: "active", created_at: "2024-03-20", daily_rate: 3800, pos_monthly_fee: 750,  vehicle_id: "v4", notes: "" },
  { id: "d5", full_name: "Ana Jovanović",     phone: "064-555-6677", license_number: "NS-2024-005", status: "active", created_at: "2024-04-01", daily_rate: 3200, pos_monthly_fee: 500,  vehicle_id: "v5", notes: "" },
];

export const vehicles: Vehicle[] = [
  { id: "v1", brand: "Toyota",  model: "Camry",   year: 2023, license_plate: "NS-001-AB", taxi_license_number: "TAXI-0101", pos_terminal_id: "POS-A01", registration_expiry: "2026-06-15", insurance_expiry: "2026-03-20", status: "active", notes: "" },
  { id: "v2", brand: "Honda",   model: "Accord",  year: 2022, license_plate: "NS-002-CD", taxi_license_number: "TAXI-0102", pos_terminal_id: "POS-A02", registration_expiry: "2026-08-22", insurance_expiry: "2026-05-10", status: "active", notes: "" },
  { id: "v3", brand: "Hyundai", model: "Sonata",  year: 2023, license_plate: "NS-003-EF", taxi_license_number: "TAXI-0103", pos_terminal_id: "POS-B01", registration_expiry: "2026-09-30", insurance_expiry: "2026-07-15", status: "active", notes: "" },
  { id: "v4", brand: "Kia",     model: "K5",      year: 2024, license_plate: "NS-004-GH", taxi_license_number: "TAXI-0104", pos_terminal_id: "POS-B02", registration_expiry: "2027-01-10", insurance_expiry: "2026-11-20", status: "active", notes: "" },
  { id: "v5", brand: "Škoda",   model: "Octavia", year: 2023, license_plate: "NS-005-IJ", taxi_license_number: "TAXI-0105", pos_terminal_id: "POS-C01", registration_expiry: "2026-12-01", insurance_expiry: "2026-09-15", status: "active", notes: "" },
];

export const calendarEvents: CalendarEvent[] = [
  // Marko
  { id: "ce1",  driver_id: "d1", date: "2025-03-03", type: "rent",    amount: 3500,  description: "Renta",           is_done: true,  done_by: "Nemanja", done_at: "2025-03-03" },
  { id: "ce2",  driver_id: "d1", date: "2025-03-05", type: "rent",    amount: 3500,  description: "Renta",           is_done: true,  done_by: "Milica",  done_at: "2025-03-05" },
  { id: "ce3",  driver_id: "d1", date: "2025-03-07", type: "off_day", amount: 1750,  description: "Slobodan dan",    is_done: true,  done_by: "Admin",   done_at: "2025-03-07" },
  { id: "ce4",  driver_id: "d1", date: "2025-03-10", type: "rent",    amount: 3500,  description: "Renta",           is_done: false },
  { id: "ce5",  driver_id: "d1", date: "2025-03-12", type: "rent",    amount: 3500,  description: "Renta",           is_done: false },
  { id: "ce6",  driver_id: "d1", date: "2025-03-14", type: "rent",    amount: 3500,  description: "Renta",           is_done: false },
  { id: "ce7",  driver_id: "d1", date: "2025-03-01", type: "pos_fee", amount: 800,   description: "POS mart 2025",   is_done: true,  done_by: "Admin",   done_at: "2025-03-01" },
  { id: "ce8",  driver_id: "d1", date: "2025-03-06", type: "debt",    amount: 15000, description: "Šteta — branik",  is_done: false },
  // Nemanja
  { id: "ce9",  driver_id: "d2", date: "2025-03-03", type: "rent",    amount: 3000,  description: "Renta",           is_done: true,  done_by: "Admin",   done_at: "2025-03-03" },
  { id: "ce10", driver_id: "d2", date: "2025-03-05", type: "rent",    amount: 3000,  description: "Renta",           is_done: true,  done_by: "Nemanja", done_at: "2025-03-05" },
  { id: "ce11", driver_id: "d2", date: "2025-03-10", type: "rent",    amount: 3000,  description: "Renta",           is_done: false },
  { id: "ce12", driver_id: "d2", date: "2025-03-12", type: "rent",    amount: 3000,  description: "Renta",           is_done: false },
  { id: "ce13", driver_id: "d2", date: "2025-03-01", type: "pos_fee", amount: 600,   description: "POS mart 2025",   is_done: false },
  { id: "ce14", driver_id: "d2", date: "2025-03-08", type: "fuel_vat",amount: 1200,  description: "PDV gorivo",      is_done: false },
  // Milica
  { id: "ce15", driver_id: "d3", date: "2025-03-03", type: "rent",    amount: 4000,  description: "Renta",           is_done: true,  done_by: "Admin",   done_at: "2025-03-03" },
  { id: "ce16", driver_id: "d3", date: "2025-03-05", type: "rent",    amount: 4000,  description: "Renta",           is_done: false },
  { id: "ce17", driver_id: "d3", date: "2025-03-10", type: "rent",    amount: 4000,  description: "Renta",           is_done: false },
  { id: "ce18", driver_id: "d3", date: "2025-03-01", type: "pos_fee", amount: 1000,  description: "POS mart 2025",   is_done: true,  done_by: "Milica",  done_at: "2025-03-02" },
  { id: "ce19", driver_id: "d3", date: "2025-03-07", type: "debt",    amount: 5000,  description: "Kazna saobraćaj", is_done: false },
  // Stefan
  { id: "ce20", driver_id: "d4", date: "2025-03-03", type: "rent",    amount: 3800,  description: "Renta",           is_done: false },
  { id: "ce21", driver_id: "d4", date: "2025-03-05", type: "rent",    amount: 3800,  description: "Renta",           is_done: false },
  { id: "ce22", driver_id: "d4", date: "2025-03-07", type: "off_day", amount: 1900,  description: "Slobodan dan",    is_done: true,  done_by: "Admin",   done_at: "2025-03-07" },
  { id: "ce23", driver_id: "d4", date: "2025-03-01", type: "pos_fee", amount: 750,   description: "POS mart 2025",   is_done: false },
  // Ana
  { id: "ce24", driver_id: "d5", date: "2025-03-03", type: "rent",    amount: 3200,  description: "Renta",           is_done: true,  done_by: "Milica",  done_at: "2025-03-03" },
  { id: "ce25", driver_id: "d5", date: "2025-03-05", type: "rent",    amount: 3200,  description: "Renta",           is_done: true,  done_by: "Milica",  done_at: "2025-03-05" },
  { id: "ce26", driver_id: "d5", date: "2025-03-10", type: "rent",    amount: 3200,  description: "Renta",           is_done: false },
  { id: "ce27", driver_id: "d5", date: "2025-03-01", type: "pos_fee", amount: 500,   description: "POS mart 2025",   is_done: true,  done_by: "Admin",   done_at: "2025-03-01" },
];

export const cashEntries: CashEntry[] = [
  { id: "k1",  driver_id: "d1", type: "rent_payment",    direction: "in",  amount: 3500, date: "2025-03-03", description: "Renta Marko",        received_by: "Nemanja", event_id: "ce1"  },
  { id: "k2",  driver_id: "d1", type: "rent_payment",    direction: "in",  amount: 3500, date: "2025-03-05", description: "Renta Marko",        received_by: "Milica",  event_id: "ce2"  },
  { id: "k3",  driver_id: "d2", type: "rent_payment",    direction: "in",  amount: 3000, date: "2025-03-03", description: "Renta Nemanja",      received_by: "Admin",   event_id: "ce9"  },
  { id: "k4",  driver_id: "d2", type: "rent_payment",    direction: "in",  amount: 3000, date: "2025-03-05", description: "Renta Nemanja",      received_by: "Nemanja", event_id: "ce10" },
  { id: "k5",  driver_id: "d1", type: "pos_fee_payment", direction: "in",  amount: 800,  date: "2025-03-01", description: "POS naknada Marko",  received_by: "Admin",   event_id: "ce7"  },
  { id: "k6",  driver_id: "d3", type: "pos_fee_payment", direction: "in",  amount: 1000, date: "2025-03-02", description: "POS naknada Milica", received_by: "Milica",  event_id: "ce18" },
  { id: "k7",  driver_id: "d3", type: "rent_payment",    direction: "in",  amount: 4000, date: "2025-03-03", description: "Renta Milica",       received_by: "Admin",   event_id: "ce15" },
  { id: "k8",  driver_id: "d5", type: "rent_payment",    direction: "in",  amount: 3200, date: "2025-03-03", description: "Renta Ana",          received_by: "Milica",  event_id: "ce24" },
  { id: "k9",  driver_id: "d5", type: "rent_payment",    direction: "in",  amount: 3200, date: "2025-03-05", description: "Renta Ana",          received_by: "Milica",  event_id: "ce25" },
  { id: "k10", driver_id: "d5", type: "pos_fee_payment", direction: "in",  amount: 500,  date: "2025-03-01", description: "POS naknada Ana",    received_by: "Admin",   event_id: "ce27" },
  { id: "k11", driver_id: null, type: "other_expense",   direction: "out", amount: 5000, date: "2025-03-04", description: "Gorivo za rezervno vozilo", received_by: "Admin" },
];

// ─── HELPERS ─────────────────────────────────────────────────
export function getDriverById(id: string) { return drivers.find(d => d.id === id); }
export function getVehicleById(id: string) { return vehicles.find(v => v.id === id); }

export function getEventsForDriverAndMonth(driverId: string, year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  return calendarEvents.filter(e => e.driver_id === driverId && e.date.startsWith(prefix));
}

export function getEventsForDateAndDriver(driverId: string, date: string) {
  return calendarEvents.filter(e => e.driver_id === driverId && e.date === date);
}

export function getDriverMonthSummary(driverId: string, year: number, month: number) {
  const events = getEventsForDriverAndMonth(driverId, year, month);
  const total   = events.reduce((s, e) => s + e.amount, 0);
  const paid    = events.filter(e => e.is_done).reduce((s, e) => s + e.amount, 0);
  return { total, paid, pending: total - paid, events };
}

export function getCashSummary(year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const entries = cashEntries.filter(e => e.date.startsWith(prefix));
  const income  = entries.filter(e => e.direction === "in").reduce((s, e) => s + e.amount, 0);
  const expense = entries.filter(e => e.direction === "out").reduce((s, e) => s + e.amount, 0);
  return { income, expense, balance: income - expense, entries };
}

export const EVENT_TYPE_CONFIG: Record<CalendarEventType, {
  label: string; color: string; bg: string; dot: string; border: string; bgDone: string;
}> = {
  rent:    { label: "Renta",        color: "text-green-700",  bg: "bg-green-50",  bgDone: "bg-green-100",  dot: "bg-green-500",  border: "border-green-300" },
  pos_fee: { label: "POS naknada",  color: "text-blue-700",   bg: "bg-blue-50",   bgDone: "bg-blue-100",   dot: "bg-blue-500",   border: "border-blue-300"  },
  debt:    { label: "Dugovanje",    color: "text-amber-700",  bg: "bg-amber-50",  bgDone: "bg-amber-100",  dot: "bg-amber-500",  border: "border-amber-300" },
  off_day: { label: "Slobodan dan", color: "text-gray-500",   bg: "bg-gray-50",   bgDone: "bg-gray-100",   dot: "bg-gray-400",   border: "border-gray-200"  },
  fuel_vat:{ label: "PDV gorivo",   color: "text-orange-700", bg: "bg-orange-50", bgDone: "bg-orange-100", dot: "bg-orange-500", border: "border-orange-300"},
};

export const CASH_TYPE_CONFIG: Record<CashFlowType, { label: string }> = {
  rent_payment:    { label: "Uplata rente"        },
  pos_fee_payment: { label: "POS naknada"         },
  debt_payment:    { label: "Uplata duga"         },
  fuel_vat_payout: { label: "PDV gorivo — isplata"},
  other_income:    { label: "Ostali prihod"       },
  other_expense:   { label: "Ostali trošak"       },
};
