export interface Driver {
  id: string;
  full_name: string;
  phone: string;
  address: string;
  license_number: string;
  bank_account: string;
  bank_card_number: string;
  notes: string;
  status: "active" | "inactive";
  created_at: string;
  daily_rate: number;
  vehicle_id: string;
  pos_monthly_fee: number; // Mjesecna naknada za POS terminal
}

export interface PosTerminalCharge {
  id: string;
  driver_id: string;
  vehicle_id: string;
  amount: number;          // Iznos naknade
  month: string;           // Format: "2025-03"
  status: "pending" | "paid" | "partial";
  paid_amount: number;
  created_at: string;
  notes: string;
}

export interface PosTerminalPayment {
  id: string;
  charge_id: string;
  driver_id: string;
  amount: number;
  payment_date: string;
  received_by: string;     // Ko je primio uplatu
  notes: string;
}

export interface PosPayoutRequest {
  id: string;
  driver_id: string;
  vehicle_id: string;
  amount: number;
  action: "deduct_debt" | "pay_cash";
  status: "pending" | "done";
  request_date: string;
  resolved_date: string | null;
  notes: string;
}

export interface YandexReport {
  id: string;
  vehicle_id: string;
  driver_id: string;
  amount: number;
  period_from: string;
  period_to: string;
  report_date: string;
  notes: string;
}

export interface VoucherEntry {
  id: string;
  driver_id: string;
  count: number;
  amount: number;
  date: string;
  paid_out: boolean;
  notes: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number;
  license_plate: string;
  vin_number: string;
  registration_expiry: string;
  insurance_expiry: string;
  status: "active" | "maintenance" | "inactive";
  notes: string;
  created_at: string;
  taxi_license_number: string;
  pos_terminal_id: string;
}

export interface DriverVehicleAssignment {
  id: string;
  driver_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string | null;
  rent_amount: number;
  rent_type: "daily" | "weekly" | "monthly";
}

export interface RentCharge {
  id: string;
  driver_id: string;
  vehicle_id: string;
  daily_rate: number;
  days: number;
  off_days: number;
  total_amount: number;
  date_from: string;
  date_to: string;
  created_at: string;
  notes: string;
}

export interface RentPayment {
  id: string;
  charge_id: string;
  driver_id: string;
  amount: number;
  payment_date: string;
  payment_method: "cash" | "bank" | "card";
  notes: string;
}

export interface DriverOffDay {
  id: string;
  driver_id: string;
  vehicle_id: string;
  date: string;
  notes: string;
}

export interface PosReport {
  id: string;
  vehicle_id: string;
  driver_id: string;
  amount: number;
  report_date: string;
  period_from: string;
  period_to: string;
  notes: string;
}

export interface Payment {
  id: string;
  driver_id: string;
  amount: number;
  payment_type: "rent" | "fine" | "other";
  payment_method: "cash" | "bank" | "card";
  payment_date: string;
  notes: string;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  expense_type: "repair" | "service" | "insurance" | "other";
  amount: number;
  description: string;
  date: string;
}

