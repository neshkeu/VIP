import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, RefreshCw, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useApp, type Driver, type Vehicle, type YandexReport, type CardReport, type NeoplantaRide } from "@/context/AppContext";
import { useVehicleDrivers } from "@/hooks/useVehicleDrivers";
import { useAssignments } from "@/hooks/useAssignments";
import { useDriverRoles } from "@/hooks/useDriverRoles";
import { fmtD, localISO, todayISO } from "@/lib/date";
import { ReportTable, fmtMoney, type ReportCol } from "@/components/ReportTable";
import { TROSAK_KAT, PRIHOD_KAT } from "@/lib/cashCategories";
import { DriverCombobox } from "@/components/DriverCombobox";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Tipovi sirovih podataka ─────────────────────────────────
interface CashRow { id: string; type: string; direction: "in" | "out"; driver_id: string | null; amount: number; date: string; received_by: string; category: string | null; vehicle_id: string | null }
interface CalEntry { driver_id: string; date: string; status: string | null; sunday_status: string | null; off_status: string | null }
interface CalAmount { id: string; driver_id: string; date: string; type: string; amount: number }
interface Debt { id: string; driver_id: string; type: string; amount: number; paid_amount: number; date: string; description: string; status: string }
interface Penalty { id: string; vehicle_id: string | null; driver_id: string | null; violation_date: string; amount: number }
interface Membership { driver_id: string; date_from: string; date_to: string; amount: number }
interface Raw {
  cash: CashRow[]; calEntries: CalEntry[]; calAmounts: CalAmount[]; debts: Debt[]; penalties: Penalty[];
  memberships: Membership[]; yandex: YandexReport[]; cards: CardReport[]; neo: NeoplantaRide[];
}

// Supabase vraća najviše 1000 redova po upitu — čitamo u stranama.
async function fetchAllRows<T>(table: string, select: string, filter?: (q: any) => any): Promise<T[]> {
  const out: T[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q: any = supabase.from(table).select(select);
    if (filter) q = filter(q);
    const { data, error } = await q.order("id").range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

// ─── Pomoćne funkcije ─────────────────────────────────────────
const MONTHS = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];
const monthLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const addDays = (iso: string, n: number) => { const d = new Date(iso + "T00:00:00"); d.setDate(d.getDate() + n); return localISO(d); };
const dayDiff = (a: string, b: string) => Math.round((new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime()) / 86400000);
const isSunday = (iso: string) => new Date(iso + "T00:00:00").getDay() === 0;
function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let y = Number(from.slice(0, 4)), m = Number(from.slice(5, 7));
  const ey = Number(to.slice(0, 4)), em = Number(to.slice(5, 7));
  while ((y < ey || (y === ey && m <= em)) && out.length < 60) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
}
const inRange = (d: string | null | undefined, from: string, to: string) => !!d && d >= from && d <= to;
const sum = <T,>(rows: T[], f: (r: T) => number) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);

// Kategorije stavki kase
const PRIHOD = new Set(["renta", "clanarina", "pos_naknada", "bankarska_naknada", "aplikacija", "komunalni", "doprinosi"]);
const ISPLATA_VOZACU = new Set(["yandex", "kartica", "neoplanta", "pdv_gorivo", "vaučer", "vaučer_mb"]);
const CASH_LABELS: Record<string, string> = {
  renta: "Renta", clanarina: "Članarina", pos_naknada: "POS naknada", komunalni: "Komunalni", doprinosi: "Doprinosi",
  dugovanje: "Uplata dugovanja", likvidnost_in: "Likvidnost — ulaz", yandex: "Yandex isplata", kartica: "Kartica isplata",
  neoplanta: "Neoplanta isplata", vaučer: "Vaučer", vaučer_mb: "Vaučer (MB)", pdv_gorivo: "PDV gorivo",
  likvidnost_out: "Iz kase u banku / vlasniku", depozit: "Depozit vozača", kasa_depozit: "Depozit u kasi",
  vaučer_isplata: "Isplata vaučera (spolja)", bankarska_naknada: "Bankarska naknada", zaokruzivanje: "Zaokruživanje",
  trosak: "Trošak firme", ostali_prihod: "Ostali prihod", aplikacija: "Aplikacija", uskladjivanje: "Usklađivanje (Excel)", pozajmica: "Pozajmica vozaču",
};
const DEBT_LABELS: Record<string, string> = { steta: "Šteta", kazna: "Kazna", pozajmica: "Pozajmica", doprinosi: "Doprinosi", ostalo: "Ostalo" };

function Kpi({ title, value, note, tone }: { title: string; value: string; note?: string; tone?: "good" | "bad" | "warn" }) {
  const color = tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : tone === "warn" ? "text-amber-600" : "";
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <p className={`mt-1 text-xl sm:text-2xl font-display font-bold tabular-nums ${color}`}>{value}</p>
        {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  );
}
const rsd = (n: number) => `${fmtMoney(n)} RSD`;

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1"><Label className="text-xs text-muted-foreground">{label}</Label>{children}</div>;
}

