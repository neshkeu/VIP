// ============================================================
//  VIP TAXI — Mock Data
// ============================================================

// ─── INTERFEJSI ──────────────────────────────────────────────

export type DriverType = "renta" | "vlastito_vozilo";

export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  license_number: string;
  status: "active" | "inactive";
  created_at: string;
  driver_type: DriverType;
  vehicle_id: string;
  notes: string;
  // Renta vozač
  daily_rate: number;
  weekly_membership: number;
  pos_monthly_fee: number;
  // Vlastito vozilo
  komunalni_monthly: number;
  doprinosi_monthly: number;
  weekly_membership_own: number;
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

// Tip kasa unosa
export type CashType =
  | "renta"           // Uplata rente — ULAZ
  | "clanarina"       // Sedmična članarina — ULAZ
  | "pos_naknada"     // Mjesečna POS naknada — ULAZ
  | "komunalni"       // Komunalni broj — ULAZ
  | "doprinosi"       // Doprinosi — ULAZ
  | "dugovanje"       // Uplata dugovanja — ULAZ
  | "likvidnost_in"   // Vlasnik ubaci gotovinu — ULAZ
  | "yandex"          // Yandex isplata vozaču — IZLAZ
  | "kartica"         // Kartica/POS izvod isplata — IZLAZ
  | "vaučer"          // Vaučer isplata — IZLAZ
  | "pdv_gorivo"      // PDV gorivo — IZLAZ
  | "likvidnost_out"; // Podizanje gotovine — IZLAZ

export interface CashEntry {
  id: string;
  type: CashType;
  direction: "in" | "out";
  driver_id: string | null;
  amount: number;
  date: string;
  description: string;
  received_by: string;
  notes: string;
}

// Obračunski dan — pon/sri/pet
export interface ObracunDay {
  id: string;
  date: string;
  opening_balance: number;  // Stanje na početku
  closing_balance: number;  // Stanje na kraju
  total_in: number;
  total_out: number;
  confirmed: boolean;
  confirmed_by: string;
}

// Dugovanje vozača
export type DebtType = "steta" | "kazna" | "pozajmica" | "ostalo";

