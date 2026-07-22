import { useApp } from "@/context/AppContext";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useCash } from "@/hooks/useCash";
import { useObracun } from "@/hooks/useObracun";
import { useCalendar } from "@/hooks/useCalendar";
import { useMembership } from "@/hooks/useMembership";
import { useFuelPdv } from "@/hooks/useFuelPdv";
import { useObracuni } from "@/hooks/useObracuni";
import { ClanarinaKalendar } from "@/components/ClanarinaKalendar";
import { useDebts } from "@/hooks/useDebts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, Loader2, RotateCcw, Check, Wrench, PartyPopper, X, Sun } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/StatCard";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${DAYS_SR[dt.getDay()]}, ${dt.getDate()}. ${MONTHS_SR[dt.getMonth()]}`;
}
function isObracunDay(date: string) {
  const dow = new Date(date + "T00:00:00").getDay();
  return dow === 1 || dow === 3 || dow === 5;
}
function getDatesInRange(from: string, to: string): string[] {
  const dates: string[] = [];
  const start = new Date(from + "T00:00:00");
  const end   = new Date(to   + "T00:00:00");
  if (start > end) return [];
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1))
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  return dates;
}
function getDow(y:number,m:number,d:number){return new Date(y,m-1,d).getDay();}
function getDateStr(y:number,m:number,d:number){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getDaysInMonth(y:number,m:number){return new Date(y,m,0).getDate();}
// Broj sedmica u periodu (svaka pon kao start sedmice)
function countWeeks(from: string, to: string): number {
  const dates = getDatesInRange(from, to);
  return dates.filter(d => new Date(d+"T00:00:00").getDay() === 1).length;
}

const CASH_TYPE_LABELS: Record<string,string> = {
  renta:"Renta",clanarina:"Članarina",pos_naknada:"POS naknada",
  komunalni:"Komunalni",doprinosi:"Doprinosi",dugovanje:"Uplata dugovanja",
  likvidnost_in:"Likvidnost — ulaz",yandex:"Yandex isplata",
  kartica:"Kartica isplata",vaučer:"Vaučer",pdv_gorivo:"PDV gorivo",
  likvidnost_out:"Podizanje gotovine",
};
const CASH_TYPE_COLORS: Record<string,string> = {
  renta:"text-green-700",clanarina:"text-green-700",pos_naknada:"text-green-700",
  komunalni:"text-green-700",doprinosi:"text-green-700",dugovanje:"text-blue-700",
  likvidnost_in:"text-purple-700",yandex:"text-orange-700",kartica:"text-orange-700",
  vaučer:"text-red-700",pdv_gorivo:"text-red-700",likvidnost_out:"text-red-700",
};

// ─── MINI KALENDAR ───────────────────────────────────────────
function KalendarPregled({ driverId, cal, year, month }: { driverId: string; cal: any; year: number; month: number }) {
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({length: daysInMonth}, (_,i) => i+1);
  function isSundayFreeLocal(sundayDate: string): boolean {
    const sun = new Date(sundayDate + "T00:00:00");
    if (isNaN(sun.getTime())) return false;
    for (let i = 1; i <= 6; i++) {
      const d = new Date(sun); d.setDate(sun.getDate() - i);
      const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
      const entry = cal.entries?.find((e:any) => e.driver_id === driverId && e.date === ds);
      if (!entry || entry.status === "nije_radio") return false;
    }
    return true;
  }
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["Ned","Pon","Uto","Sri","Čet","Pet","Sub"].map(d => (
          <div key={d} className="text-xs text-muted-foreground font-medium py-0.5">{d}</div>
        ))}
        {Array.from({length: getDow(year, month, 1)}, (_,i) => <div key={`e${i}`}/>)}
        {days.map(day => {
          const dow = getDow(year, month, day);
          const dateStr = getDateStr(year, month, day);
          const status = cal.getStatus(driverId, dateStr);
          const isSun = dow === 0;
          const sunFree = isSun ? isSundayFreeLocal(dateStr) : false;
          return (
            <div key={day} className={`rounded text-xs py-1 font-medium ${
              isSun && sunFree  ? "bg-green-100 text-green-700" :
              isSun && !sunFree ? "bg-amber-50 text-amber-500" :
              status === "izmireno"   ? "bg-green-100 text-green-700" :
              status === "neizmireno" ? "bg-red-100 text-red-600" :
              status === "nije_radio" ? "bg-gray-100 text-gray-400" :
              "text-gray-300"
            }`}>{day}</div>
          );
        })}
      </div>
      <div className="flex gap-2 text-xs flex-wrap">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-green-100 inline-block"/>Izmireno</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-red-100 inline-block"/>Neizmireno</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-50 border border-amber-200 inline-block"/>Ned. naplaćuje</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-gray-100 inline-block"/>Nije radio</span>
      </div>
    </div>
  );
}

// ─── CHECKBOX RED ─────────────────────────────────────────────
function CheckRow({ label, sublabel, amount, enabled, onToggle, children }: {
  label: string; sublabel?: string; amount?: number;
  enabled: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${enabled ? "border-green-300 bg-green-50/30" : "border-gray-200"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={onToggle}>
          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${enabled ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
            {enabled && <Check className="h-3 w-3 text-white"/>}
          </div>
          <div>
            <span className="text-sm font-medium">{label}</span>
            {sublabel && <p className="text-xs text-muted-foreground">{sublabel}</p>}
          </div>
        </div>
        {enabled && amount !== undefined && <span className="text-sm font-bold text-green-600">{fmt(amount)}</span>}
      </div>
      {enabled && children}
    </div>
  );
}

// ─── OBRACUN VOZACA DIALOG ────────────────────────────────────
function ObracunVozacDialog({ onAdd, currentUser, obracunDate }: {
  onAdd: (e: any) => Promise<void>; currentUser: string; obracunDate: string;
}) {
  const { drivers, vehicles } = useApp();
  const { yandexReports, cardReports, markYandexPaid: yandexPaidOut, markCardPaid: cardPaidOut } = useApp();
  const today = new Date().toISOString().split("T")[0];
  const curMonthStr = today.slice(0,7);

  const [open, setOpen]         = useState(false);
  const [driverId, setDriverId] = useState("none");
  const [saving, setSaving]     = useState(false);
  const [calYear, setCalYear]   = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth()+1);

  // RENTA
  const [rentaEnabled, setRentaEnabled] = useState(false);
  const [rentaFrom, setRentaFrom]       = useState(today);
  const [rentaTo, setRentaTo]           = useState(today);

  // ČLANARINA
  const [clanEnabled, setClanEnabled]   = useState(false);
  const [clanFrom, setClanFrom]         = useState(today);
  const [clanTo, setClanTo]             = useState(today);
  const [clanAmt, setClanAmt]           = useState("");

  // POS
  const [posEnabled, setPosEnabled]     = useState(false);
  const [posAmt, setPosAmt]             = useState("");

  // PDV GORIVA
  const [pdvEnabled, setPdvEnabled]     = useState(false);
  const [pdvAmt, setPdvAmt]             = useState("");

  // DUGOVANJA (izbor + delimični iznos)
  const [selectedDebts, setSelectedDebts] = useState<Set<string>>(new Set());
  const [debtAmounts, setDebtAmounts]     = useState<Record<string,string>>({});

  // YANDEX + KARTICE — parcijalni iznosi
  const [selectedYandex, setSelectedYandex] = useState<Set<string>>(new Set());
  const [yandexAmounts, setYandexAmounts]   = useState<Record<string,string>>({});
  const [selectedCards, setSelectedCards]   = useState<Set<string>>(new Set());
  const [cardAmounts, setCardAmounts]       = useState<Record<string,string>>({});
  // VAUČERI - dva tipa: nasi (fiksno 400) i MB (varijabilno)
  const [vaucerEnabled, setVaucerEnabled]       = useState(false);
  const [vaucerCount, setVaucerCount]           = useState("");
  const [vaucerAmt, setVaucerAmt]               = useState("400");
  const [vaucerMbEnabled, setVaucerMbEnabled]   = useState(false);
  const [vaucerMbCount, setVaucerMbCount]       = useState("");
  const [vaucerMbAmt, setVaucerMbAmt]           = useState("200");

  const driver = drivers.find(d => d.id === driverId);
  const cal    = useCalendar(calYear, calMonth);
  const membership = useMembership(driverId);
  const fuelPdv = useFuelPdv(driverId, curMonthStr);
  const { debts } = useDebts();
  const { saveObracun } = useObracuni();

  // Posljednji izmireni dan
  const [lastPaidDate, setLastPaidDate] = useState<string|null>(null);
  const [lastClanDate, setLastClanDate] = useState<string|null>(null);
  useEffect(() => {
    if (driverId === "none") { setLastPaidDate(null); setLastClanDate(null); return; }
    supabase.from("calendar_entries").select("date").eq("driver_id", driverId).eq("status","izmireno")
      .order("date", { ascending: false }).limit(1)
      .then(({ data }) => setLastPaidDate(data?.[0]?.date ?? null));
    supabase.from("membership_entries").select("date_to").eq("driver_id", driverId)
      .order("date_to", { ascending: false }).limit(1)
      .then(({ data }) => setLastClanDate(data?.[0]?.date_to ?? null));
  }, [driverId]);

  // Auto-popuni POS i clan iznos
  useEffect(() => {
    if (!driver) return;
    if (!posAmt) setPosAmt(String(driver.pos_monthly_fee));
    const amt = driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own;
    if (!clanAmt) setClanAmt(String(amt));
  }, [driver]);

  // Izračuni prihoda (bez rente i clanarine jer ih automatski popunjavamo)
  const posTotal   = posEnabled ? (Number(posAmt) || 0) : 0;
  const pdvMax     = Math.min(Number(pdvAmt) || 0, fuelPdv.remaining);
  const pdvTotal   = pdvEnabled ? pdvMax : 0;
  const openDebts  = debts.filter(d => d.driver_id === driverId && d.status !== "closed");
  const totalOpenDebt = openDebts.reduce((s,d) => s + (d.amount - d.paid_amount), 0);
  const selectedDebtsList = openDebts.filter(d => selectedDebts.has(d.id));
  const debtTotal  = selectedDebtsList.reduce((s,d) => {
    const remaining = d.amount - d.paid_amount;
    const custom = Number(debtAmounts[d.id]);
    return s + (custom > 0 && custom <= remaining ? custom : remaining);
  }, 0);
  const driverYandex = yandexReports.filter(r => r.driver_id === driverId && !r.paid_out);
  const yandexSelected = driverYandex.filter(r => selectedYandex.has(r.id));
  const yandexNet  = yandexSelected.reduce((s,r) => s + (Number(yandexAmounts[r.id]) || r.net_amount), 0);
  const driverCards = cardReports.filter(r => r.driver_id === driverId && !r.paid_out);
  const cardSelected = driverCards.filter(r => selectedCards.has(r.id));
  const cardNet    = cardSelected.reduce((s,r) => s + (Number(cardAmounts[r.id]) || r.net_amount), 0);
  const vaucerTotal   = vaucerEnabled   ? (Number(vaucerCount)   || 0) * (Number(vaucerAmt)   || 0) : 0;
  const vaucerMbTotal = vaucerMbEnabled ? (Number(vaucerMbCount) || 0) * (Number(vaucerMbAmt) || 0) : 0;

  // AUTO LOGIKA — izračunaj rente i clanarine iz prihoda
  const totalPrihodi = yandexNet + cardNet + pdvTotal + vaucerTotal + vaucerMbTotal;
  const weeklyAmt = driver ? (driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own) : 0;

  // Automatski postavi period rente i clanarine kad se promijene prihodi
  useEffect(() => {
    if (!driver || !lastPaidDate || totalPrihodi === 0) return;

    // Oduzmi dugovanja i POS
    let budzet = totalPrihodi - debtTotal - posTotal;
    if (budzet <= 0) return;

    // Koliko cijelih dana rente može pokriti
    const maxDana = Math.floor(budzet / driver.daily_rate);
    if (maxDana === 0) return;

    // Postavi period od dana poslije posljednje uplate
    const startDate = new Date(lastPaidDate + "T00:00:00");
    startDate.setDate(startDate.getDate() + 1);
    // Preskoci nedjelje
    let workDayCount = 0;
    const endDate = new Date(startDate);
    while (workDayCount < maxDana) {
      if (endDate.getDay() !== 0) workDayCount++;
      if (workDayCount < maxDana) endDate.setDate(endDate.getDate() + 1);
    }

    const fromStr = `${startDate.getFullYear()}-${String(startDate.getMonth()+1).padStart(2,"0")}-${String(startDate.getDate()).padStart(2,"0")}`;
    const toStr   = `${endDate.getFullYear()}-${String(endDate.getMonth()+1).padStart(2,"0")}-${String(endDate.getDate()).padStart(2,"0")}`;

    setRentaFrom(fromStr);
    setRentaTo(toStr);
    setRentaEnabled(true);

    // Ostatak za clanarine
    const rentaCost = maxDana * driver.daily_rate;
    const ostatak = budzet - rentaCost;
    const maxSedmica = weeklyAmt > 0 ? Math.floor(ostatak / weeklyAmt) : 0;

    if (maxSedmica >= 1) {
      // Postavi period clanarine od dana poslije posljednje clanarine ili od startDate
      const clanStart = lastClanDate
        ? new Date(lastClanDate + "T00:00:00")
        : new Date(startDate);
      if (lastClanDate) clanStart.setDate(clanStart.getDate() + 1);
      // Nađi naredni ponedjeljak
      while (clanStart.getDay() !== 1) clanStart.setDate(clanStart.getDate() + 1);
      const clanEnd = new Date(clanStart);
      clanEnd.setDate(clanStart.getDate() + (maxSedmica * 7) - 1);

      const cfrom = `${clanStart.getFullYear()}-${String(clanStart.getMonth()+1).padStart(2,"0")}-${String(clanStart.getDate()).padStart(2,"0")}`;
      const cto   = `${clanEnd.getFullYear()}-${String(clanEnd.getMonth()+1).padStart(2,"0")}-${String(clanEnd.getDate()).padStart(2,"0")}`;
      setClanFrom(cfrom);
      setClanTo(cto);
      setClanEnabled(true);
    } else {
      setClanEnabled(false);
    }
  }, [totalPrihodi, lastPaidDate, lastClanDate, driver?.id]);

  // Izračuni za rente i clanarine (ručno ili auto)
  const rentaDates  = driver && rentaEnabled && rentaFrom && rentaTo ? getDatesInRange(rentaFrom, rentaTo) : [];
  const workDays    = rentaDates.filter(d => {
    const dow = new Date(d+"T00:00:00").getDay();
    if (dow === 0) return false;                    // nedelja
    if (cal.getOffStatus(driverId, d)) return false; // off-day
    return true;
  }).length;
  const rentaTotal  = driver ? workDays * driver.daily_rate : 0;
  const clanWeeks  = clanEnabled && clanFrom && clanTo ? countWeeks(clanFrom, clanTo) : 0;
  const clanTotal  = clanEnabled ? clanWeeks * (Number(clanAmt) || 0) : 0;

  // Bonus nedjelja
  const lastDateObj = rentaTo ? new Date(rentaTo+"T00:00:00") : null;
  const lastDow = lastDateObj?.getDay() ?? -1;
  const daysToSun = lastDow > 0 ? 7 - lastDow : 0;
  const bonusSunday = daysToSun > 0 && workDays >= 6 ? (() => {
    const sun = new Date(lastDateObj!); sun.setDate(sun.getDate()+daysToSun);
    return `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,"0")}-${String(sun.getDate()).padStart(2,"0")}`;
  })() : null;

  // SALDO
  const totalDuguje  = rentaTotal + clanTotal + posTotal + debtTotal;
  const saldo        = totalPrihodi - totalDuguje;

  // Koliko dana rente/sedmica clanarine pokriva pozitivni saldo
  const saldioDana    = driver && saldo > 0 ? Math.floor(saldo / driver.daily_rate) : 0;
  const saldioSedmica = driver && saldo > 0 && weeklyAmt > 0 ? Math.floor(saldo / weeklyAmt) : 0;

  const reset = () => {
    setDriverId("none"); setRentaEnabled(true); setRentaFrom(today); setRentaTo(today);
    setClanEnabled(false); setClanFrom(today); setClanTo(today); setClanAmt("");
    setPosEnabled(false); setPosAmt(""); setPdvEnabled(false); setPdvAmt("");
    setSelectedDebts(new Set()); setDebtAmounts({});
    setSelectedYandex(new Set()); setYandexAmounts({});
    setSelectedCards(new Set()); setCardAmounts({});
    setVaucerEnabled(false); setVaucerCount(""); setVaucerAmt("400");
    setVaucerMbEnabled(false); setVaucerMbCount(""); setVaucerMbAmt("200");
  };

  const handleSave = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      const saveDate = obracunDate || today;
      const stavke: any[] = [];

      // 1. Renta
      if (rentaEnabled && workDays > 0) {
        await onAdd({ type:"renta", direction:"in", driver_id:driverId, amount:rentaTotal, date:saveDate,
          description:`Renta ${rentaFrom} — ${rentaTo} (${workDays} dana)`, received_by:currentUser, notes:"" });
        for (const d of rentaDates) {
          if (new Date(d+"T00:00:00").getDay() === 0) continue;
          await cal.saveAmount(driverId, d, "renta", driver.daily_rate, currentUser);
          await cal.saveStatus(driverId, d, "izmireno", currentUser);
        }
        if (bonusSunday) await cal.saveStatus(driverId, bonusSunday, "izmireno", currentUser);
      }

      // 2. Članarina
      if (clanEnabled && clanTotal > 0) {
        await onAdd({ type:"clanarina", direction:"in", driver_id:driverId, amount:clanTotal, date:saveDate,
          description:`Članarina ${clanFrom} — ${clanTo} (${clanWeeks} sed.)`, received_by:currentUser, notes:"" });
        await membership.addEntry({ driver_id:driverId, date_from:clanFrom, date_to:clanTo, amount:clanTotal, evidenced_by:currentUser });
      }

      // 3. POS
      if (posEnabled && posTotal > 0)
        await onAdd({ type:"pos_naknada", direction:"in", driver_id:driverId, amount:posTotal, date:saveDate,
          description:"POS naknada", received_by:currentUser, notes:"" });

      // 4. PDV goriva — izlaz (isplata vozaču)
      if (pdvEnabled && pdvTotal > 0) {
        await onAdd({ type:"pdv_gorivo", direction:"out", driver_id:driverId, amount:pdvTotal, date:saveDate,
          description:`PDV goriva (limit ${fmt(fuelPdv.PDV_MONTHLY_LIMIT)}/mj)`, received_by:currentUser, notes:"" });
        await supabase.from("fuel_pdv_entries").insert({ driver_id:driverId, date:saveDate, amount:pdvTotal, evidenced_by:currentUser });
      }

      // 5. Dugovanja — uplata (delimično ili u celosti)
      for (const debt of selectedDebtsList) {
        const remaining = debt.amount - debt.paid_amount;
        const custom = Number(debtAmounts[debt.id]);
        const amt = custom > 0 && custom <= remaining ? custom : remaining;
        await onAdd({ type:"dugovanje", direction:"in", driver_id:driverId, amount:amt, date:saveDate,
          description:`Uplata dugovanja: ${debt.description}${amt < remaining ? " (delimično)" : ""}`,
          received_by:currentUser, notes:"" });
        const newPaid = debt.paid_amount + amt;
        const newStatus = newPaid >= debt.amount ? "closed" : "partial";
        await supabase.from("driver_debts").update({
          paid_amount: newPaid, status: newStatus
        }).eq("id", debt.id);
        // Evidencija u debt_payments (za istoriju)
        await supabase.from("debt_payments").insert({
          debt_id: debt.id, driver_id: driverId,
          amount: amt, date: saveDate, received_by: currentUser, notes: "Uplata kroz kasu",
        });
      }

      // 6. Vaučeri (naši)
      if (vaucerEnabled && vaucerTotal > 0) {
        const stavka = { type:"vaučer", direction:"out", driver_id:driverId, amount:vaucerTotal, date:saveDate,
          description:`Vaučeri (naši): ${vaucerCount} × ${fmt(Number(vaucerAmt))}`, received_by:currentUser, notes:"" };
        await onAdd({...stavka});
        stavke.push({ type:stavka.type, direction:stavka.direction, amount:stavka.amount, description:stavka.description });
      }
      // 6b. MB Vaučeri
      if (vaucerMbEnabled && vaucerMbTotal > 0) {
        const stavka = { type:"vaučer_mb", direction:"out", driver_id:driverId, amount:vaucerMbTotal, date:saveDate,
          description:`Vaučeri (MB): ${vaucerMbCount} × ${fmt(Number(vaucerMbAmt))}`, received_by:currentUser, notes:"" };
        await onAdd({...stavka});
        stavke.push({ type:stavka.type, direction:stavka.direction, amount:stavka.amount, description:stavka.description });
      }

      // 7. Yandex
      for (const r of yandexSelected) {
        const amt = Number(yandexAmounts[r.id]) || r.net_amount;
        await onAdd({ type:"yandex", direction:"out", driver_id:driverId, amount:amt, date:saveDate,
          description:`Yandex ${r.period_from} — ${r.period_to}`, received_by:currentUser, notes:"" });
        await yandexPaidOut(r.id, currentUser);
        stavke.push({ type:"yandex", direction:"out", amount:amt, description:`Yandex ${r.period_from} — ${r.period_to}` });
      }

      // 8. Kartice
      for (const r of cardSelected) {
        const amt = Number(cardAmounts[r.id]) || r.net_amount;
        await onAdd({ type:"kartica", direction:"out", driver_id:driverId, amount:amt, date:saveDate,
          description:`Kartica ${r.card_type.toUpperCase()} ${r.date}`, received_by:currentUser, notes:"" });
        await cardPaidOut(r.id, currentUser);
        stavke.push({ type:"kartica", direction:"out", amount:amt, description:`Kartica ${r.card_type.toUpperCase()} ${r.date}` });
      }

      // 9. Sačuvaj obračun
      await saveObracun({
        driver_id: driverId, date: saveDate,
        total_duguje: totalDuguje, total_prima: totalPrihodi, saldo,
        evidenced_by: currentUser, notes: "",
        stavke
      });

      // 8. Ako duguje više nego prima → automatsko dugovanje
      if (saldo < 0) {
        await supabase.from("driver_debts").insert({
          driver_id: driverId, type:"ostalo", amount: Math.abs(saldo), paid_amount:0,
          date: saveDate, status:"open",
          description: `Prenos duga sa obračuna ${saveDate}`,
          created_by: currentUser
        });
        toast.success(`Obračun završen — prenos duga ${fmt(Math.abs(saldo))} na sledeći obračun`);
      } else if (saldo > 0) {
        toast.success(`Obračun završen — isplati vozaču ${fmt(saldo)}${bonusSunday?" + nedjelja 🎉":""}`);
      } else {
        toast.success(`Obračun završen — vozač na nuli`);
      }

      setOpen(false); reset();
    } catch (e: any) { toast.error("Greška: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4"/>Novi obračun</Button>
      </DialogTrigger>
      <DialogContent className="!max-w-5xl w-[92vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Obračun vozača</DialogTitle>
          <DialogDescription>{obracunDate ? `Obračunski dan: ${fmtDate(obracunDate)}` : `Evidentira: ${currentUser}`}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vozač */}
          <div className="grid gap-2">
            <Label>Vozač</Label>
            <Select value={driverId} onValueChange={v => { setDriverId(v); }}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>
                {drivers
                  .filter(d => d.role === "operativni" && d.status === "active")
                  .sort((a, b) => a.full_name.localeCompare(b.full_name))
                  .map(d => {
                    const veh = vehicles.find(v => v.id === d.vehicle_id);
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}{veh ? ` — ${veh.brand} ${veh.model} (${veh.taxi_license_number || "?"})` : " — bez vozila"}
                      </SelectItem>
                    );
                  })}
              </SelectContent>
            </Select>
          </div>

          {driver && (
            <div className="grid grid-cols-2 gap-6">

              {/* LIJEVA KOLONA */}
              <div className="space-y-3">

                {/* Info */}
                <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Dnevna renta:</span><strong>{fmt(driver.daily_rate)}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Članarina:</span><strong>{fmt(driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own)}/sed.</strong></div>
                  {lastPaidDate && <div className="flex justify-between"><span className="text-muted-foreground">Posljednja renta:</span><strong>{fmtDate(lastPaidDate)}</strong></div>}
                  {lastClanDate && <div className="flex justify-between"><span className="text-muted-foreground">Posljednja članarina:</span><strong>{fmtDate(lastClanDate)}</strong></div>}
                </div>

                {/* Banner ako vozac ima otvorena dugovanja */}
                {totalOpenDebt > 0 && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="font-semibold text-red-700">
                        Otvorena dugovanja: {openDebts.length} ({fmt(totalOpenDebt)})
                      </span>
                    </div>
                    <span className="text-red-600 text-[10px]">↓ vidi ispod</span>
                  </div>
                )}

                <p className="text-xs font-bold text-green-700 uppercase">Duguje vozač</p>

                {/* RENTA */}
                <CheckRow label="Renta" enabled={rentaEnabled} onToggle={() => setRentaEnabled(!rentaEnabled)}
                  amount={rentaTotal}
                  sublabel={workDays > 0 ? `${workDays} dana × ${fmt(driver.daily_rate)}${bonusSunday?" + nedjelja 🎉":""}` : undefined}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Od</Label><Input type="date" value={rentaFrom} onChange={e=>setRentaFrom(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Do</Label><Input type="date" value={rentaTo} onChange={e=>setRentaTo(e.target.value)}/></div>
                  </div>
                  {rentaDates.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">Klik na dan da označiš razlog (nije radio / servis / praznik)</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[...rentaDates, ...(bonusSunday?[bonusSunday]:[])].map(date => {
                          const dow = new Date(date+"T00:00:00").getDay();
                          const isSun = dow === 0;
                          const existing = cal.getStatus(driverId, date);
                          const off = cal.getOffStatus(driverId, date);
                          const canEdit = !isSun && existing !== "izmireno";
                          const setOff = (v: "nije_radio"|"servis"|"praznik"|null) => {
                            cal.saveOffStatus(driverId, date, v).catch(e => toast.error("Greška: " + e.message));
                          };
                          const label = off === "nije_radio" ? "Nije radio"
                                      : off === "servis" ? "Servis"
                                      : off === "praznik" ? "Praznik" : "";
                          const cls = off === "nije_radio" ? "bg-red-100 text-red-700 border border-red-300 line-through"
                                    : off === "servis" ? "bg-amber-100 text-amber-700 border border-amber-300 line-through"
                                    : off === "praznik" ? "bg-purple-100 text-purple-700 border border-purple-300 line-through"
                                    : isSun && date === bonusSunday ? "bg-green-100 text-green-700 border border-green-300"
                                    : existing === "izmireno" ? "bg-gray-100 text-gray-400 line-through"
                                    : "bg-primary/10 text-primary hover:bg-primary/20";
                          const pillContent = (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${cls} ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                              {date.slice(8)}. {DAYS_SR[dow]}{isSun?" 🎉":""}
                              {label && <span className="text-[10px] opacity-70">· {label}</span>}
                            </span>
                          );
                          if (!canEdit) return <span key={date}>{pillContent}</span>;
                          return (
                            <Popover key={date}>
                              <PopoverTrigger asChild>
                                <button type="button">{pillContent}</button>
                              </PopoverTrigger>
                              <PopoverContent className="w-52 p-1" align="start">
                                <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
                                  {new Date(date+"T00:00:00").toLocaleDateString("sr-RS", { weekday:"long", day:"numeric", month:"long" })}
                                </div>
                                <button type="button" onClick={() => setOff(null)}
                                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${!off ? "bg-primary/10" : ""}`}>
                                  <Sun className="h-3.5 w-3.5 text-primary" />Radni dan {!off && <Check className="h-3.5 w-3.5 ml-auto" />}
                                </button>
                                <button type="button" onClick={() => setOff("nije_radio")}
                                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "nije_radio" ? "bg-red-50" : ""}`}>
                                  <X className="h-3.5 w-3.5 text-red-600" />Nije radio {off === "nije_radio" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                </button>
                                <button type="button" onClick={() => setOff("servis")}
                                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "servis" ? "bg-amber-50" : ""}`}>
                                  <Wrench className="h-3.5 w-3.5 text-amber-600" />Servis {off === "servis" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                </button>
                                <button type="button" onClick={() => setOff("praznik")}
                                  className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "praznik" ? "bg-purple-50" : ""}`}>
                                  <PartyPopper className="h-3.5 w-3.5 text-purple-600" />Praznik {off === "praznik" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                </button>
                              </PopoverContent>
                            </Popover>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CheckRow>

                {/* ČLANARINA */}
                <CheckRow label="Članarina" enabled={clanEnabled} onToggle={() => setClanEnabled(!clanEnabled)}
                  amount={clanTotal}
                  sublabel={clanWeeks > 0 ? `${clanWeeks} sedmice × ${fmt(Number(clanAmt))}` : undefined}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Od</Label><Input type="date" value={clanFrom} onChange={e=>setClanFrom(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Do</Label><Input type="date" value={clanTo} onChange={e=>setClanTo(e.target.value)}/></div>
                  </div>
                  <div className="grid gap-1"><Label className="text-xs">Iznos/sedmici</Label><Input type="number" value={clanAmt} onChange={e=>setClanAmt(e.target.value)}/></div>
                </CheckRow>

                {/* POS */}
                {driver.driver_type === "renta" && (
                  <CheckRow label="POS naknada" enabled={posEnabled} onToggle={() => setPosEnabled(!posEnabled)} amount={posTotal}>
                    <Input type="number" value={posAmt} onChange={e=>setPosAmt(e.target.value)}/>
                  </CheckRow>
                )}

                {/* DUGOVANJA */}
                {openDebts.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Otvorena dugovanja</p>
                      <span className="text-xs font-bold text-red-600">Ukupno: {fmt(totalOpenDebt)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground italic">Ček znači "plaća sad" — iznos se skida iz prihoda vozača</p>
                    {openDebts.map(debt => {
                      const remaining = debt.amount - debt.paid_amount;
                      const sel = selectedDebts.has(debt.id);
                      const custom = Number(debtAmounts[debt.id]);
                      const willPay = sel ? (custom > 0 && custom <= remaining ? custom : remaining) : 0;
                      return (
                        <div key={debt.id} className={`rounded-lg border p-3 space-y-2 transition-colors ${sel?"border-green-300 bg-green-50/30":"border-gray-200 hover:bg-muted/20"}`}>
                          <div className="flex items-center justify-between cursor-pointer"
                            onClick={() => setSelectedDebts(prev => { const n=new Set(prev); sel?n.delete(debt.id):n.add(debt.id); return n; })}>
                            <div className="flex items-center gap-2">
                              <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel?"bg-green-500 border-green-500":"border-gray-300"}`}>
                                {sel && <Check className="h-3 w-3 text-white"/>}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{debt.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {debt.type} · {debt.date}
                                  {debt.paid_amount > 0 && ` · plaćeno ${fmt(debt.paid_amount)} od ${fmt(debt.amount)}`}
                                </p>
                              </div>
                            </div>
                            <span className="text-sm font-bold text-red-500">{fmt(remaining)}</span>
                          </div>
                          {sel && (
                            <div className="flex items-center gap-2">
                              <Label className="text-xs whitespace-nowrap">Uplati iznos:</Label>
                              <Input type="number" className="h-7 text-sm"
                                placeholder={String(remaining)}
                                value={debtAmounts[debt.id] ?? ""}
                                onChange={e => setDebtAmounts(prev => ({...prev, [debt.id]: e.target.value}))} />
                              <span className="text-xs text-muted-foreground whitespace-nowrap">max {fmt(remaining)}</span>
                            </div>
                          )}
                          {sel && willPay > 0 && willPay < remaining && (
                            <p className="text-xs text-amber-600">↳ Ostaje {fmt(remaining - willPay)} — dug ostaje otvoren</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <Separator/>
                <p className="text-xs font-bold text-orange-700 uppercase">Prima vozač</p>

                {/* PDV GORIVA */}
                <CheckRow label="PDV goriva" enabled={pdvEnabled} onToggle={() => setPdvEnabled(!pdvEnabled)}
                  amount={pdvTotal}
                  sublabel={`Iskorišćeno: ${fmt(fuelPdv.totalThisMonth)} / Ostalo: ${fmt(fuelPdv.remaining)}`}>
                  <Input type="number" value={pdvAmt} onChange={e=>setPdvAmt(e.target.value)}/>
                  {Number(pdvAmt) > fuelPdv.remaining && (
                    <p className="text-xs text-amber-600">Limit — biće odobreno samo {fmt(fuelPdv.remaining)}</p>
                  )}
                </CheckRow>

                {/* VAUČERI - naši (fiksno 400) */}
                <CheckRow label="Vaučeri (naši)" enabled={vaucerEnabled} onToggle={() => setVaucerEnabled(!vaucerEnabled)}
                  amount={vaucerTotal}
                  sublabel={vaucerCount && vaucerAmt ? `${vaucerCount} × ${fmt(Number(vaucerAmt))}` : undefined}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Broj vaučera</Label><Input type="number" value={vaucerCount} onChange={e=>setVaucerCount(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Iznos/vaučeru</Label><Input type="number" value={vaucerAmt} onChange={e=>setVaucerAmt(e.target.value)}/></div>
                  </div>
                </CheckRow>

                {/* VAUČERI - MB (varijabilni) */}
                <CheckRow label="Vaučeri (MB)" enabled={vaucerMbEnabled} onToggle={() => setVaucerMbEnabled(!vaucerMbEnabled)}
                  amount={vaucerMbTotal}
                  sublabel={vaucerMbCount && vaucerMbAmt ? `${vaucerMbCount} × ${fmt(Number(vaucerMbAmt))}` : undefined}>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Broj vaučera</Label><Input type="number" value={vaucerMbCount} onChange={e=>setVaucerMbCount(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Iznos/vaučeru</Label><Input type="number" value={vaucerMbAmt} onChange={e=>setVaucerMbAmt(e.target.value)}/></div>
                  </div>
                </CheckRow>

                {/* YANDEX */}
                {driverYandex.length === 0
                  ? <p className="text-xs text-muted-foreground">Nema neisplaćenih Yandex izvoda</p>
                  : <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Yandex izvodi</p>
                      {driverYandex.map(r => {
                        const sel = selectedYandex.has(r.id);
                        return (
                          <div key={r.id} className={`rounded-lg border p-3 space-y-2 transition-colors ${sel?"border-orange-300 bg-orange-50/30":"border-gray-200 hover:bg-muted/20"}`}>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedYandex(prev => { const n=new Set(prev); sel?n.delete(r.id):n.add(r.id); return n; })}>
                              <div className="flex items-center gap-2">
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel?"bg-orange-500 border-orange-500":"border-gray-300"}`}>
                                  {sel && <Check className="h-3 w-3 text-white"/>}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{r.period_from} — {r.period_to}</p>
                                  <p className="text-xs text-muted-foreground">Bruto: {fmt(r.gross_amount)} · Neto: {fmt(r.net_amount)}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-orange-600">{fmt(Number(yandexAmounts[r.id]) || r.net_amount)}</span>
                            </div>
                            {sel && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs whitespace-nowrap">Isplati iznos:</Label>
                                <Input type="number" className="h-7 text-sm"
                                  value={yandexAmounts[r.id] ?? r.net_amount}
                                  onChange={e => setYandexAmounts(prev => ({...prev, [r.id]: e.target.value}))}/>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">max {fmt(r.net_amount)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                }

                {/* KARTICE */}
                {driverCards.length === 0
                  ? <p className="text-xs text-muted-foreground">Nema neisplaćenih kartica</p>
                  : <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Kartice</p>
                      {driverCards.map(r => {
                        const sel = selectedCards.has(r.id);
                        return (
                          <div key={r.id} className={`rounded-lg border p-3 space-y-2 transition-colors ${sel?"border-orange-300 bg-orange-50/30":"border-gray-200 hover:bg-muted/20"}`}>
                            <div className="flex items-center justify-between cursor-pointer" onClick={() => setSelectedCards(prev => { const n=new Set(prev); sel?n.delete(r.id):n.add(r.id); return n; })}>
                              <div className="flex items-center gap-2">
                                <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${sel?"bg-orange-500 border-orange-500":"border-gray-300"}`}>
                                  {sel && <Check className="h-3 w-3 text-white"/>}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{r.card_type.toUpperCase()} · {r.date}</p>
                                  <p className="text-xs text-muted-foreground">Bruto: {fmt(r.gross_amount)} · Neto: {fmt(r.net_amount)}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-orange-600">{fmt(Number(cardAmounts[r.id]) || r.net_amount)}</span>
                            </div>
                            {sel && (
                              <div className="flex items-center gap-2">
                                <Label className="text-xs whitespace-nowrap">Isplati iznos:</Label>
                                <Input type="number" className="h-7 text-sm"
                                  value={cardAmounts[r.id] ?? r.net_amount}
                                  onChange={e => setCardAmounts(prev => ({...prev, [r.id]: e.target.value}))}/>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">max {fmt(r.net_amount)}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                }
              </div>

              {/* DESNA KOLONA — kalendar + sumarno */}
              <div className="space-y-4">
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <button onClick={() => { if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                      className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-lg">‹</button>
                    <span className="text-xs font-semibold">{MONTHS_SR[calMonth-1]} {calYear}</span>
                    <button onClick={() => { if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
                      className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-lg">›</button>
                  </div>
                  <KalendarPregled driverId={driverId} cal={cal} year={calYear} month={calMonth}/>
                </div>

                {/* Kalendar članarina */}
                <div className="rounded-lg border p-3 space-y-2">
                  <ClanarinaKalendar
                    driverId={driverId}
                    weeklyAmt={driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own}
                  />
                </div>

                {/* SUMARNO */}
                <div className="rounded-lg border p-4 space-y-3 sticky top-4">
                  <p className="text-xs font-bold uppercase">Sumarno</p>
                  {rentaEnabled && rentaTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Renta:</span><span className="text-green-600">+{fmt(rentaTotal)}</span></div>}
                  {clanEnabled && clanTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Članarina:</span><span className="text-green-600">+{fmt(clanTotal)}</span></div>}
                  {posEnabled && posTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">POS naknada:</span><span className="text-green-600">+{fmt(posTotal)}</span></div>}
                  {debtTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Dugovanja:</span><span className="text-green-600">+{fmt(debtTotal)}</span></div>}
                  {vaucerEnabled && vaucerTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vaučeri (naši):</span><span className="text-orange-600">−{fmt(vaucerTotal)}</span></div>}
                  {vaucerMbEnabled && vaucerMbTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vaučeri (MB):</span><span className="text-orange-600">−{fmt(vaucerMbTotal)}</span></div>}
                  {pdvEnabled && pdvTotal > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">PDV goriva:</span><span className="text-orange-600">−{fmt(pdvTotal)}</span></div>}
                  {yandexNet > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Yandex:</span><span className="text-orange-600">−{fmt(yandexNet)}</span></div>}
                  {cardNet > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Kartice:</span><span className="text-orange-600">−{fmt(cardNet)}</span></div>}
                  <Separator/>
                  <div className="flex justify-between text-base font-bold">
                    <span>{saldo >= 0 ? "Vozač prima:" : "Vozač duguje:"}</span>
                    <span className={saldo >= 0 ? "text-orange-600" : "text-green-600"}>{fmt(Math.abs(saldo))}</span>
                  </div>
                  {saldo < 0 && (
                    <p className="text-xs text-amber-600">Ostatak {fmt(Math.abs(saldo))} se prenosi kao dugovanje</p>
                  )}
                  {saldo > 0 && driver && (saldioDana > 0 || saldioSedmica > 0) && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-2 space-y-1">
                      <p className="text-xs font-semibold text-blue-700">Sa ostatkom može pokriti:</p>
                      {saldioDana > 0 && <p className="text-xs text-blue-600">🗓 {saldioDana} dana rente ({fmt(driver.daily_rate)}/dan)</p>}
                      {saldioSedmica > 0 && <p className="text-xs text-blue-600">📅 {saldioSedmica} sed. članarine ({fmt(driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own)}/sed.)</p>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Otkazi</Button>
          <div className="flex gap-2 ml-auto">
            {driver && (totalDuguje > 0 || totalPrihodi > 0) && (
              <Button variant="outline" onClick={() => {
                const content = `
VIP TAXI — Obračun vozača
==========================
Vozač: ${driver.full_name}
Datum: ${obracunDate || today}
Evidentirao: ${currentUser}

DUGUJE:
${rentaEnabled && rentaTotal > 0 ? `  Renta (${workDays} dana): ${fmt(rentaTotal)}` : ""}
${clanEnabled && clanTotal > 0 ? `  Članarina (${clanWeeks} sed.): ${fmt(clanTotal)}` : ""}
${posEnabled && posTotal > 0 ? `  POS naknada: ${fmt(posTotal)}` : ""}
${debtTotal > 0 ? `  Dugovanja: ${fmt(debtTotal)}` : ""}

PRIMA:
${pdvEnabled && pdvTotal > 0 ? `  PDV goriva: ${fmt(pdvTotal)}` : ""}
${vaucerEnabled && vaucerTotal > 0 ? `  Vaučeri (naši): ${fmt(vaucerTotal)}` : ""}
${vaucerMbEnabled && vaucerMbTotal > 0 ? `  Vaučeri (MB): ${fmt(vaucerMbTotal)}` : ""}
${yandexNet > 0 ? `  Yandex: ${fmt(yandexNet)}` : ""}
${cardNet > 0 ? `  Kartice: ${fmt(cardNet)}` : ""}

==========================
SALDO: ${saldo >= 0 ? `Prima ${fmt(saldo)}` : `Duguje ${fmt(Math.abs(saldo))}`}
${saldo < 0 ? `(prenos na sledeći obračun)` : ""}
                `.trim();
                const blob = new Blob([content], { type: "text/plain" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `obracun-${driver.full_name.replace(" ","-")}-${obracunDate||today}.txt`;
                a.click(); URL.revokeObjectURL(url);
              }}>📄 Preuzmi</Button>
            )}
            <Button disabled={!driver || saving} onClick={handleSave}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj obračun
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── OBRACUN KARTICA ──────────────────────────────────────────
function ObracunCard({ date, entries, obracun }: { date: string; entries: any[]; obracun: any }) {
  const { drivers, displayName } = useApp();
  const [expanded,setExpanded]=useState(false);
  const [closeOpen,setCloseOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const total_in =entries.filter(e=>e.direction==="in").reduce((s,e)=>s+e.amount,0);
  const total_out=entries.filter(e=>e.direction==="out").reduce((s,e)=>s+e.amount,0);
  const confirmed  =obracun?.isConfirmed(date)??false;
  const confirmedBy=obracun?.getConfirmedBy(date)??"";
  return (
    <motion.div layout initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}>
      <Card className={`overflow-hidden border-l-4 ${confirmed?"border-l-green-500":"border-l-amber-400"}`}>
        <div className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {confirmed?<CheckCircle2 className="h-5 w-5 text-green-500"/>:<Clock className="h-5 w-5 text-amber-500"/>}
              <div>
                <p className="font-semibold text-sm">{fmtDate(date)}</p>
                <p className="text-xs text-muted-foreground">{confirmed?`Zatvoren — ${confirmedBy}`:"Nije zatvoren"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Ulaz</p><p className="font-semibold text-green-600">+{fmt(total_in)}</p></div>
              <div className="text-right hidden sm:block"><p className="text-xs text-muted-foreground">Izlaz</p><p className="font-semibold text-red-500">−{fmt(total_out)}</p></div>
              <div className="text-right"><p className="text-xs text-muted-foreground">Bilans</p><p className="font-bold">{fmt(total_in-total_out)}</p></div>
              <button onClick={()=>setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground ml-1">{expanded?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</button>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {expanded&&(
            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
              <Separator/>
              {entries.length===0?<p className="text-center text-muted-foreground text-sm py-4">Nema unosa</p>:(
                <Table>
                  <TableHeader><TableRow><TableHead>Tip</TableHead><TableHead>Vozač</TableHead><TableHead>Opis</TableHead><TableHead>Iznos</TableHead><TableHead>Evidentirao</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {entries.map(e=>{
                      const driver=e.driver_id?drivers.find((d:any)=>d.id===e.driver_id):null;
                      return(
                        <TableRow key={e.id}>
                          <TableCell><Badge variant="outline" className={`text-xs ${CASH_TYPE_COLORS[e.type]??""}`}>{CASH_TYPE_LABELS[e.type]??e.type}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{driver?.full_name??<span className="text-muted-foreground text-xs">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                          <TableCell><span className={`font-bold text-sm ${e.direction==="in"?"text-green-600":"text-red-500"}`}>{e.direction==="in"?"+":"−"}{fmt(e.amount)}</span></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
              <div className="p-3 border-t flex items-center justify-between gap-3 flex-wrap">
                {!confirmed?(
                  <div className="flex items-center gap-2 flex-wrap w-full">
                    <div className="flex items-center gap-2 text-sm text-amber-700 flex-1"><AlertCircle className="h-4 w-4 flex-shrink-0"/><span>Nije zatvoren — bilans: <strong>{fmt(total_in-total_out)}</strong></span></div>
                    <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
                      <DialogTrigger asChild><Button size="sm"><CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/>Zatvori obračun</Button></DialogTrigger>
                      <DialogContent className="max-w-sm">
                        <DialogHeader><DialogTitle>Zatvori obračun</DialogTitle><DialogDescription>{fmtDate(date)} — bilans: {fmt(total_in-total_out)}</DialogDescription></DialogHeader>
                        <p className="py-3 text-sm">Zatvara: <strong>{displayName}</strong></p>
                        <DialogFooter>
                          <Button variant="outline" onClick={()=>setCloseOpen(false)}>Otkazi</Button>
                          <Button disabled={saving} onClick={async()=>{
                            setSaving(true);
                            try{await obracun.closeObracun(date,displayName,total_in,total_out);toast.success("Obračun zatvoren");setCloseOpen(false);}
                            catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
                          }}>{saving&&<Loader2 className="h-4 w-4 animate-spin mr-2"/>}Zatvori</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ):(
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4"/><span>Zatvoren — <strong>{confirmedBy}</strong></span></div>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" disabled={saving}
                      onClick={async()=>{setSaving(true);try{await obracun.stornoObracun(date);toast.success("Obračun storniran");}catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}}}>
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5"/>Storniraj
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const CashPage = () => {
  const today = new Date();
  const [filterMonth,setFilterMonth]=useState(`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`);
  const {entries,loading,addEntry,total_in,total_out,balance}=useCash(filterMonth);
  const obracun=useObracun(filterMonth);
  const { drivers: allDrivers, displayName }=useApp();

  const byDate=entries.reduce((acc,e)=>{if(!acc[e.date])acc[e.date]=[];acc[e.date].push(e);return acc;},{} as Record<string,any[]>);
  const [year,month]=filterMonth.split("-").map(Number);
  const daysInMonth=new Date(year,month,0).getDate();
  const todayStr=today.toISOString().split("T")[0];
  const obracunDates:string[]=[];
  for(let d=1;d<=daysInMonth;d++){const dow=new Date(year,month-1,d).getDay();if(dow===1||dow===3||dow===5)obracunDates.push(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);}
  const futureOrToday=obracunDates.filter(d=>d>=todayStr);
  const currentObracun=futureOrToday.length>0?futureOrToday[0]:obracunDates[obracunDates.length-1];
  const historyDates=obracunDates.filter(d=>d<currentObracun).sort().reverse();
  const lastHistory=historyDates[0]??"0000-00-00";
  const currentEntries=entries.filter(e=>e.date>lastHistory);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-2xl font-display font-bold">Kasa</h1><p className="text-muted-foreground text-sm">Evidencija uplata i isplata · Obračun: pon/sri/pet</p></div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)} className="w-40 h-9"/>
          <ObracunVozacDialog onAdd={addEntry} currentUser={displayName} obracunDate={currentObracun}/>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ulaz ovaj mj." value={fmt(total_in)} icon={ArrowDownLeft}/>
        <StatCard title="Izlaz ovaj mj." value={fmt(total_out)} icon={ArrowUpRight}/>
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${balance>=0?"bg-green-50 border-green-200":"bg-red-50 border-red-200"}`}>
          <p className="text-sm text-muted-foreground">Bilans ovaj mj.</p>
          <p className={`text-2xl font-bold font-display ${balance>=0?"text-green-600":"text-red-500"}`}>{balance>=0?"+":""}{fmt(balance)}</p>
        </div>
      </div>
      {loading?<div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>:(
        <Tabs defaultValue="tekuci">
          <TabsList><TabsTrigger value="tekuci">Tekući obračun</TabsTrigger><TabsTrigger value="istorija">Istorija</TabsTrigger><TabsTrigger value="sve">Svi unosi</TabsTrigger></TabsList>
          <TabsContent value="tekuci" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Naredni obračun: <strong>{fmtDate(currentObracun)}</strong></p>
            <ObracunCard date={currentObracun} entries={currentEntries} obracun={obracun}/>
          </TabsContent>
          <TabsContent value="istorija" className="mt-4 space-y-3">
            {historyDates.length===0?<Card><CardContent className="py-10 text-center text-muted-foreground">Nema zatvorenih obračuna</CardContent></Card>
              :historyDates.map(date=><ObracunCard key={date} date={date} entries={byDate[date]??[]} obracun={obracun}/>)}
          </TabsContent>
          <TabsContent value="sve" className="mt-4">
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Datum</TableHead><TableHead>Tip</TableHead><TableHead>Vozač</TableHead><TableHead>Opis</TableHead><TableHead>Iznos</TableHead><TableHead>Evidentirao</TableHead></TableRow></TableHeader>
                <TableBody>
                  {entries.length===0?<TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema unosa</TableCell></TableRow>
                    :entries.map(e=>{
                      const driver=e.driver_id?allDrivers.find((d:any)=>d.id===e.driver_id):null;
                      return(
                        <TableRow key={e.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs ${CASH_TYPE_COLORS[e.type]??""}`}>{CASH_TYPE_LABELS[e.type]??e.type}</Badge></TableCell>
                          <TableCell className="text-sm font-medium">{driver?.full_name??<span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                          <TableCell><span className={`font-bold text-sm ${e.direction==="in"?"text-green-600":"text-red-500"}`}>{e.direction==="in"?"+":"−"}{fmt(e.amount)}</span></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
export default CashPage;