export const drivers: Driver[] = [
  { id: "d1", full_name: "Ahmed Hassan", phone: "+1 555-0101", address: "123 Main St", license_number: "DL-2024-001", bank_account: "US12345678901234", bank_card_number: "4111-XXXX-XXXX-1234", notes: "Reliable driver", status: "active", created_at: "2024-01-15", daily_rate: 3500, vehicle_id: "v1", pos_monthly_fee: 800 },
  { id: "d2", full_name: "Maria Rodriguez", phone: "+1 555-0102", address: "456 Oak Ave", license_number: "DL-2024-002", bank_account: "US98765432101234", bank_card_number: "5200-XXXX-XXXX-5678", notes: "", status: "active", created_at: "2024-02-10", daily_rate: 3000, vehicle_id: "v2", pos_monthly_fee: 600 },
  { id: "d3", full_name: "James Wilson", phone: "+1 555-0103", address: "789 Pine Rd", license_number: "DL-2024-003", bank_account: "US11223344556677", bank_card_number: "3700-XXXX-XXXX-9012", notes: "Night shift preferred", status: "active", created_at: "2024-03-05", daily_rate: 4000, vehicle_id: "v3", pos_monthly_fee: 1000 },
  { id: "d4", full_name: "Fatima Al-Rashid", phone: "+1 555-0104", address: "321 Elm Blvd", license_number: "DL-2024-004", bank_account: "US99887766554433", bank_card_number: "6011-XXXX-XXXX-3456", notes: "", status: "active", created_at: "2024-03-20", daily_rate: 3800, vehicle_id: "v4", pos_monthly_fee: 750 },
  { id: "d5", full_name: "Chen Wei", phone: "+1 555-0105", address: "654 Maple Dr", license_number: "DL-2024-005", bank_account: "US55667788990011", bank_card_number: "4222-XXXX-XXXX-7890", notes: "On medical leave", status: "inactive", created_at: "2024-04-01", daily_rate: 3200, vehicle_id: "", pos_monthly_fee: 0 },
  { id: "d6", full_name: "Kofi Mensah", phone: "+1 555-0106", address: "987 Cedar Ln", license_number: "DL-2024-006", bank_account: "US33445566778899", bank_card_number: "5100-XXXX-XXXX-2345", notes: "", status: "active", created_at: "2024-05-12", daily_rate: 2800, vehicle_id: "v7", pos_monthly_fee: 500 },
];

export const vehicles: Vehicle[] = [
  { id: "v1", brand: "Toyota", model: "Camry", year: 2023, license_plate: "TX-1001", vin_number: "1HGBH41JXMN109186", registration_expiry: "2025-06-15", insurance_expiry: "2025-03-20", status: "active", notes: "", created_at: "2024-01-10", taxi_license_number: "TAXI-0101", pos_terminal_id: "POS-A01" },
  { id: "v2", brand: "Honda", model: "Accord", year: 2022, license_plate: "TX-1002", vin_number: "2HGBH41JXMN209286", registration_expiry: "2025-08-22", insurance_expiry: "2025-05-10", status: "active", notes: "", created_at: "2024-01-12", taxi_license_number: "TAXI-0102", pos_terminal_id: "POS-A02" },
  { id: "v3", brand: "Hyundai", model: "Sonata", year: 2023, license_plate: "TX-1003", vin_number: "3HGBH41JXMN309386", registration_expiry: "2025-09-30", insurance_expiry: "2025-07-15", status: "active", notes: "New tires installed", created_at: "2024-02-01", taxi_license_number: "TAXI-0103", pos_terminal_id: "POS-B01" },
  { id: "v4", brand: "Kia", model: "K5", year: 2024, license_plate: "TX-1004", vin_number: "4HGBH41JXMN409486", registration_expiry: "2026-01-10", insurance_expiry: "2025-11-20", status: "active", notes: "", created_at: "2024-03-15", taxi_license_number: "TAXI-0104", pos_terminal_id: "POS-B02" },
  { id: "v5", brand: "Nissan", model: "Altima", year: 2021, license_plate: "TX-1005", vin_number: "5HGBH41JXMN509586", registration_expiry: "2025-04-05", insurance_expiry: "2025-02-28", status: "maintenance", notes: "Engine repair in progress", created_at: "2024-01-20", taxi_license_number: "TAXI-0105", pos_terminal_id: "POS-C01" },
  { id: "v6", brand: "Toyota", model: "Corolla", year: 2022, license_plate: "TX-1006", vin_number: "6HGBH41JXMN609686", registration_expiry: "2025-12-01", insurance_expiry: "2025-09-15", status: "inactive", notes: "Retired from fleet", created_at: "2024-02-10", taxi_license_number: "TAXI-0106", pos_terminal_id: "POS-C02" },
  { id: "v7", brand: "Chevrolet", model: "Malibu", year: 2023, license_plate: "TX-1007", vin_number: "7HGBH41JXMN709786", registration_expiry: "2026-03-20", insurance_expiry: "2026-01-10", status: "active", notes: "", created_at: "2024-04-01", taxi_license_number: "TAXI-0107", pos_terminal_id: "POS-D01" },
];