export interface DriverDebt {
  id: string;
  driver_id: string;
  type: DebtType;
  amount: number;           // Ukupan dug
  paid_amount: number;      // Koliko je plaćeno
  date: string;
  description: string;
  created_by: string;
  status: "open" | "partial" | "closed";
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

// Yandex izvod
export interface YandexReport {
  id: string;
  driver_id: string;
  vehicle_id: string;
  gross_amount: number;     // Bruto iznos
  deduction_pct: number;    // Odbitak % (10)
  deduction_amount: number; // Iznos odbitka
  net_amount: number;       // Neto — isplaćeno vozaču
  date: string;
  period_from: string;
  period_to: string;
  paid_out: boolean;        // Da li je isplaćeno vozaču
  received_by: string;
  notes: string;
}

// Kartica/POS izvod
export type CardType = "visa" | "mastercard" | "dina" | "amex" | "ostalo";

export interface CardReport {
  id: string;
  driver_id: string;
  vehicle_id: string;
  card_type: CardType;
  gross_amount: number;
  deduction_pct: number;    // Procenat odbitka po tipu kartice
  deduction_amount: number;
  net_amount: number;       // Neto — isplaćeno vozaču
  date: string;
  period_from: string;
  period_to: string;
  paid_out: boolean;
  received_by: string;
  notes: string;
}

// ─── KONFIGURACIJA ───────────────────────────────────────────
export const CASH_TYPE_CONFIG: Record<CashType, {
  label: string;
  direction: "in" | "out";
  color: string;
  bg: string;
}> = {
  renta:          { label: "Renta",             direction: "in",  color: "text-green-700",  bg: "bg-green-50"  },
  clanarina:      { label: "Članarina",          direction: "in",  color: "text-green-700",  bg: "bg-green-50"  },
  pos_naknada:    { label: "POS naknada",        direction: "in",  color: "text-green-700",  bg: "bg-green-50"  },
  komunalni:      { label: "Komunalni",          direction: "in",  color: "text-green-700",  bg: "bg-green-50"  },
  doprinosi:      { label: "Doprinosi",          direction: "in",  color: "text-green-700",  bg: "bg-green-50"  },
  dugovanje:      { label: "Uplata dugovanja",   direction: "in",  color: "text-blue-700",   bg: "bg-blue-50"   },
  likvidnost_in:  { label: "Likvidnost — ulaz",  direction: "in",  color: "text-purple-700", bg: "bg-purple-50" },
  yandex:         { label: "Yandex isplata",     direction: "out", color: "text-orange-700", bg: "bg-orange-50" },
  kartica:        { label: "Kartica isplata",    direction: "out", color: "text-orange-700", bg: "bg-orange-50" },
  vaučer:         { label: "Vaučer",             direction: "out", color: "text-red-700",    bg: "bg-red-50"    },
  pdv_gorivo:     { label: "PDV gorivo",         direction: "out", color: "text-red-700",    bg: "bg-red-50"    },
  likvidnost_out: { label: "Podizanje gotovine", direction: "out", color: "text-red-700",    bg: "bg-red-50"    },
};

export const CARD_TYPE_CONFIG: Record<CardType, { label: string; deduction_pct: number }> = {
  visa:       { label: "Visa",            deduction_pct: 1.5 },
  mastercard: { label: "Mastercard",      deduction_pct: 1.5 },
  dina:       { label: "Dina",            deduction_pct: 1.0 },
  amex:       { label: "American Express",deduction_pct: 2.5 },
  ostalo:     { label: "Ostalo",          deduction_pct: 1.5 },
};

export const DEBT_TYPE_CONFIG: Record<DebtType, { label: string; color: string }> = {
  steta:     { label: "Šteta",      color: "text-red-700"    },
  kazna:     { label: "Kazna",      color: "text-orange-700" },
  pozajmica: { label: "Pozajmica",  color: "text-blue-700"   },
  ostalo:    { label: "Ostalo",     color: "text-gray-700"   },
};

// ─── VOZACI ──────────────────────────────────────────────────
export const drivers: Driver[] = [
  { id: "d1", full_name: "Marko Petrović",    phone: "064-111-2233", license_number: "NS-2024-001", status: "active", created_at: "2024-01-15", driver_type: "renta",           vehicle_id: "v1", daily_rate: 3500, weekly_membership: 1000, pos_monthly_fee: 800,  komunalni_monthly: 0,    doprinosi_monthly: 0,    weekly_membership_own: 0,   notes: "" },
  { id: "d2", full_name: "Nemanja Đorđević",  phone: "065-222-3344", license_number: "NS-2024-002", status: "active", created_at: "2024-02-10", driver_type: "renta",           vehicle_id: "v2", daily_rate: 3000, weekly_membership: 1000, pos_monthly_fee: 600,  komunalni_monthly: 0,    doprinosi_monthly: 0,    weekly_membership_own: 0,   notes: "" },
  { id: "d3", full_name: "Milica Stojanović", phone: "063-333-4455", license_number: "NS-2024-003", status: "active", created_at: "2024-03-05", driver_type: "vlastito_vozilo", vehicle_id: "v3", daily_rate: 0,    weekly_membership: 0,    pos_monthly_fee: 1000, komunalni_monthly: 5000, doprinosi_monthly: 3000, weekly_membership_own: 800, notes: "" },
  { id: "d4", full_name: "Stefan Nikolić",    phone: "066-444-5566", license_number: "NS-2024-004", status: "active", created_at: "2024-03-20", driver_type: "renta",           vehicle_id: "v4", daily_rate: 3800, weekly_membership: 1000, pos_monthly_fee: 750,  komunalni_monthly: 0,    doprinosi_monthly: 0,    weekly_membership_own: 0,   notes: "" },
  { id: "d5", full_name: "Ana Jovanović",     phone: "064-555-6677", license_number: "NS-2024-005", status: "active", created_at: "2024-04-01", driver_type: "vlastito_vozilo", vehicle_id: "v5", daily_rate: 0,    weekly_membership: 0,    pos_monthly_fee: 500,  komunalni_monthly: 4500, doprinosi_monthly: 3000, weekly_membership_own: 800, notes: "" },
];

// ─── VOZILA ──────────────────────────────────────────────────
export const vehicles: Vehicle[] = [
  { id: "v1", brand: "Toyota",  model: "Camry",   year: 2023, license_plate: "NS-001-AB", taxi_license_number: "TAXI-0101", pos_terminal_id: "POS-A01", registration_expiry: "2026-06-15", insurance_expiry: "2026-03-20", status: "active", notes: "" },
  { id: "v2", brand: "Honda",   model: "Accord",  year: 2022, license_plate: "NS-002-CD", taxi_license_number: "TAXI-0102", pos_terminal_id: "POS-A02", registration_expiry: "2026-08-22", insurance_expiry: "2026-05-10", status: "active", notes: "" },
  { id: "v3", brand: "Hyundai", model: "Sonata",  year: 2023, license_plate: "NS-003-EF", taxi_license_number: "TAXI-0103", pos_terminal_id: "POS-B01", registration_expiry: "2026-09-30", insurance_expiry: "2026-07-15", status: "active", notes: "" },
  { id: "v4", brand: "Kia",     model: "K5",      year: 2024, license_plate: "NS-004-GH", taxi_license_number: "TAXI-0104", pos_terminal_id: "POS-B02", registration_expiry: "2027-01-10", insurance_expiry: "2026-11-20", status: "active", notes: "" },
  { id: "v5", brand: "Škoda",   model: "Octavia", year: 2023, license_plate: "NS-005-IJ", taxi_license_number: "TAXI-0105", pos_terminal_id: "POS-C01", registration_expiry: "2026-12-01", insurance_expiry: "2026-09-15", status: "active", notes: "" },
];

// ─── KASA UNOSI ──────────────────────────────────────────────
export const cashEntries: CashEntry[] = [
  // Pon 10.03.2026 — obračunski dan
  { id: "k1",  type: "renta",      direction: "in",  driver_id: "d1", amount: 10500, date: "2026-03-10", description: "Renta 3 dana — Marko",     received_by: "Nemanja", notes: "" },
  { id: "k2",  type: "renta",      direction: "in",  driver_id: "d2", amount: 9000,  date: "2026-03-10", description: "Renta 3 dana — Nemanja",    received_by: "Nemanja", notes: "" },
  { id: "k3",  type: "clanarina",  direction: "in",  driver_id: "d1", amount: 1000,  date: "2026-03-10", description: "Sedmična članarina — Marko", received_by: "Nemanja", notes: "" },
  { id: "k4",  type: "clanarina",  direction: "in",  driver_id: "d2", amount: 1000,  date: "2026-03-10", description: "Sedmična članarina — Nemanja",received_by: "Nemanja", notes: "" },
  { id: "k5",  type: "vaučer",     direction: "out", driver_id: "d1", amount: 1200,  date: "2026-03-10", description: "3 vaučera — Marko",          received_by: "Nemanja", notes: "" },
  // Sri 12.03.2026 — obračunski dan
  { id: "k6",  type: "renta",      direction: "in",  driver_id: "d1", amount: 7000,  date: "2026-03-12", description: "Renta 2 dana — Marko",     received_by: "Milica",  notes: "" },
  { id: "k7",  type: "renta",      direction: "in",  driver_id: "d4", amount: 7600,  date: "2026-03-12", description: "Renta 2 dana — Stefan",    received_by: "Milica",  notes: "" },
  { id: "k8",  type: "yandex",     direction: "out", driver_id: "d2", amount: 3420,  date: "2026-03-12", description: "Yandex neto — Nemanja",    received_by: "Milica",  notes: "Bruto 3800, odbitak 10%" },
  { id: "k9",  type: "kartica",    direction: "out", driver_id: "d1", amount: 2450,  date: "2026-03-12", description: "Kartica Visa neto — Marko", received_by: "Milica",  notes: "Bruto 2487, odbitak 1.5%" },
  { id: "k10", type: "likvidnost_in", direction: "in", driver_id: null, amount: 5000, date: "2026-03-12", description: "Likvidnost — ubacio Admin", received_by: "Admin",  notes: "" },
  // Pet 14.03.2026 — obračunski dan
  { id: "k11", type: "renta",      direction: "in",  driver_id: "d1", amount: 3500,  date: "2026-03-14", description: "Renta — Marko",            received_by: "Admin",   notes: "" },
  { id: "k12", type: "renta",      direction: "in",  driver_id: "d3", amount: 0,     date: "2026-03-14", description: "Slobodan dan — Milica",     received_by: "Admin",   notes: "" },
  { id: "k13", type: "pos_naknada",direction: "in",  driver_id: "d1", amount: 800,   date: "2026-03-14", description: "POS naknada mart — Marko",  received_by: "Admin",   notes: "" },
  { id: "k14", type: "dugovanje",  direction: "in",  driver_id: "d3", amount: 5000,  date: "2026-03-14", description: "Uplata štete — Milica",     received_by: "Admin",   notes: "" },
  { id: "k15", type: "pdv_gorivo", direction: "out", driver_id: "d4", amount: 800,   date: "2026-03-14", description: "PDV gorivo — Stefan",       received_by: "Admin",   notes: "" },
];

// Obračunski dani
export const obracunDays: ObracunDay[] = [
  { id: "ob1", date: "2026-03-10", opening_balance: 2000,  closing_balance: 24300, total_in: 22500, total_out: 1200,  confirmed: true,  confirmed_by: "Nemanja" },
  { id: "ob2", date: "2026-03-12", opening_balance: 24300, closing_balance: 30870, total_in: 12600, total_out: 5870,  confirmed: true,  confirmed_by: "Milica"  },
  { id: "ob3", date: "2026-03-14", opening_balance: 30870, closing_balance: 0,     total_in: 9300,  total_out: 800,   confirmed: false, confirmed_by: ""        },
];

// Dugovanja
export const driverDebts: DriverDebt[] = [
  { id: "db1", driver_id: "d3", type: "steta",     amount: 25000, paid_amount: 5000,  date: "2026-03-06", description: "Šteta bočni udar",       created_by: "Admin",   status: "partial" },
  { id: "db2", driver_id: "d1", type: "kazna",     amount: 8000,  paid_amount: 0,     date: "2026-03-08", description: "Saobraćajna kazna",      created_by: "Nemanja", status: "open"    },
  { id: "db3", driver_id: "d4", type: "pozajmica", amount: 15000, paid_amount: 15000, date: "2026-02-20", description: "Pozajmica za lijek",     created_by: "Admin",   status: "closed"  },
];

export const debtPayments: DebtPayment[] = [
  { id: "dp1", debt_id: "db1", driver_id: "d3", amount: 5000, date: "2026-03-14", received_by: "Admin", notes: "Prva rata" },
];

// Yandex izvodi
export const yandexReports: YandexReport[] = [
  { id: "yr1", driver_id: "d2", vehicle_id: "v2", gross_amount: 3800, deduction_pct: 10, deduction_amount: 380, net_amount: 3420, date: "2026-03-11", period_from: "2026-03-04", period_to: "2026-03-10", paid_out: true,  received_by: "Milica",  notes: "" },
  { id: "yr2", driver_id: "d1", vehicle_id: "v1", gross_amount: 4200, deduction_pct: 10, deduction_amount: 420, net_amount: 3780, date: "2026-03-11", period_from: "2026-03-04", period_to: "2026-03-10", paid_out: false, received_by: "",        notes: "" },
  { id: "yr3", driver_id: "d4", vehicle_id: "v4", gross_amount: 5100, deduction_pct: 10, deduction_amount: 510, net_amount: 4590, date: "2026-03-11", period_from: "2026-03-04", period_to: "2026-03-10", paid_out: false, received_by: "",        notes: "" },
];

// Kartica izvodi
export const cardReports: CardReport[] = [
  { id: "cr1", driver_id: "d1", vehicle_id: "v1", card_type: "visa",       gross_amount: 2487, deduction_pct: 1.5, deduction_amount: 37,  net_amount: 2450, date: "2026-03-12", period_from: "2026-03-10", period_to: "2026-03-11", paid_out: true,  received_by: "Milica", notes: "" },
  { id: "cr2", driver_id: "d2", vehicle_id: "v2", card_type: "mastercard", gross_amount: 1850, deduction_pct: 1.5, deduction_amount: 28,  net_amount: 1822, date: "2026-03-12", period_from: "2026-03-10", period_to: "2026-03-11", paid_out: false, received_by: "",       notes: "" },
  { id: "cr3", driver_id: "d3", vehicle_id: "v3", card_type: "dina",       gross_amount: 3200, deduction_pct: 1.0, deduction_amount: 32,  net_amount: 3168, date: "2026-03-12", period_from: "2026-03-10", period_to: "2026-03-11", paid_out: false, received_by: "",       notes: "" },
];

// ─── HELPERS ─────────────────────────────────────────────────
export function getDriverById(id: string) { return drivers.find(d => d.id === id); }
export function getVehicleById(id: string) { return vehicles.find(v => v.id === id); }

export function getCashForDate(date: string) {
  return cashEntries.filter(e => e.date === date);
}

export function getCashBalance(upToDate: string) {
  return cashEntries
    .filter(e => e.date <= upToDate)
    .reduce((sum, e) => e.direction === "in" ? sum + e.amount : sum - e.amount, 0);
}

export function getCashForPeriod(from: string, to: string) {
  const entries = cashEntries.filter(e => e.date >= from && e.date <= to);
  const total_in  = entries.filter(e => e.direction === "in").reduce((s,e) => s+e.amount, 0);
  const total_out = entries.filter(e => e.direction === "out").reduce((s,e) => s+e.amount, 0);
  return { entries, total_in, total_out, balance: total_in - total_out };
}

export function getDriverMonthSummary(driverId: string, year: number, month: number) {
  const prefix = `${year}-${String(month).padStart(2,"0")}`;
  const events  = cashEntries.filter(e => e.driver_id === driverId && e.date.startsWith(prefix));
  const paid    = events.filter(e => e.direction === "in").reduce((s,e) => s+e.amount, 0);
  const out     = events.filter(e => e.direction === "out").reduce((s,e) => s+e.amount, 0);
  return { paid, out, events, pending: 0 };
}

export function getOpenDebts() {
  return driverDebts.filter(d => d.status !== "closed");
}

export function getDebtPayments(debtId: string) {
  return debtPayments.filter(p => p.debt_id === debtId);
}