// ═════════════════════════════════════════════════════════════
export default function ReportsPage() {
  const { drivers, vehicles } = useApp();
  const { links } = useVehicleDrivers();
  const { assignments } = useAssignments();
  const { isOperativni, operativeVehicleId } = useDriverRoles();
  const today = todayISO();

  // ── Filteri ──
  const [from, setFrom] = useState(today.slice(0, 7) + "-01");
  const [to, setTo] = useState(today);
  const [driverF, setDriverF] = useState("");
  const [vehicleF, setVehicleF] = useState("all");

  const preset = (k: string) => {
    const d = new Date();
    if (k === "month") { setFrom(today.slice(0, 7) + "-01"); setTo(today); }
    if (k === "prev") {
      const s = new Date(d.getFullYear(), d.getMonth() - 1, 1), e = new Date(d.getFullYear(), d.getMonth(), 0);
      setFrom(localISO(s)); setTo(localISO(e));
    }
    if (k === "30") { setFrom(addDays(today, -29)); setTo(today); }
    if (k === "year") { setFrom(`${d.getFullYear()}-01-01`); setTo(today); }
  };

  // ── Učitavanje ──
  const [raw, setRaw] = useState<Raw | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setErr(null);
    try {
      const period = (q: any) => q.gte("date", from).lte("date", to);
      const [cash, calEntries, calAmounts, debts, penalties, memberships, yandex, cards, neo] = await Promise.all([
        fetchAllRows<CashRow>("cash_entries", "id,type,direction,driver_id,amount,date,received_by,category,vehicle_id", period),
        fetchAllRows<CalEntry>("calendar_entries", "id,driver_id,date,status,sunday_status,off_status"),
        fetchAllRows<CalAmount>("calendar_amounts", "id,driver_id,date,type,amount", q => period(q).eq("type", "renta")),
        fetchAllRows<Debt>("driver_debts", "*"),
        fetchAllRows<Penalty>("penalties", "id,vehicle_id,driver_id,violation_date,amount"),
        fetchAllRows<Membership>("membership_entries", "id,driver_id,date_from,date_to,amount"),
        fetchAllRows<YandexReport>("yandex_reports", "*"),
        fetchAllRows<CardReport>("card_reports", "*"),
        fetchAllRows<NeoplantaRide>("neoplanta_rides", "*"),
      ]);
      setRaw({ cash, calEntries, calAmounts, debts, penalties, memberships, yandex, cards, neo });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally { setLoading(false); }
  }, [from, to]);
  useEffect(() => { if (from && to && from <= to) load(); }, [load, from, to]);

  // ── Vozač / vozilo ──
  const driverById = useMemo(() => new Map(drivers.map(d => [d.id, d])), [drivers]);
  const vehicleById = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const driverName = (id: string | null | undefined) => (id && driverById.get(id)?.full_name) || "—";
  // Vozilo vozača: operativno, pa bilo koja veza, pa staro polje
  const vehicleOf = (d: Driver): Vehicle | undefined => {
    const id = operativeVehicleId(d) ?? links.find(l => l.driver_id === d.id)?.vehicle_id ?? null;
    return id ? vehicleById.get(id) : undefined;
  };
  const komOf = (driverId: string | null | undefined) => {
    const d = driverId ? driverById.get(driverId) : undefined;
    return (d && vehicleOf(d)?.taxi_license_number) || "";
  };
  const vehLabel = (v?: Vehicle) => v ? `${v.brand} ${v.model}`.trim() : "";

  // Filter po vozaču i komunalnom broju (vozilu)
  const driverOk = useCallback((id: string | null | undefined) => {
    if (driverF && id !== driverF) return false;
    if (vehicleF !== "all") {
      if (!id) return false;
      return links.some(l => l.vehicle_id === vehicleF && l.driver_id === id)
        || driverById.get(id)?.vehicle_id === vehicleF
        || assignments.some(a => a.vehicle_id === vehicleF && a.driver_id === id);
    }
    return true;
  }, [driverF, vehicleF, links, driverById, assignments]);
  const vehicleOk = (id: string | null | undefined) => vehicleF === "all" || id === vehicleF;

  // ── Zaostatak rente (stanje DANAS) — ista pravila kao u Kasi ──
  const calByDriver = useMemo(() => {
    const m = new Map<string, Map<string, CalEntry>>();
    for (const e of raw?.calEntries ?? []) {
      if (!m.has(e.driver_id)) m.set(e.driver_id, new Map());
      m.get(e.driver_id)!.set(e.date, e);
    }
    return m;
  }, [raw]);

  const rentDrivers = useMemo(
    () => drivers.filter(d => d.status === "active" && d.driver_type === "renta" && isOperativni(d)),
    [drivers, isOperativni],
  );

  const arrears = useMemo(() => {
    const out = new Map<string, { rate: number; paidThrough: string | null; start: string | null; days: number; amount: number; ahead: number }>();
    for (const d of rentDrivers) {
      const rate = (d.daily_rate || 0) || (vehicleOf(d)?.daily_rate || 0);
      const sunRate = d.pays_sunday ? 0 : (d.sunday_rate || 0);
      const cal = calByDriver.get(d.id);
      let paidThrough: string | null = null;
      cal?.forEach(e => { if (e.status === "izmireno" && (!paidThrough || e.date > paidThrough)) paidThrough = e.date; });
      const openA = assignments.filter(a => a.driver_id === d.id && !a.date_to).sort((a, b) => b.date_from.localeCompare(a.date_from))[0];
      const start = paidThrough ? addDays(paidThrough, 1) : openA?.date_from ?? null;
      let days = 0, amount = 0;
      if (start && start <= today) {
        for (let dt = start, i = 0; dt <= today && i < 800; dt = addDays(dt, 1), i++) {
          const e = cal?.get(dt);
          const w = e?.off_status === "pola" ? 0.5 : e?.off_status ? 0 : 1;
          if (isSunday(dt) && !d.pays_sunday) {
            if (sunRate > 0) { days += w; amount += w * sunRate; }          // posebna cena nedelje
            else if (e?.sunday_status === "radi") { days += 1; amount += rate; }
            continue;
          }
          days += w; amount += w * rate;
        }
      }
      const ahead = paidThrough && paidThrough > today ? dayDiff(today, paidThrough) : 0;
      out.set(d.id, { rate, paidThrough, start, days, amount: Math.round(amount), ahead });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentDrivers, calByDriver, assignments, today, vehicles, links]);

  // ── Dugovi: ostatak po vozaču (stanje danas) ──
  const openDebtByDriver = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of raw?.debts ?? []) {
      const rest = (d.amount || 0) - (d.paid_amount || 0);
      if (d.status !== "closed" && rest > 0.01) m.set(d.driver_id, (m.get(d.driver_id) ?? 0) + rest);
    }
    return m;
  }, [raw]);

  // ── Neisplaćeno vozačima (Yandex/kartice/Neoplanta) ──
  const unpaid = useMemo(() => {
    const m = new Map<string, number>();
    const add = (id: string, n: number) => m.set(id, (m.get(id) ?? 0) + n);
    for (const r of raw?.yandex ?? []) if (!r.paid_out) add(r.driver_id, (r.net_amount ?? 0) > 0 ? r.net_amount - (r.paid_amount || 0) : r.net_amount);
    for (const r of raw?.cards ?? []) if (!r.paid_out) add(r.driver_id, (r.net_amount || 0) - (r.paid_amount || 0));
    for (const r of raw?.neo ?? []) if (!r.paid_out) add(r.driver_id, (r.amount || 0) - (r.paid_amount || 0));
    return m;
  }, [raw]);

  // ── Podaci u periodu, sa filterima ──
  const cash = useMemo(() => (raw?.cash ?? []).filter(e =>
    (!driverF && vehicleF === "all") || driverOk(e.driver_id) || (!driverF && !!e.vehicle_id && e.vehicle_id === vehicleF)),
  [raw, driverOk, driverF, vehicleF]);
  const calAmounts = useMemo(() => (raw?.calAmounts ?? []).filter(a => driverOk(a.driver_id)), [raw, driverOk]);
  const yandexP = useMemo(() => (raw?.yandex ?? []).filter(r => inRange(r.date, from, to) && driverOk(r.driver_id)), [raw, from, to, driverOk]);
  const cardsP = useMemo(() => (raw?.cards ?? []).filter(r => inRange(r.date, from, to) && driverOk(r.driver_id)), [raw, from, to, driverOk]);
  const neoP = useMemo(() => (raw?.neo ?? []).filter(r => inRange(r.date, from, to) && driverOk(r.driver_id)), [raw, from, to, driverOk]);
  const penaltiesP = useMemo(() => (raw?.penalties ?? []).filter(p =>
    inRange(p.violation_date, from, to) && (vehicleF === "all" || p.vehicle_id === vehicleF) && (!driverF || p.driver_id === driverF)),
  [raw, from, to, driverF, vehicleF]);
  const months = useMemo(() => monthsBetween(from, to), [from, to]);

  const offWeight = (driverId: string, date: string) => calByDriver.get(driverId)?.get(date)?.off_status === "pola" ? 0.5 : 1;

  // ═══ SAŽETAK ═══
  const summary = useMemo(() => {
    const inc = (f: (e: CashRow) => boolean) => sum(cash.filter(e => e.direction === "in" && f(e)), e => e.amount);
    const outc = (f: (e: CashRow) => boolean) => sum(cash.filter(e => e.direction === "out" && f(e)), e => e.amount);
    const prihod = inc(e => PRIHOD.has(e.type));
    const ostaliPrihod = inc(e => e.type === "ostali_prihod");
    const troskovi = outc(e => e.type === "trosak");
    const dugUplate = inc(e => e.type === "dugovanje");
    const isplate = outc(e => ISPLATA_VOZACU.has(e.type));
    const ydRegular = yandexP.filter(r => (r.gross_amount || 0) > 0);
    const yd10 = sum(ydRegular, r => r.deduction_amount);
    const yd3 = sum(yandexP.filter(r => !(r.gross_amount > 0) && (r.net_amount || 0) < 0), r => r.deduction_amount);
    const openDebt = [...openDebtByDriver.entries()].filter(([id]) => driverOk(id));
    const arr = [...arrears.entries()].filter(([id, a]) => driverOk(id) && a.amount > 0);
    const unp = [...unpaid.entries()].filter(([id, n]) => driverOk(id) && n > 0.01);
    const newDebts = sum((raw?.debts ?? []).filter(d => inRange(d.date, from, to) && driverOk(d.driver_id)), d => d.amount);
    return {
      prihod, ostaliPrihod, troskovi, zarada: prihod + ostaliPrihod - troskovi, dugUplate, isplate, yd10, yd3, newDebts,
      renta: inc(e => e.type === "renta"), clan: inc(e => e.type === "clanarina"),
      openDebt: sum(openDebt, x => x[1]), openDebtN: openDebt.length,
      arr: sum(arr, x => x[1].amount), arrN: arr.length,
      unpaid: sum(unp, x => x[1]), unpaidN: unp.length,
    };
  }, [cash, yandexP, openDebtByDriver, arrears, unpaid, raw, from, to, driverOk]);

  type MonthRow = { ym: string; renta: number; clan: number; ostaloPrihod: number; prihod: number; troskovi: number; zarada: number; dug: number; isplate: number; noviDug: number; ydBruto: number };
  const byMonth: MonthRow[] = useMemo(() => months.map(ym => {
    const c = cash.filter(e => e.date.startsWith(ym));
    const inT = (f: (e: CashRow) => boolean) => sum(c.filter(e => e.direction === "in" && f(e)), e => e.amount);
    const renta = inT(e => e.type === "renta"), clan = inT(e => e.type === "clanarina");
    const prihod = inT(e => PRIHOD.has(e.type) || e.type === "ostali_prihod");
    const troskovi = sum(c.filter(e => e.direction === "out" && e.type === "trosak"), e => e.amount);
    return {
      ym, renta, clan, ostaloPrihod: prihod - renta - clan, prihod, troskovi, zarada: prihod - troskovi,
      dug: inT(e => e.type === "dugovanje"),
      isplate: sum(c.filter(e => e.direction === "out" && ISPLATA_VOZACU.has(e.type)), e => e.amount),
      noviDug: sum((raw?.debts ?? []).filter(d => d.date.startsWith(ym) && driverOk(d.driver_id)), d => d.amount),
      ydBruto: sum(yandexP.filter(r => r.date.startsWith(ym)), r => r.gross_amount),
    };
  }), [months, cash, raw, yandexP, driverOk]);

  // Najveći dužnici: otvoren dug + zaostatak rente
  type DebtorRow = { id: string; name: string; kom: string; debt: number; arr: number; arrDays: number; total: number; phone: string };
  const debtors: DebtorRow[] = useMemo(() => {
    const ids = new Set([...openDebtByDriver.keys(), ...[...arrears.entries()].filter(([, a]) => a.amount > 0).map(([id]) => id)]);
    return [...ids].filter(driverOk).map(id => {
      const a = arrears.get(id);
      const debt = openDebtByDriver.get(id) ?? 0;
      return { id, name: driverName(id), kom: komOf(id), debt, arr: a?.amount ?? 0, arrDays: a?.days ?? 0, total: debt + (a?.amount ?? 0), phone: driverById.get(id)?.phone ?? "" };
    }).filter(r => r.total > 0.01);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openDebtByDriver, arrears, driverOk, driverById]);

  // ═══ RENTE ═══
  type RentRow = { id: string; name: string; kom: string; veh: string; rate: number; days: number; calAmt: number; cashAmt: number; paidThrough: string | null; arrDays: number; arrAmt: number; ahead: number };
  const rentRows: RentRow[] = useMemo(() => {
    const ids = new Set<string>([...rentDrivers.map(d => d.id), ...calAmounts.map(a => a.driver_id), ...cash.filter(e => e.type === "renta" && e.driver_id).map(e => e.driver_id!)]);
    return [...ids].filter(driverOk).map(id => {
      const d = driverById.get(id);
      const a = arrears.get(id);
      const am = calAmounts.filter(x => x.driver_id === id);
      return {
        id, name: driverName(id), kom: komOf(id), veh: d ? vehLabel(vehicleOf(d)) : "",
        rate: a?.rate ?? ((d?.daily_rate || 0) || (d ? vehicleOf(d)?.daily_rate || 0 : 0)),
        days: sum(am, x => offWeight(id, x.date)), calAmt: sum(am, x => x.amount),
        cashAmt: sum(cash.filter(e => e.driver_id === id && e.type === "renta" && e.direction === "in"), e => e.amount),
        paidThrough: a?.paidThrough ?? null, arrDays: a?.days ?? 0, arrAmt: a?.amount ?? 0, ahead: a?.ahead ?? 0,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rentDrivers, calAmounts, cash, arrears, driverOk, driverById]);

  // Po komunalnom broju: dani i iznos rente po vozilu na kom je vozač bio tog dana
  type KomRow = { id: string; kom: string; veh: string; plate: string; status: string; rate: number; ops: string; papN: number; days: number; amt: number; util: number | null; arr: number; penN: number; penAmt: number; owner: string; ownerPaid: number; costs: number; neto: number; reg: string | null; ins: string | null; lic: string | null };
  const workDaysInPeriod = useMemo(() => {
    let n = 0; const end = to < today ? to : today;
    for (let dt = from, i = 0; dt <= end && i < 4000; dt = addDays(dt, 1), i++) if (!isSunday(dt)) n++;
    return n;
  }, [from, to, today]);
  const komRows: KomRow[] = useMemo(() => {
    const vehOfAmount = (a: CalAmount) => {
      const asg = assignments.find(x => x.driver_id === a.driver_id && x.date_from <= a.date && (!x.date_to || a.date < x.date_to));
      if (asg) return asg.vehicle_id;
      const d = driverById.get(a.driver_id);
      return d ? operativeVehicleId(d) : null;
    };
    const perVeh = new Map<string, { days: number; amt: number }>();
    for (const a of calAmounts) {
      const vid = vehOfAmount(a); if (!vid) continue;
      const p = perVeh.get(vid) ?? { days: 0, amt: 0 };
      p.days += offWeight(a.driver_id, a.date); p.amt += a.amount;
      perVeh.set(vid, p);
    }
    return vehicles.filter(v => vehicleOk(v.id) && (!driverF || links.some(l => l.vehicle_id === v.id && l.driver_id === driverF) || driverById.get(driverF)?.vehicle_id === v.id)).map(v => {
      const vl = links.filter(l => l.vehicle_id === v.id);
      const opIds = new Set([...vl.filter(l => l.role === "operativni").map(l => l.driver_id), ...drivers.filter(d => d.vehicle_id === v.id && d.role === "operativni" && !vl.some(l => l.driver_id === d.id)).map(d => d.id)]);
      const ops = [...opIds].map(id => driverById.get(id)).filter((d): d is Driver => !!d && d.status === "active");
      const papN = vl.filter(l => l.role === "papiroloski").length;
      const p = perVeh.get(v.id) ?? { days: 0, amt: 0 };
      const pen = penaltiesP.filter(x => x.vehicle_id === v.id);
      const vCosts = (raw?.cash ?? []).filter(e => e.type === "trosak" && e.vehicle_id === v.id);
      const ownerPaid = sum(vCosts.filter(e => e.category === "vlasnik_kb"), e => e.amount);
      const costs = sum(vCosts.filter(e => e.category !== "vlasnik_kb"), e => e.amount);
      return {
        id: v.id, kom: v.taxi_license_number || "", veh: vehLabel(v), plate: v.license_plate || "", status: v.status, rate: v.daily_rate || 0,
        ops: ops.map(d => d.full_name).join(", "), papN, days: p.days, amt: p.amt,
        util: workDaysInPeriod > 0 && ops.some(d => d.driver_type === "renta") ? Math.round((p.days / workDaysInPeriod) * 100) : null,
        arr: sum(ops, d => arrears.get(d.id)?.amount ?? 0),
        penN: pen.length, penAmt: sum(pen, x => x.amount),
        owner: v.owner_name || "", ownerPaid, costs, neto: p.amt - ownerPaid - costs,
        reg: v.registration_expiry, ins: v.insurance_expiry, lic: v.taxi_license_expiry,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, links, drivers, calAmounts, assignments, penaltiesP, arrears, workDaysInPeriod, vehicleF, driverF, driverById, raw]);

  // ═══ DUGOVANJA ═══
  const [debtType, setDebtType] = useState("all");
  const [debtStatus, setDebtStatus] = useState("open");
  const [debtInPeriod, setDebtInPeriod] = useState(false);
  type DebtRow = Debt & { name: string; kom: string; rest: number; age: number };
  const debtRows: DebtRow[] = useMemo(() => (raw?.debts ?? [])
    .filter(d => driverOk(d.driver_id))
    .filter(d => debtType === "all" || d.type === debtType)
    .filter(d => !debtInPeriod || inRange(d.date, from, to))
    .map(d => ({ ...d, name: driverName(d.driver_id), kom: komOf(d.driver_id), rest: Math.max(0, (d.amount || 0) - (d.paid_amount || 0)), age: dayDiff(d.date, today) }))
    .filter(d => debtStatus === "all" || (debtStatus === "open" ? d.status !== "closed" && d.rest > 0.01 : d.status === "closed" || d.rest <= 0.01)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  [raw, driverOk, debtType, debtStatus, debtInPeriod, from, to, today]);

  type DebtDriverRow = { id: string; name: string; kom: string; n: number; total: number; paid: number; rest: number; oldest: string; age: number };
  const debtByDriver: DebtDriverRow[] = useMemo(() => {
    const m = new Map<string, DebtDriverRow>();
    for (const d of debtRows) {
      const r = m.get(d.driver_id) ?? { id: d.driver_id, name: d.name, kom: d.kom, n: 0, total: 0, paid: 0, rest: 0, oldest: d.date, age: 0 };
      r.n++; r.total += d.amount || 0; r.paid += d.paid_amount || 0; r.rest += d.rest;
      if (d.date < r.oldest) r.oldest = d.date;
      r.age = dayDiff(r.oldest, today);
      m.set(d.driver_id, r);
    }
    return [...m.values()];
  }, [debtRows, today]);

  const debtByType = useMemo(() => Object.keys(DEBT_LABELS).map(t => {
    const rows = debtRows.filter(d => d.type === t);
    return { id: t, label: DEBT_LABELS[t], n: rows.length, total: sum(rows, d => d.amount), paid: sum(rows, d => d.paid_amount), rest: sum(rows, d => d.rest) };
  }).filter(r => r.n > 0), [debtRows]);

  const aging = useMemo(() => {
    const open = debtRows.filter(d => d.rest > 0.01);
    const b = (lo: number, hi: number) => sum(open.filter(d => d.age >= lo && d.age <= hi), d => d.rest);
    return [
      { label: "Do 30 dana", v: b(0, 30) }, { label: "31–60 dana", v: b(31, 60) },
      { label: "61–90 dana", v: b(61, 90) }, { label: "Preko 90 dana", v: b(91, 100000) },
    ];
  }, [debtRows]);

  // Doprinosi po mesecima (mesec = datum duga, jedan dug po mesecu)
  const doprinosi = useMemo(() => {
    const m = new Map<string, { id: string; ym: string; n: number; total: number; paid: number; rest: number }>();
    for (const d of (raw?.debts ?? []).filter(x => x.type === "doprinosi" && driverOk(x.driver_id))) {
      const ym = d.date.slice(0, 7);
      const r = m.get(ym) ?? { id: ym, ym, n: 0, total: 0, paid: 0, rest: 0 };
      r.n++; r.total += d.amount || 0; r.paid += d.paid_amount || 0; r.rest += Math.max(0, (d.amount || 0) - (d.paid_amount || 0));
      m.set(ym, r);
    }
    return [...m.values()];
  }, [raw, driverOk]);

  // ═══ KASA ═══
  type CashTypeRow = { id: string; label: string; dir: string; total: number; [ym: string]: number | string };
  const cashMatrix = (dir: "in" | "out"): CashTypeRow[] => {
    const types = [...new Set(cash.filter(e => e.direction === dir).map(e => e.type))];
    return types.map(t => {
      const rows = cash.filter(e => e.direction === dir && e.type === t);
      const r: CashTypeRow = { id: t, label: CASH_LABELS[t] ?? t, dir, total: sum(rows, e => e.amount) };
      for (const ym of months) r[ym] = sum(rows.filter(e => e.date.startsWith(ym)), e => e.amount);
      return r;
    });
  };
  const cashIn = useMemo(() => cashMatrix("in"), [cash, months]);   // eslint-disable-line react-hooks/exhaustive-deps
  const cashOut = useMemo(() => cashMatrix("out"), [cash, months]); // eslint-disable-line react-hooks/exhaustive-deps
  const matrixCols: ReportCol<CashTypeRow>[] = [
    { key: "label", label: "Vrsta", value: r => r.label },
    ...months.map(ym => ({ key: ym, label: monthLabel(ym), value: (r: CashTypeRow) => r[ym] as number, money: true, sum: true })),
    ...(months.length > 1 ? [{ key: "total", label: "Ukupno", value: (r: CashTypeRow) => r.total, money: true, sum: true }] : []),
  ];

  // Troškovi i ostali prihodi po kategoriji i mesecu
  const catMatrix = (type: "trosak" | "ostali_prihod"): CashTypeRow[] => {
    const labels = type === "trosak" ? TROSAK_KAT : PRIHOD_KAT;
    const rows = cash.filter(e => e.type === type);
    return [...new Set(rows.map(e => e.category || "ostalo"))].map(k => {
      const rr = rows.filter(e => (e.category || "ostalo") === k);
      const r: CashTypeRow = { id: k, label: labels[k] ?? k, dir: type, total: sum(rr, e => e.amount) };
      for (const ym of months) r[ym] = sum(rr.filter(e => e.date.startsWith(ym)), e => e.amount);
      return r;
    });
  };
  const costCats = useMemo(() => catMatrix("trosak"), [cash, months]);          // eslint-disable-line react-hooks/exhaustive-deps
  const otherIncCats = useMemo(() => catMatrix("ostali_prihod"), [cash, months]); // eslint-disable-line react-hooks/exhaustive-deps

  const cashByDay = useMemo(() => {
    const m = new Map<string, { id: string; date: string; inn: number; out: number; prihod: number; drivers: Set<string> }>();
    for (const e of cash) {
      const r = m.get(e.date) ?? { id: e.date, date: e.date, inn: 0, out: 0, prihod: 0, drivers: new Set<string>() };
      if (e.direction === "in") r.inn += e.amount; else r.out += e.amount;
      if (e.direction === "in" && PRIHOD.has(e.type)) r.prihod += e.amount;
      if (e.driver_id) r.drivers.add(e.driver_id);
      m.set(e.date, r);
    }
    return [...m.values()].map(r => ({ ...r, bal: r.inn - r.out, n: r.drivers.size }));
  }, [cash]);

  const cashByOperator = useMemo(() => {
    const m = new Map<string, { id: string; who: string; n: number; inn: number; out: number }>();
    for (const e of cash) {
      const who = e.received_by?.trim() || "(nije upisano)";
      const r = m.get(who) ?? { id: who, who, n: 0, inn: 0, out: 0 };
      r.n++; if (e.direction === "in") r.inn += e.amount; else r.out += e.amount;
      m.set(who, r);
    }
    return [...m.values()];
  }, [cash]);

  // ═══ VOZAČI ═══
  const [driverSearch, setDriverSearch] = useState("");
  type DrvRow = { id: string; name: string; role: string; type: string; kom: string; renta: number; clan: number; ostalo: number; dug: number; isplata: number; ydBruto: number; cardBruto: number; neo: number; openDebt: number; arr: number; clanDo: string | null; penN: number; unpaid: number };
  const drvRows: DrvRow[] = useMemo(() => {
    const active = new Set<string>([
      ...drivers.filter(d => d.status === "active" && isOperativni(d)).map(d => d.id),
      ...cash.map(e => e.driver_id).filter((x): x is string => !!x),
      ...yandexP.map(r => r.driver_id), ...cardsP.map(r => r.driver_id), ...neoP.map(r => r.driver_id),
      ...openDebtByDriver.keys(),
    ]);
    const q = driverSearch.trim().toLowerCase();
    return [...active].filter(driverOk).map(id => {
      const d = driverById.get(id);
      const c = cash.filter(e => e.driver_id === id);
      const inT = (f: (t: string) => boolean) => sum(c.filter(e => e.direction === "in" && f(e.type)), e => e.amount);
      const clanDo = (raw?.memberships ?? []).filter(m => m.driver_id === id).reduce<string | null>((mx, m) => !mx || m.date_to > mx ? m.date_to : mx, null);
      return {
        id, name: driverName(id), role: d ? (isOperativni(d) ? "Operativni" : "Papirološki") : "—",
        type: d?.driver_type === "renta" ? "Renta" : d ? "Vlastito" : "—", kom: komOf(id),
        renta: inT(t => t === "renta"), clan: inT(t => t === "clanarina"),
        ostalo: inT(t => PRIHOD.has(t) && t !== "renta" && t !== "clanarina"), dug: inT(t => t === "dugovanje"),
        isplata: sum(c.filter(e => e.direction === "out" && ISPLATA_VOZACU.has(e.type)), e => e.amount),
        ydBruto: sum(yandexP.filter(r => r.driver_id === id), r => r.gross_amount),
        cardBruto: sum(cardsP.filter(r => r.driver_id === id), r => r.gross_amount),
        neo: sum(neoP.filter(r => r.driver_id === id), r => r.amount),
        openDebt: openDebtByDriver.get(id) ?? 0, arr: arrears.get(id)?.amount ?? 0, clanDo,
        penN: penaltiesP.filter(p => p.driver_id === id).length,
        unpaid: Math.max(0, unpaid.get(id) ?? 0),
      };
    }).filter(r => !q || r.name.toLowerCase().includes(q) || r.kom.toLowerCase().includes(q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers, cash, yandexP, cardsP, neoP, openDebtByDriver, arrears, penaltiesP, unpaid, raw, driverSearch, driverOk, driverById]);

  // ═══ IZVODI ═══
  const izvodiByMonth = useMemo(() => months.map(ym => {
    const y = yandexP.filter(r => r.date.startsWith(ym));
    const yr = y.filter(r => (r.gross_amount || 0) > 0);
    const c = cardsP.filter(r => r.date.startsWith(ym));
    return {
      id: ym, ym, ydN: yr.length, ydBruto: sum(yr, r => r.gross_amount), yd10: sum(yr, r => r.deduction_amount),
      yd3: sum(y.filter(r => !(r.gross_amount > 0) && (r.net_amount || 0) < 0), r => r.deduction_amount),
      ydNeto: sum(yr, r => r.net_amount), cardBruto: sum(c, r => r.gross_amount), cardProv: sum(c, r => r.deduction_amount),
      cardNeto: sum(c, r => r.net_amount), neo: sum(neoP.filter(r => r.date.startsWith(ym)), r => r.amount),
    };
  }), [months, yandexP, cardsP, neoP]);

  const yandexByDriver = useMemo(() => {
    const m = new Map<string, { id: string; name: string; kom: string; n: number; bruto: number; odbitak: number; neto: number }>();
    for (const r of yandexP.filter(x => (x.gross_amount || 0) > 0)) {
      const row = m.get(r.driver_id) ?? { id: r.driver_id, name: driverName(r.driver_id), kom: komOf(r.driver_id), n: 0, bruto: 0, odbitak: 0, neto: 0 };
      row.n++; row.bruto += r.gross_amount || 0; row.odbitak += r.deduction_amount || 0; row.neto += r.net_amount || 0;
      m.set(r.driver_id, row);
    }
    return [...m.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yandexP]);

  const unpaidRows = useMemo(() => [...unpaid.entries()].filter(([id, n]) => n > 0.01 && driverOk(id)).map(([id, n]) => {
    const ydU = sum((raw?.yandex ?? []).filter(r => r.driver_id === id && !r.paid_out), r => (r.net_amount ?? 0) > 0 ? r.net_amount - (r.paid_amount || 0) : r.net_amount);
    const cU = sum((raw?.cards ?? []).filter(r => r.driver_id === id && !r.paid_out), r => (r.net_amount || 0) - (r.paid_amount || 0));
    const nU = sum((raw?.neo ?? []).filter(r => r.driver_id === id && !r.paid_out), r => (r.amount || 0) - (r.paid_amount || 0));
    return { id, name: driverName(id), kom: komOf(id), yd: ydU, card: cU, neo: nU, total: n };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [unpaid, raw, driverOk]);

  // ═══ ROKOVI ═══
  const [expDays, setExpDays] = useState("30");
  const expiries = useMemo(() => {
    const lim = expDays === "all" ? Infinity : Number(expDays);
    const out: { id: string; kom: string; veh: string; plate: string; what: string; date: string; left: number }[] = [];
    for (const v of vehicles.filter(x => vehicleOk(x.id) && x.status !== "inactive")) {
      const add = (what: string, date: string | null) => {
        if (!date) return;
        const left = dayDiff(today, date);
        if (left <= lim) out.push({ id: `${v.id}-${what}`, kom: v.taxi_license_number || "", veh: vehLabel(v), plate: v.license_plate || "", what, date, left });
      };
      add("Registracija", v.registration_expiry); add("Osiguranje", v.insurance_expiry); add("Taksi legitimacija", v.taxi_license_expiry);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles, expDays, today, vehicleF]);

  // ─── Prikaz ───
  const periodTxt = `Period: ${fmtD(from)} — ${fmtD(to)}${driverF ? ` · Vozač: ${driverName(driverF)}` : ""}${vehicleF !== "all" ? ` · Komunalni: ${vehicleById.get(vehicleF)?.taxi_license_number ?? ""}` : ""}`;
  const stamp = `${from}_${to}`;
  const leftBadge = (left: number) => left < 0
    ? <Badge variant="destructive" className="text-xs">istekao pre {-left} d.</Badge>
    : left <= 15 ? <Badge className="text-xs bg-amber-500 hover:bg-amber-500">za {left} d.</Badge>
    : <Badge variant="outline" className="text-xs">za {left} d.</Badge>;
  const vehicleOptions = [...vehicles].sort((a, b) => (a.taxi_license_number || "").localeCompare(b.taxi_license_number || "", "sr", { numeric: true }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-display font-bold">Izveštaji</h1>
        <p className="text-muted-foreground text-sm">Pregled poslovanja za vlasnika · svaka tabela se može sortirati (klik na kolonu), izvesti u Excel i odštampati</p>
      </div>

      {/* Filteri */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => preset("month")}>Ovaj mesec</Button>
            <Button size="sm" variant="outline" onClick={() => preset("prev")}>Prošli mesec</Button>
            <Button size="sm" variant="outline" onClick={() => preset("30")}>Poslednjih 30 dana</Button>
            <Button size="sm" variant="outline" onClick={() => preset("year")}>Ova godina</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[150px_150px_1fr_220px_auto] items-end">
            <Field label="Od"><Input type="date" value={from} max={to} onChange={e => setFrom(e.target.value)} /></Field>
            <Field label="Do"><Input type="date" value={to} min={from} onChange={e => setTo(e.target.value)} /></Field>
            <Field label="Vozač">
              <div className="flex gap-1">
                <div className="flex-1 min-w-0">
                  <DriverCombobox value={driverF} onChange={setDriverF} placeholder="Svi vozači"
                    options={[...drivers].sort((a, b) => a.full_name.localeCompare(b.full_name)).map(d => ({ value: d.id, label: d.full_name, sublabel: komOf(d.id) || undefined }))} />
                </div>
                {driverF && <Button size="icon" variant="ghost" onClick={() => setDriverF("")} title="Svi vozači"><X className="h-4 w-4" /></Button>}
              </div>
            </Field>
            <Field label="Komunalni broj">
              <Select value={vehicleF} onValueChange={setVehicleF}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-72">
                  <SelectItem value="all">Svi komunalni brojevi</SelectItem>
                  {vehicleOptions.map(v => <SelectItem key={v.id} value={v.id}>{v.taxi_license_number || "?"} — {vehLabel(v)}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Button variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}Osveži
            </Button>
          </div>
        </CardContent>
      </Card>

      {err && <Card><CardContent className="py-4 text-sm text-red-600">Greška pri učitavanju: {err}</CardContent></Card>}
      {!raw && loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : raw && (
        <Tabs defaultValue="sazetak">
          <div className="overflow-x-auto">
            <TabsList>
              <TabsTrigger value="sazetak">Sažetak</TabsTrigger>
              <TabsTrigger value="rente">Rente</TabsTrigger>
              <TabsTrigger value="dugovi">Dugovanja</TabsTrigger>
              <TabsTrigger value="kasa">Kasa</TabsTrigger>
              <TabsTrigger value="vozaci">Vozači</TabsTrigger>
              <TabsTrigger value="izvodi">Izvodi</TabsTrigger>
              <TabsTrigger value="komunalni">Komunalni i rokovi</TabsTrigger>
            </TabsList>
          </div>

          {/* ── SAŽETAK ── */}
          <TabsContent value="sazetak" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">{periodTxt}. Kartice „danas" pokazuju trenutno stanje, nezavisno od perioda.</p>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
              <Kpi title="Prihod firme (kasa)" value={rsd(summary.prihod + summary.ostaliPrihod)} note={`renta ${fmtMoney(summary.renta)} · članarina ${fmtMoney(summary.clan)} · ostalo ${fmtMoney(summary.prihod - summary.renta - summary.clan + summary.ostaliPrihod)}`} tone="good" />
              <Kpi title="Troškovi firme" value={rsd(summary.troskovi)} note="vlasnici KB, plate, servis, registracija..." tone={summary.troskovi > 0 ? "bad" : undefined} />
              <Kpi title="Zarada (prihod − troškovi)" value={rsd(summary.zarada)} tone={summary.zarada >= 0 ? "good" : "bad"} />
              <Kpi title="Naplaćeni dugovi" value={rsd(summary.dugUplate)} note={`novi dugovi u periodu: ${fmtMoney(summary.newDebts)}`} />
              <Kpi title="Isplaćeno vozačima" value={rsd(summary.isplate)} note="Yandex, kartice, Neoplanta, PDV, vaučeri" />
              <Kpi title="Yandex odbitak" value={rsd(summary.yd10 + summary.yd3)} note={`10%: ${fmtMoney(summary.yd10)} · 3%: ${fmtMoney(summary.yd3)}`} />
              <Kpi title="Otvoreni dugovi (danas)" value={rsd(summary.openDebt)} note={`${summary.openDebtN} vozača`} tone={summary.openDebt > 0 ? "bad" : undefined} />
              <Kpi title="Zaostatak rente (danas)" value={rsd(summary.arr)} note={`${summary.arrN} vozača kasni`} tone={summary.arr > 0 ? "warn" : undefined} />
              <Kpi title="Ukupno potraživanje (danas)" value={rsd(summary.openDebt + summary.arr)} note="dugovi + zaostala renta" tone={summary.openDebt + summary.arr > 0 ? "bad" : undefined} />
              <Kpi title="Neisplaćeno vozačima (danas)" value={rsd(summary.unpaid)} note={`${summary.unpaidN} vozača · Yandex, kartice, Neoplanta`} />
            </div>
            <ReportTable title="Po mesecima" subtitle={periodTxt} fileName={`po-mesecima_${stamp}`} rowKey={r => r.ym} rows={byMonth} defaultSort="ym" defaultDesc={false}
              cols={[
                { key: "ym", label: "Mesec", value: r => r.ym, render: r => monthLabel(r.ym) },
                { key: "renta", label: "Renta", value: r => r.renta, money: true, sum: true },
                { key: "clan", label: "Članarina", value: r => r.clan, money: true, sum: true },
                { key: "ost", label: "Ostali prihodi", value: r => r.ostaloPrihod, money: true, sum: true },
                { key: "prihod", label: "Prihod ukupno", value: r => r.prihod, money: true, sum: true },
                { key: "tr", label: "Troškovi firme", value: r => r.troskovi, money: true, sum: true },
                { key: "zar", label: "Zarada", value: r => r.zarada, money: true, sum: true, render: r => <strong className={r.zarada >= 0 ? "text-green-600" : "text-red-600"}>{fmtMoney(r.zarada)}</strong> },
                { key: "dug", label: "Naplaćeni dugovi", value: r => r.dug, money: true, sum: true },
                { key: "nd", label: "Novi dugovi", value: r => r.noviDug, money: true, sum: true },
                { key: "isp", label: "Isplaćeno vozačima", value: r => r.isplate, money: true, sum: true },
                { key: "yd", label: "Yandex bruto", value: r => r.ydBruto, money: true, sum: true },
              ]} />
            <ReportTable title="Najveći dužnici (danas)" subtitle="Otvoreni dugovi + zaostala renta do danas" fileName={`duznici_${today}`} rowKey={r => r.id} rows={debtors} defaultSort="total"
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "phone", label: "Telefon", value: r => r.phone },
                { key: "debt", label: "Otvoren dug", value: r => r.debt, money: true, sum: true },
                { key: "arrDays", label: "Dana rente", value: r => r.arrDays, num: true },
                { key: "arr", label: "Zaostala renta", value: r => r.arr, money: true, sum: true },
                { key: "total", label: "Ukupno duguje", value: r => r.total, money: true, sum: true, render: r => <strong className="text-red-600">{fmtMoney(r.total)}</strong> },
              ]} />
          </TabsContent>

          {/* ── RENTE ── */}
          <TabsContent value="rente" className="mt-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              „Plaćeni dani" i „Renta za te dane" su dani u periodu označeni kao plaćeni u kalendaru. „Naplaćeno u kasi" je novac za rentu primljen u periodu (uključuje i delimične uplate i uplate unapred).
              Zaostatak se računa od dana posle poslednjeg plaćenog do danas, po pravilima Kase (nedelja besplatna osim ako „radi"/plaća nedelju; „nije radio", servis i praznik se ne računaju; pola rente = pola dana).
            </p>
            <ReportTable title="Rente po vozaču" subtitle={periodTxt} fileName={`rente-vozaci_${stamp}`} rowKey={r => r.id} rows={rentRows} defaultSort="arrAmt"
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "veh", label: "Vozilo", value: r => r.veh },
                { key: "rate", label: "Dnevna renta", value: r => r.rate, money: true },
                { key: "days", label: "Plaćeni dani", value: r => r.days, num: true, sum: true },
                { key: "calAmt", label: "Renta za te dane", value: r => r.calAmt, money: true, sum: true },
                { key: "cashAmt", label: "Naplaćeno u kasi", value: r => r.cashAmt, money: true, sum: true },
                { key: "paid", label: "Plaćeno do", value: r => r.paidThrough, render: r => r.paidThrough ? <span>{fmtD(r.paidThrough)}{r.ahead > 0 && <span className="text-green-600 text-xs"> (+{r.ahead} d.)</span>}</span> : "—" },
                { key: "arrDays", label: "Kasni dana", value: r => r.arrDays, num: true, sum: true, render: r => r.arrDays > 0 ? <span className="text-amber-700 font-medium">{r.arrDays.toLocaleString("sr-RS")}</span> : "0" },
                { key: "arrAmt", label: "Zaostatak", value: r => r.arrAmt, money: true, sum: true, render: r => r.arrAmt > 0 ? <strong className="text-red-600">{fmtMoney(r.arrAmt)}</strong> : "0" },
              ]} />
            <ReportTable title="Rente po komunalnom broju" subtitle={`${periodTxt} · iskorišćenost = plaćeni dani / radni dani u periodu (bez nedelja, do danas: ${workDaysInPeriod})`} fileName={`rente-komunalni_${stamp}`} rowKey={r => r.id}
              rows={komRows.filter(r => r.rate > 0 || r.amt > 0 || r.ops)} defaultSort="amt"
              cols={[
                { key: "kom", label: "Komunalni", value: r => r.kom, render: r => <span className="font-mono font-semibold">{r.kom || "—"}</span> },
                { key: "veh", label: "Vozilo", value: r => r.veh },
                { key: "ops", label: "Operativni", value: r => r.ops, render: r => r.ops || <span className="text-amber-600">nema vozača</span> },
                { key: "rate", label: "Renta vozila", value: r => r.rate, money: true },
                { key: "days", label: "Plaćeni dani", value: r => r.days, num: true, sum: true },
                { key: "amt", label: "Renta za te dane", value: r => r.amt, money: true, sum: true },
                { key: "util", label: "Iskorišćenost %", value: r => r.util, num: true, render: r => r.util == null ? "—" : <span className={r.util < 50 ? "text-red-600" : r.util < 80 ? "text-amber-600" : "text-green-600"}>{r.util}%</span> },
                { key: "arr", label: "Zaostatak", value: r => r.arr, money: true, sum: true },
              ]} />
          </TabsContent>

          {/* ── DUGOVANJA ── */}
          <TabsContent value="dugovi" className="mt-4 space-y-4">
            <Card>
              <CardContent className="p-4 flex flex-wrap items-end gap-4">
                <Field label="Vrsta">
                  <Select value={debtType} onValueChange={setDebtType}>
                    <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Sve vrste</SelectItem>
                      {Object.entries(DEBT_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Status">
                  <Select value={debtStatus} onValueChange={setDebtStatus}>
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Otvoreni</SelectItem>
                      <SelectItem value="closed">Zatvoreni</SelectItem>
                      <SelectItem value="all">Svi</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <label className="flex items-center gap-2 text-sm pb-2 cursor-pointer">
                  <Checkbox checked={debtInPeriod} onCheckedChange={v => setDebtInPeriod(v === true)} />
                  Samo dugovi nastali u izabranom periodu
                </label>
              </CardContent>
            </Card>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {aging.map(a => <Kpi key={a.label} title={`Ostatak duga — ${a.label.toLowerCase()}`} value={rsd(a.v)} tone={a.v > 0 && a.label.startsWith("Preko") ? "bad" : undefined} />)}
            </div>
            <ReportTable title="Dugovanja po vrsti" fileName={`dugovi-vrste_${today}`} rowKey={r => r.id} rows={debtByType} defaultSort="rest"
              cols={[
                { key: "label", label: "Vrsta", value: r => r.label },
                { key: "n", label: "Broj", value: r => r.n, num: true, sum: true },
                { key: "total", label: "Iznos", value: r => r.total, money: true, sum: true },
                { key: "paid", label: "Plaćeno", value: r => r.paid, money: true, sum: true },
                { key: "rest", label: "Ostatak", value: r => r.rest, money: true, sum: true },
              ]} />
            <ReportTable title="Dugovanja po vozaču" subtitle="Klik na red filtrira sve izveštaje na tog vozača" fileName={`dugovi-vozaci_${today}`} rowKey={r => r.id} rows={debtByDriver} defaultSort="rest"
              onRowClick={r => setDriverF(r.id)}
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "n", label: "Broj dugova", value: r => r.n, num: true, sum: true },
                { key: "total", label: "Iznos", value: r => r.total, money: true, sum: true },
                { key: "paid", label: "Plaćeno", value: r => r.paid, money: true, sum: true },
                { key: "rest", label: "Ostatak", value: r => r.rest, money: true, sum: true, render: r => r.rest > 0 ? <strong className="text-red-600">{fmtMoney(r.rest)}</strong> : "0" },
                { key: "oldest", label: "Najstariji", value: r => r.oldest, render: r => fmtD(r.oldest) },
                { key: "age", label: "Starost (dana)", value: r => r.age, num: true },
              ]} />
            <ReportTable title="Pojedinačni dugovi" fileName={`dugovi-lista_${today}`} rowKey={r => r.id} rows={debtRows} defaultSort="date"
              cols={[
                { key: "date", label: "Datum", value: r => r.date, render: r => fmtD(r.date) },
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "type", label: "Vrsta", value: r => DEBT_LABELS[r.type] ?? r.type },
                { key: "desc", label: "Opis", value: r => r.description, render: r => <span className="block max-w-[260px] truncate" title={r.description}>{r.description || "—"}</span> },
                { key: "amount", label: "Iznos", value: r => r.amount, money: true, sum: true },
                { key: "paid", label: "Plaćeno", value: r => r.paid_amount, money: true, sum: true },
                { key: "rest", label: "Ostatak", value: r => r.rest, money: true, sum: true },
                { key: "age", label: "Dana", value: r => r.age, num: true },
              ]} />
            <ReportTable title="Doprinosi po mesecima" subtitle="Mesec na koji se doprinos odnosi" fileName={`doprinosi_${today}`} rowKey={r => r.id} rows={doprinosi} defaultSort="ym"
              cols={[
                { key: "ym", label: "Mesec", value: r => r.ym, render: r => monthLabel(r.ym) },
                { key: "n", label: "Vozača", value: r => r.n, num: true, sum: true },
                { key: "total", label: "Iznos", value: r => r.total, money: true, sum: true },
                { key: "paid", label: "Plaćeno", value: r => r.paid, money: true, sum: true },
                { key: "rest", label: "Ostatak", value: r => r.rest, money: true, sum: true },
              ]} />
          </TabsContent>

          {/* ── KASA ── */}
          <TabsContent value="kasa" className="mt-4 space-y-4">
            <ReportTable title="Ulaz u kasu po vrsti" subtitle={periodTxt} fileName={`kasa-ulaz_${stamp}`} rowKey={r => r.id} rows={cashIn} defaultSort="total" cols={matrixCols} />
            <ReportTable title="Izlaz iz kase po vrsti" subtitle={periodTxt} fileName={`kasa-izlaz_${stamp}`} rowKey={r => r.id} rows={cashOut} defaultSort="total" cols={matrixCols} />
            <ReportTable title="Troškovi firme po vrsti" subtitle={periodTxt} fileName={`troskovi_${stamp}`} rowKey={r => r.id} rows={costCats} defaultSort="total" cols={matrixCols}
              empty="Nema troškova u periodu (unose se u Kasi: Trošak / prihod)" />
            {otherIncCats.length > 0 && <ReportTable title="Ostali prihodi po vrsti" subtitle={periodTxt} fileName={`ostali-prihodi_${stamp}`} rowKey={r => r.id} rows={otherIncCats} defaultSort="total" cols={matrixCols} />}
            <ReportTable title="Kasa po danima" subtitle={periodTxt} fileName={`kasa-dani_${stamp}`} rowKey={r => r.id} rows={cashByDay} defaultSort="date"
              cols={[
                { key: "date", label: "Datum", value: r => r.date, render: r => fmtD(r.date) },
                { key: "n", label: "Vozača", value: r => r.n, num: true },
                { key: "prihod", label: "Prihod firme", value: r => r.prihod, money: true, sum: true },
                { key: "inn", label: "Ulaz", value: r => r.inn, money: true, sum: true },
                { key: "out", label: "Izlaz", value: r => r.out, money: true, sum: true },
                { key: "bal", label: "Bilans", value: r => r.bal, money: true, sum: true, render: r => <span className={r.bal >= 0 ? "text-green-600" : "text-red-600"}>{fmtMoney(r.bal)}</span> },
              ]} />
            <ReportTable title="Kasa po operateru (ko je primio)" subtitle={periodTxt} fileName={`kasa-operateri_${stamp}`} rowKey={r => r.id} rows={cashByOperator} defaultSort="inn"
              cols={[
                { key: "who", label: "Operater", value: r => r.who },
                { key: "n", label: "Stavki", value: r => r.n, num: true, sum: true },
                { key: "inn", label: "Ulaz", value: r => r.inn, money: true, sum: true },
                { key: "out", label: "Izlaz", value: r => r.out, money: true, sum: true },
              ]} />
          </TabsContent>

          {/* ── VOZAČI ── */}
          <TabsContent value="vozaci" className="mt-4 space-y-4">
            <ReportTable title="Vozači — sve na jednom mestu" subtitle={`${periodTxt} · iznosi iz kase i izvoda u periodu; dug, zaostatak i neisplaćeno su stanje danas`}
              fileName={`vozaci_${stamp}`} rowKey={r => r.id} rows={drvRows} defaultSort="renta" maxHeight={640}
              actions={<Input value={driverSearch} onChange={e => setDriverSearch(e.target.value)} placeholder="Pretraga: ime ili komunalni" className="h-8 w-56" />}
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "role", label: "Uloga", value: r => r.role },
                { key: "type", label: "Tip", value: r => r.type },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "renta", label: "Renta", value: r => r.renta, money: true, sum: true },
                { key: "clan", label: "Članarina", value: r => r.clan, money: true, sum: true },
                { key: "ostalo", label: "Ostale naknade", value: r => r.ostalo, money: true, sum: true },
                { key: "dug", label: "Uplate dugova", value: r => r.dug, money: true, sum: true },
                { key: "isplata", label: "Isplaćeno vozaču", value: r => r.isplata, money: true, sum: true },
                { key: "yd", label: "Yandex bruto", value: r => r.ydBruto, money: true, sum: true },
                { key: "card", label: "Kartice bruto", value: r => r.cardBruto, money: true, sum: true },
                { key: "neo", label: "Neoplanta", value: r => r.neo, money: true, sum: true },
                { key: "pen", label: "Kazne", value: r => r.penN, num: true, sum: true },
                { key: "clanDo", label: "Članarina do", value: r => r.clanDo, render: r => r.clanDo ? fmtD(r.clanDo) : "—" },
                { key: "openDebt", label: "Otvoren dug", value: r => r.openDebt, money: true, sum: true },
                { key: "arr", label: "Zaostala renta", value: r => r.arr, money: true, sum: true },
                { key: "unpaid", label: "Za isplatu vozaču", value: r => r.unpaid, money: true, sum: true },
              ]} />
          </TabsContent>

          {/* ── IZVODI ── */}
          <TabsContent value="izvodi" className="mt-4 space-y-4">
            <ReportTable title="Izvodi po mesecima" subtitle={periodTxt} fileName={`izvodi_${stamp}`} rowKey={r => r.id} rows={izvodiByMonth} defaultSort="ym" defaultDesc={false}
              cols={[
                { key: "ym", label: "Mesec", value: r => r.ym, render: r => monthLabel(r.ym) },
                { key: "ydN", label: "Yandex izvoda", value: r => r.ydN, num: true, sum: true },
                { key: "ydBruto", label: "Yandex bruto", value: r => r.ydBruto, money: true, sum: true },
                { key: "yd10", label: "Odbitak 10%", value: r => r.yd10, money: true, sum: true },
                { key: "yd3", label: "Odbitak 3%", value: r => r.yd3, money: true, sum: true },
                { key: "ydNeto", label: "Yandex neto", value: r => r.ydNeto, money: true, sum: true },
                { key: "cardBruto", label: "Kartice bruto", value: r => r.cardBruto, money: true, sum: true },
                { key: "cardProv", label: "Provizija", value: r => r.cardProv, money: true, sum: true },
                { key: "cardNeto", label: "Kartice neto", value: r => r.cardNeto, money: true, sum: true },
                { key: "neo", label: "Neoplanta", value: r => r.neo, money: true, sum: true },
              ]} />
            <ReportTable title="Yandex po vozaču" subtitle={periodTxt} fileName={`yandex-vozaci_${stamp}`} rowKey={r => r.id} rows={yandexByDriver} defaultSort="bruto"
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "n", label: "Izvoda", value: r => r.n, num: true, sum: true },
                { key: "bruto", label: "Bruto", value: r => r.bruto, money: true, sum: true },
                { key: "odbitak", label: "Odbitak", value: r => r.odbitak, money: true, sum: true },
                { key: "neto", label: "Neto", value: r => r.neto, money: true, sum: true },
              ]} />
            <ReportTable title="Neisplaćeno vozačima (danas)" subtitle="Iznosi sa izvoda koji još nisu skinuti kroz Kasu" fileName={`neisplaceno_${today}`} rowKey={r => r.id} rows={unpaidRows} defaultSort="total"
              cols={[
                { key: "name", label: "Vozač", value: r => r.name },
                { key: "kom", label: "Komunalni", value: r => r.kom },
                { key: "yd", label: "Yandex", value: r => r.yd, money: true, sum: true },
                { key: "card", label: "Kartice", value: r => r.card, money: true, sum: true },
                { key: "neo", label: "Neoplanta", value: r => r.neo, money: true, sum: true },
                { key: "total", label: "Ukupno", value: r => r.total, money: true, sum: true },
              ]} />
          </TabsContent>

          {/* ── KOMUNALNI I ROKOVI ── */}
          <TabsContent value="komunalni" className="mt-4 space-y-4">
            <ReportTable title="Rokovi vozila" subtitle="Registracija, osiguranje i taksi legitimacija koji ističu ili su istekli"
              fileName={`rokovi_${today}`} rowKey={r => r.id} rows={expiries} defaultSort="left" defaultDesc={false}
              actions={
                <Select value={expDays} onValueChange={setExpDays}>
                  <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">Narednih 30 dana</SelectItem>
                    <SelectItem value="60">Narednih 60 dana</SelectItem>
                    <SelectItem value="90">Narednih 90 dana</SelectItem>
                    <SelectItem value="all">Svi datumi</SelectItem>
                  </SelectContent>
                </Select>
              }
              cols={[
                { key: "kom", label: "Komunalni", value: r => r.kom, render: r => <span className="font-mono font-semibold">{r.kom || "—"}</span> },
                { key: "veh", label: "Vozilo", value: r => r.veh },
                { key: "plate", label: "Tablice", value: r => r.plate },
                { key: "what", label: "Šta", value: r => r.what },
                { key: "date", label: "Datum", value: r => r.date, render: r => fmtD(r.date) },
                { key: "left", label: "Preostalo", value: r => r.left, num: true, render: r => leftBadge(r.left) },
              ]} />
            <ReportTable title="Komunalni brojevi — pregled" subtitle={periodTxt} fileName={`komunalni_${stamp}`} rowKey={r => r.id} rows={komRows} defaultSort="kom" defaultDesc={false} maxHeight={640}
              cols={[
                { key: "kom", label: "Komunalni", value: r => r.kom, render: r => <span className="font-mono font-semibold">{r.kom || "—"}</span> },
                { key: "veh", label: "Vozilo", value: r => r.veh },
                { key: "plate", label: "Tablice", value: r => r.plate },
                { key: "ops", label: "Operativni", value: r => r.ops, render: r => r.ops || <span className="text-amber-600">nema</span> },
                { key: "papN", label: "Papirološki", value: r => r.papN, num: true, sum: true },
                { key: "amt", label: "Renta (period)", value: r => r.amt, money: true, sum: true },
                { key: "owner", label: "Vlasnik", value: r => r.owner },
                { key: "ownerPaid", label: "Plaćeno vlasniku", value: r => r.ownerPaid, money: true, sum: true },
                { key: "costs", label: "Troškovi vozila", value: r => r.costs, money: true, sum: true },
                { key: "neto", label: "Neto (renta − vlasnik − troškovi)", value: r => r.neto, money: true, sum: true, render: r => <span className={r.neto >= 0 ? "text-green-600" : "text-red-600"}>{fmtMoney(r.neto)}</span> },
                { key: "arr", label: "Zaostatak", value: r => r.arr, money: true, sum: true },
                { key: "penN", label: "Kazne", value: r => r.penN, num: true, sum: true },
                { key: "penAmt", label: "Kazne iznos", value: r => r.penAmt, money: true, sum: true },
                { key: "reg", label: "Registracija", value: r => r.reg, render: r => r.reg ? fmtD(r.reg) : "—" },
                { key: "ins", label: "Osiguranje", value: r => r.ins, render: r => r.ins ? fmtD(r.ins) : "—" },
                { key: "lic", label: "Legitimacija", value: r => r.lic, render: r => r.lic ? fmtD(r.lic) : "—" },
              ]} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