export const assignments: DriverVehicleAssignment[] = [
  { id: "a1", driver_id: "d1", vehicle_id: "v1", start_date: "2024-02-01", end_date: null, rent_amount: 1200, rent_type: "monthly" },
  { id: "a2", driver_id: "d2", vehicle_id: "v2", start_date: "2024-03-01", end_date: null, rent_amount: 1100, rent_type: "monthly" },
  { id: "a3", driver_id: "d3", vehicle_id: "v3", start_date: "2024-04-01", end_date: null, rent_amount: 1300, rent_type: "monthly" },
  { id: "a4", driver_id: "d4", vehicle_id: "v4", start_date: "2024-04-15", end_date: null, rent_amount: 1400, rent_type: "monthly" },
  { id: "a5", driver_id: "d6", vehicle_id: "v7", start_date: "2024-06-01", end_date: null, rent_amount: 300, rent_type: "weekly" },
  { id: "a6", driver_id: "d5", vehicle_id: "v3", start_date: "2024-01-01", end_date: "2024-03-31", rent_amount: 1000, rent_type: "monthly" },
];

export const payments: Payment[] = [
  { id: "p1", driver_id: "d1", amount: 1200, payment_type: "rent", payment_method: "bank", payment_date: "2025-01-05", notes: "January rent" },
  { id: "p2", driver_id: "d1", amount: 1200, payment_type: "rent", payment_method: "bank", payment_date: "2025-02-03", notes: "February rent" },
  { id: "p3", driver_id: "d2", amount: 1100, payment_type: "rent", payment_method: "cash", payment_date: "2025-01-08", notes: "January rent" },
  { id: "p4", driver_id: "d2", amount: 1100, payment_type: "rent", payment_method: "cash", payment_date: "2025-02-06", notes: "February rent" },
  { id: "p5", driver_id: "d3", amount: 1300, payment_type: "rent", payment_method: "card", payment_date: "2025-01-10", notes: "January rent" },
  { id: "p6", driver_id: "d3", amount: 150, payment_type: "fine", payment_method: "cash", payment_date: "2025-01-20", notes: "Traffic violation" },
  { id: "p7", driver_id: "d4", amount: 1400, payment_type: "rent", payment_method: "bank", payment_date: "2025-01-12", notes: "January rent" },
  { id: "p8", driver_id: "d4", amount: 1400, payment_type: "rent", payment_method: "bank", payment_date: "2025-02-10", notes: "February rent" },
  { id: "p9", driver_id: "d6", amount: 300, payment_type: "rent", payment_method: "cash", payment_date: "2025-01-07", notes: "Week 1" },
  { id: "p10", driver_id: "d6", amount: 300, payment_type: "rent", payment_method: "cash", payment_date: "2025-01-14", notes: "Week 2" },
  { id: "p11", driver_id: "d1", amount: 1200, payment_type: "rent", payment_method: "bank", payment_date: "2025-03-04", notes: "March rent" },
  { id: "p12", driver_id: "d2", amount: 1100, payment_type: "rent", payment_method: "cash", payment_date: "2025-03-05", notes: "March rent" },
];

export const expenses: Expense[] = [
  { id: "e1", vehicle_id: "v1", expense_type: "service", amount: 350, description: "Oil change and filter replacement", date: "2025-01-15" },
  { id: "e2", vehicle_id: "v2", expense_type: "repair", amount: 800, description: "Brake pad replacement", date: "2025-01-20" },
  { id: "e3", vehicle_id: "v3", expense_type: "insurance", amount: 1200, description: "Annual insurance renewal", date: "2025-02-01" },
  { id: "e4", vehicle_id: "v5", expense_type: "repair", amount: 2500, description: "Engine overhaul", date: "2025-02-10" },
  { id: "e5", vehicle_id: "v1", expense_type: "service", amount: 150, description: "Tire rotation", date: "2025-02-20" },
  { id: "e6", vehicle_id: "v4", expense_type: "other", amount: 200, description: "Interior cleaning and detailing", date: "2025-03-01" },
  { id: "e7", vehicle_id: "v7", expense_type: "service", amount: 400, description: "Full service check", date: "2025-03-05" },
  { id: "e8", vehicle_id: "v2", expense_type: "insurance", amount: 1100, description: "Insurance renewal", date: "2025-01-10" },
];

export const rentCharges: RentCharge[] = [
  { id: "rc1", driver_id: "d1", vehicle_id: "v1", daily_rate: 3500, days: 5, off_days: 0, total_amount: 17500, date_from: "2025-03-01", date_to: "2025-03-05", created_at: "2025-03-01", notes: "" },
  { id: "rc2", driver_id: "d2", vehicle_id: "v2", daily_rate: 3000, days: 7, off_days: 1, total_amount: 19500, date_from: "2025-03-01", date_to: "2025-03-07", created_at: "2025-03-01", notes: "" },
  { id: "rc3", driver_id: "d1", vehicle_id: "v1", daily_rate: 3500, days: 3, off_days: 0, total_amount: 10500, date_from: "2025-03-06", date_to: "2025-03-08", created_at: "2025-03-06", notes: "Vikend" },
  { id: "rc4", driver_id: "d3", vehicle_id: "v3", daily_rate: 4000, days: 5, off_days: 2, total_amount: 16000, date_from: "2025-03-01", date_to: "2025-03-05", created_at: "2025-03-01", notes: "" },
];

export const rentPayments: RentPayment[] = [
  { id: "rp1", charge_id: "rc1", driver_id: "d1", amount: 10000, payment_date: "2025-03-03", payment_method: "cash", notes: "Prva rata" },
  { id: "rp2", charge_id: "rc1", driver_id: "d1", amount: 7500, payment_date: "2025-03-06", payment_method: "cash", notes: "Ostatak" },
  { id: "rp3", charge_id: "rc2", driver_id: "d2", amount: 6000, payment_date: "2025-03-05", payment_method: "cash", notes: "" },
  { id: "rp4", charge_id: "rc4", driver_id: "d3", amount: 16000, payment_date: "2025-03-04", payment_method: "bank", notes: "" },
];

export const offDays: DriverOffDay[] = [
  { id: "od1", driver_id: "d1", vehicle_id: "v1", date: "2025-03-03", notes: "Bolovanje" },
  { id: "od2", driver_id: "d2", vehicle_id: "v2", date: "2025-03-05", notes: "" },
  { id: "od3", driver_id: "d3", vehicle_id: "v3", date: "2025-02-20", notes: "Lični razlog" },
];

export const posReports: PosReport[] = [
  { id: "pr1", vehicle_id: "v1", driver_id: "d1", amount: 850, report_date: "2025-03-03", period_from: "2025-02-24", period_to: "2025-03-02", notes: "Izvod br. 012" },
  { id: "pr2", vehicle_id: "v2", driver_id: "d2", amount: 620, report_date: "2025-03-03", period_from: "2025-02-24", period_to: "2025-03-02", notes: "" },
  { id: "pr3", vehicle_id: "v1", driver_id: "d1", amount: 910, report_date: "2025-03-07", period_from: "2025-03-03", period_to: "2025-03-06", notes: "Izvod br. 013" },
  { id: "pr4", vehicle_id: "v3", driver_id: "d3", amount: 740, report_date: "2025-03-07", period_from: "2025-03-03", period_to: "2025-03-06", notes: "" },
  { id: "pr5", vehicle_id: "v4", driver_id: "d4", amount: 1100, report_date: "2025-03-07", period_from: "2025-03-03", period_to: "2025-03-06", notes: "" },
];
export function getDriverById(id: string) { return drivers.find(d => d.id === id); }
export function getVehicleById(id: string) { return vehicles.find(v => v.id === id); }
export function getActiveAssignments() { return assignments.filter(a => !a.end_date); }
export function getAssignmentsByDriver(driverId: string) { return assignments.filter(a => a.driver_id === driverId); }
export function getAssignmentsByVehicle(vehicleId: string) { return assignments.filter(a => a.vehicle_id === vehicleId); }
export function getPaymentsByDriver(driverId: string) { return payments.filter(p => p.driver_id === driverId); }
export function getExpensesByVehicle(vehicleId: string) { return expenses.filter(e => e.vehicle_id === vehicleId); }
export function getActiveAssignmentForDriver(driverId: string) { return assignments.find(a => a.driver_id === driverId && !a.end_date); }
export function getActiveAssignmentForVehicle(vehicleId: string) { return assignments.find(a => a.vehicle_id === vehicleId && !a.end_date); }

export const posPayoutRequests: PosPayoutRequest[] = [
  { id: "pp1", driver_id: "d1", vehicle_id: "v1", amount: 1760, action: "pay_cash", status: "done", request_date: "2025-03-04", resolved_date: "2025-03-04", notes: "Isplaceno gotovinom" },
  { id: "pp2", driver_id: "d2", vehicle_id: "v2", amount: 620, action: "deduct_debt", status: "done", request_date: "2025-03-04", resolved_date: "2025-03-04", notes: "Oduzeto od duga" },
  { id: "pp3", driver_id: "d1", vehicle_id: "v1", amount: 910, action: "pay_cash", status: "pending", request_date: "2025-03-08", resolved_date: null, notes: "" },
];

export function getPosPayoutsByDriver(driverId: string) { return posPayoutRequests.filter(p => p.driver_id === driverId); }
export function getPosDeductedFromDebt(driverId: string) { return posPayoutRequests.filter(p => p.driver_id === driverId && p.action === "deduct_debt" && p.status === "done").reduce((s, p) => s + p.amount, 0); }
export function getPosAccumulatedByVehicle(vehicleId: string) {
  const total = posReports.filter(p => p.vehicle_id === vehicleId).reduce((s, p) => s + p.amount, 0);
  const paid = posPayoutRequests.filter(p => p.vehicle_id === vehicleId && p.status === "done").reduce((s, p) => s + p.amount, 0);
  return total - paid;
}

export function getMonthlyRentIncome() {
  return getActiveAssignments().reduce((sum, a) => {
    if (a.rent_type === "monthly") return sum + a.rent_amount;
    if (a.rent_type === "weekly") return sum + a.rent_amount * 4;
    if (a.rent_type === "daily") return sum + a.rent_amount * 30;
    return sum;
  }, 0);
}

export const monthlyIncomeData = [
  { month: "Oct", income: 4800, expenses: 1200 },
  { month: "Nov", income: 5100, expenses: 1800 },
  { month: "Dec", income: 5300, expenses: 900 },
  { month: "Jan", income: 5500, expenses: 2450 },
  { month: "Feb", income: 5200, expenses: 3850 },
  { month: "Mar", income: 5500, expenses: 600 },
];

export const expensesByType = [
  { type: "Repair", amount: 3300 },
  { type: "Service", amount: 900 },
  { type: "Insurance", amount: 2300 },
  { type: "Other", amount: 200 },
];

export const yandexReports: YandexReport[] = [
  { id: "yr1", vehicle_id: "v1", driver_id: "d1", amount: 4200, period_from: "2025-03-01", period_to: "2025-03-05", report_date: "2025-03-06", notes: "" },
  { id: "yr2", vehicle_id: "v2", driver_id: "d2", amount: 3800, period_from: "2025-03-01", period_to: "2025-03-05", report_date: "2025-03-06", notes: "" },
  { id: "yr3", vehicle_id: "v3", driver_id: "d3", amount: 5100, period_from: "2025-03-01", period_to: "2025-03-07", report_date: "2025-03-08", notes: "Izvod #Y-441" },
];

export const voucherEntries: VoucherEntry[] = [
  { id: "ve1", driver_id: "d1", count: 3, amount: 1200, date: "2025-03-04", paid_out: true, notes: "" },
  { id: "ve2", driver_id: "d2", count: 2, amount: 800, date: "2025-03-05", paid_out: false, notes: "" },
  { id: "ve3", driver_id: "d3", count: 5, amount: 2000, date: "2025-03-06", paid_out: true, notes: "" },
];

export function getYandexByDriver(driverId: string) { return yandexReports.filter(y => y.driver_id === driverId); }
export function getVouchersByDriver(driverId: string) { return voucherEntries.filter(v => v.driver_id === driverId); }
export function getYandexTotalByDriver(driverId: string) { return yandexReports.filter(y => y.driver_id === driverId).reduce((s, y) => s + y.amount, 0); }
export function getVoucherTotalByDriver(driverId: string) { return voucherEntries.filter(v => v.driver_id === driverId).reduce((s, v) => s + v.amount, 0); }
export function getPosReportsByVehicle(vehicleId: string) { return posReports.filter(p => p.vehicle_id === vehicleId); }
export function getRentChargesByDriver(driverId: string) { return rentCharges.filter(c => c.driver_id === driverId); }
export function getRentPaymentsByCharge(chargeId: string) { return rentPayments.filter(p => p.charge_id === chargeId); }
export function getPaidAmount(chargeId: string) { return rentPayments.filter(p => p.charge_id === chargeId).reduce((sum, p) => sum + p.amount, 0); }
export function getRemainingAmount(chargeId: string, totalAmount: number) { return totalAmount - getPaidAmount(chargeId); }

export function calculateRent(
  dailyRate: number,
  totalDays: number,
  offDaysCount: number
): { workDays: number; offDays: number; total: number } {
  const workDays = totalDays - offDaysCount;
  const total = workDays * dailyRate + offDaysCount * (dailyRate * 0.5);
  return { workDays, offDays: offDaysCount, total };
}

export const posTerminalCharges: PosTerminalCharge[] = [
  { id: "ptc1", driver_id: "d1", vehicle_id: "v1", amount: 800, month: "2025-01", status: "paid", paid_amount: 800, created_at: "2025-01-01", notes: "" },
  { id: "ptc2", driver_id: "d2", vehicle_id: "v2", amount: 600, month: "2025-01", status: "paid", paid_amount: 600, created_at: "2025-01-01", notes: "" },
  { id: "ptc3", driver_id: "d3", vehicle_id: "v3", amount: 1000, month: "2025-01", status: "paid", paid_amount: 1000, created_at: "2025-01-01", notes: "" },
  { id: "ptc4", driver_id: "d4", vehicle_id: "v4", amount: 750, month: "2025-01", status: "paid", paid_amount: 750, created_at: "2025-01-01", notes: "" },
  { id: "ptc5", driver_id: "d6", vehicle_id: "v7", amount: 500, month: "2025-01", status: "paid", paid_amount: 500, created_at: "2025-01-01", notes: "" },
  { id: "ptc6", driver_id: "d1", vehicle_id: "v1", amount: 800, month: "2025-02", status: "paid", paid_amount: 800, created_at: "2025-02-01", notes: "" },
  { id: "ptc7", driver_id: "d2", vehicle_id: "v2", amount: 600, month: "2025-02", status: "partial", paid_amount: 300, created_at: "2025-02-01", notes: "Djelimicno placeno" },
  { id: "ptc8", driver_id: "d3", vehicle_id: "v3", amount: 1000, month: "2025-02", status: "paid", paid_amount: 1000, created_at: "2025-02-01", notes: "" },
  { id: "ptc9", driver_id: "d4", vehicle_id: "v4", amount: 750, month: "2025-02", status: "pending", paid_amount: 0, created_at: "2025-02-01", notes: "" },
  { id: "ptc10", driver_id: "d6", vehicle_id: "v7", amount: 500, month: "2025-02", status: "pending", paid_amount: 0, created_at: "2025-02-01", notes: "" },
  { id: "ptc11", driver_id: "d1", vehicle_id: "v1", amount: 800, month: "2025-03", status: "partial", paid_amount: 400, created_at: "2025-03-01", notes: "" },
  { id: "ptc12", driver_id: "d2", vehicle_id: "v2", amount: 600, month: "2025-03", status: "pending", paid_amount: 0, created_at: "2025-03-01", notes: "" },
  { id: "ptc13", driver_id: "d3", vehicle_id: "v3", amount: 1000, month: "2025-03", status: "pending", paid_amount: 0, created_at: "2025-03-01", notes: "" },
  { id: "ptc14", driver_id: "d4", vehicle_id: "v4", amount: 750, month: "2025-03", status: "pending", paid_amount: 0, created_at: "2025-03-01", notes: "" },
  { id: "ptc15", driver_id: "d6", vehicle_id: "v7", amount: 500, month: "2025-03", status: "pending", paid_amount: 0, created_at: "2025-03-01", notes: "" },
];

export const posTerminalPayments: PosTerminalPayment[] = [
  { id: "ptp1", charge_id: "ptc1", driver_id: "d1", amount: 800, payment_date: "2025-01-05", received_by: "Admin", notes: "" },
  { id: "ptp2", charge_id: "ptc2", driver_id: "d2", amount: 600, payment_date: "2025-01-06", received_by: "Admin", notes: "" },
  { id: "ptp3", charge_id: "ptc3", driver_id: "d3", amount: 1000, payment_date: "2025-01-07", received_by: "Admin", notes: "" },
  { id: "ptp4", charge_id: "ptc4", driver_id: "d4", amount: 750, payment_date: "2025-01-08", received_by: "Admin", notes: "" },
  { id: "ptp5", charge_id: "ptc5", driver_id: "d6", amount: 500, payment_date: "2025-01-09", received_by: "Admin", notes: "" },
  { id: "ptp6", charge_id: "ptc6", driver_id: "d1", amount: 800, payment_date: "2025-02-04", received_by: "Nemanja", notes: "" },
  { id: "ptp7", charge_id: "ptc7", driver_id: "d2", amount: 300, payment_date: "2025-02-05", received_by: "Milica", notes: "Djelimicna uplata" },
  { id: "ptp8", charge_id: "ptc8", driver_id: "d3", amount: 1000, payment_date: "2025-02-06", received_by: "Nemanja", notes: "" },
  { id: "ptp9", charge_id: "ptc11", driver_id: "d1", amount: 400, payment_date: "2025-03-03", received_by: "Milica", notes: "Prva rata marta" },
];

export function getPosTerminalChargesByDriver(driverId: string) {
  return posTerminalCharges.filter(c => c.driver_id === driverId);
}
export function getPosTerminalPaymentsByCharge(chargeId: string) {
  return posTerminalPayments.filter(p => p.charge_id === chargeId);
}
export function getPosTerminalDebtByDriver(driverId: string) {
  return posTerminalCharges
    .filter(c => c.driver_id === driverId)
    .reduce((sum, c) => sum + (c.amount - c.paid_amount), 0);
}

// ─── DUGOVANJA VOZACA ────────────────────────────────────────
export type DebtType = "pos_fee" | "damage" | "penalty" | "loan" | "other";

export interface DriverDebt {
  id: string;
  driver_id: string;
  type: DebtType;
  description: string;       // npr. "Šteta na vozilu v1 — bočni udar"
  total_amount: number;      // Ukupan dug
  date: string;              // Datum nastanka duga
  created_by: string;        // Ko je kreirao
  created_at: string;
  notes: string;
  status: "open" | "closed"; // open = ima ostatka, closed = izmireno
}

export interface DebtPayment {
  id: string;
  debt_id: string;
  driver_id: string;
  amount: number;
  payment_date: string;
  received_by: string;       // Ko je primio/evidentirao
  notes: string;
}

export const driverDebts: DriverDebt[] = [
  { id: "dd1", driver_id: "d1", type: "damage",  description: "Šteta na vozilu — ogrebotina na boku", total_amount: 35000, date: "2025-02-10", created_by: "Nemanja", created_at: "2025-02-10", notes: "Popravka u servisu Autolak", status: "open" },
  { id: "dd2", driver_id: "d2", type: "pos_fee", description: "POS naknada Januar 2025", total_amount: 600, date: "2025-01-01", created_by: "Admin", created_at: "2025-01-01", notes: "", status: "closed" },
  { id: "dd3", driver_id: "d2", type: "pos_fee", description: "POS naknada Februar 2025", total_amount: 600, date: "2025-02-01", created_by: "Admin", created_at: "2025-02-01", notes: "", status: "open" },
  { id: "dd4", driver_id: "d3", type: "penalty", description: "Saobraćajna kazna — prebrza vožnja", total_amount: 12000, date: "2025-02-20", created_by: "Milica", created_at: "2025-02-20", notes: "Kazna plaćena od firme, vozač vraća", status: "open" },
  { id: "dd5", driver_id: "d4", type: "loan",    description: "Pozajmica — lični razlog", total_amount: 20000, date: "2025-03-01", created_by: "Nemanja", created_at: "2025-03-01", notes: "Dogovor: vraća 5000 RSD sedmično", status: "open" },
  { id: "dd6", driver_id: "d1", type: "pos_fee", description: "POS naknada Mart 2025", total_amount: 800, date: "2025-03-01", created_by: "Admin", created_at: "2025-03-01", notes: "", status: "open" },
  { id: "dd7", driver_id: "d6", type: "other",   description: "Nadoknada za uniformu", total_amount: 3500, date: "2025-03-05", created_by: "Milica", created_at: "2025-03-05", notes: "", status: "open" },
];

export const debtPayments: DebtPayment[] = [
  { id: "dp1", debt_id: "dd1", driver_id: "d1", amount: 10000, payment_date: "2025-02-15", received_by: "Nemanja", notes: "Prva rata" },
  { id: "dp2", debt_id: "dd1", driver_id: "d1", amount: 15000, payment_date: "2025-03-01", received_by: "Milica",  notes: "Druga rata" },
  { id: "dp3", debt_id: "dd2", driver_id: "d2", amount: 600,   payment_date: "2025-01-06", received_by: "Admin",   notes: "" },
  { id: "dp4", debt_id: "dd3", driver_id: "d2", amount: 300,   payment_date: "2025-02-05", received_by: "Milica",  notes: "Djelimično" },
  { id: "dp5", debt_id: "dd4", driver_id: "d3", amount: 5000,  payment_date: "2025-03-01", received_by: "Nemanja", notes: "" },
  { id: "dp6", debt_id: "dd5", driver_id: "d4", amount: 5000,  payment_date: "2025-03-08", received_by: "Nemanja", notes: "Prva sedmica" },
];

export function getDebtsByDriver(driverId: string) {
  return driverDebts.filter(d => d.driver_id === driverId);
}
export function getPaymentsByDebt(debtId: string) {
  return debtPayments.filter(p => p.debt_id === debtId);
}
export function getPaidForDebt(debtId: string) {
  return debtPayments.filter(p => p.debt_id === debtId).reduce((s, p) => s + p.amount, 0);
}
export function getTotalDebtByDriver(driverId: string) {
  return driverDebts
    .filter(d => d.driver_id === driverId && d.status === "open")
    .reduce((s, d) => s + (d.total_amount - getPaidForDebt(d.id)), 0);
}
