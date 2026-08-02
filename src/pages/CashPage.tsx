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
import { useDeposits } from "@/hooks/useDeposits";
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
import { DriverCombobox } from "@/components/DriverCombobox";
import { fmtD, fmtRange } from "@/lib/date";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${DAYS_SR[dt.getDay()]}, ${fmtD(d)}`;
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

// Izvor plaćanja svake obaveze (varijanta A): keš / yandex / kartica
type Izvor = "kes" | "yandex" | "kartica";
const IZVOR_META: Record<Izvor, { label: string; short: string }> = {
  kes:     { label: "💵 Keš",    short: "Keš" },
  yandex:  { label: "Yandex",    short: "Yandex" },
  kartica: { label: "Kartica",   short: "Kartica" },
};

const CASH_TYPE_LABELS: Record<string,string> = {
  renta:"Renta",clanarina:"Članarina",pos_naknada:"POS naknada",
  komunalni:"Komunalni",doprinosi:"Doprinosi",dugovanje:"Uplata dugovanja",
  likvidnost_in:"Likvidnost — ulaz",yandex:"Yandex isplata",
  kartica:"Kartica isplata",neoplanta:"Neoplanta isplata",vaučer:"Vaučer",vaučer_mb:"Vaučer (MB)",pdv_gorivo:"PDV gorivo",
  likvidnost_out:"Podizanje gotovine",depozit:"Depozit vozača",kasa_depozit:"Depozit u kasu",
};
const CASH_TYPE_COLORS: Record<string,string> = {
  renta:"text-green-700",clanarina:"text-green-700",pos_naknada:"text-green-700",
  komunalni:"text-green-700",doprinosi:"text-green-700",dugovanje:"text-blue-700",
  likvidnost_in:"text-purple-700",yandex:"text-orange-700",kartica:"text-orange-700",neoplanta:"text-emerald-700",
  vaučer:"text-red-700",vaučer_mb:"text-red-700",pdv_gorivo:"text-red-700",likvidnost_out:"text-red-700",depozit:"text-blue-700",kasa_depozit:"text-purple-700",
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

// ─── IZBOR IZVORA (keš / yandex / kartica) za jednu obavezu ────
function SrcToggle({ value, onChange }: { value: Izvor; onChange: (v: Izvor) => void }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground mr-1">Plaća iz:</span>
      {(Object.keys(IZVOR_META) as Izvor[]).map(k => (
        <button type="button" key={k} onClick={() => onChange(k)}
          className={`px-2 py-0.5 rounded text-xs border transition-colors ${
            value === k ? "bg-primary text-primary-foreground border-primary font-medium"
                        : "bg-background border-gray-300 text-muted-foreground hover:bg-muted"}`}>
          {IZVOR_META[k].short}
        </button>
      ))}
    </div>
  );
}

// ─── OBRACUN VOZACA DIALOG ────────────────────────────────────
function ObracunVozacDialog({ onAdd, currentUser, obracunDate }: {
  onAdd: (e: any) => Promise<void>; currentUser: string; obracunDate: string;
}) {
  const { drivers, vehicles } = useApp();
  const { yandexReports, cardReports, neoplantaRides, updateYandex, updateCard, updateNeoplanta } = useApp();
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

  // DEPOZIT — prebaci deo isplate na račun vozača
  const [depositEnabled, setDepositEnabled]     = useState(false);
  const [depositAmt, setDepositAmt]             = useState("");

  // KEŠ UPLATA — vozač donosi gotovinu za rentu/članarinu (ne dira Yandex)
  const [keshEnabled, setKeshEnabled]           = useState(false);
  const [keshAmt, setKeshAmt]                   = useState("");

  // Ručni izbor broja dana/sedmica za popunjavanje
  const [rentaDaysPick, setRentaDaysPick]       = useState("");
  const [clanWeeksPick, setClanWeeksPick]       = useState("");

  // RASPODELA PO IZVORIMA — koliko uzimam iz svakog (slobodna kombinacija)
  const [yanTake, setYanTake] = useState("");
  const [karTake, setKarTake] = useState("");
  const [neoTake, setNeoTake] = useState("");

  const driver = drivers.find(d => d.id === driverId);
  const cal    = useCalendar(calYear, calMonth);
  const membership = useMembership(driverId);
  const fuelPdv = useFuelPdv(driverId, curMonthStr);
  const { debts } = useDebts();
  const { saveObracun } = useObracuni();
  const { balanceFor, addTransaction: addDeposit } = useDeposits();

  // Posljednji izmireni dan
  const [lastPaidDate, setLastPaidDate] = useState<string|null>(null);
  const [lastClanDate, setLastClanDate] = useState<string|null>(null);
  useEffect(() => {
    if (driverId === "none") { setLastPaidDate(null); setLastClanDate(null); return; }
    supabase.from("calendar_entries").select("date").eq("driver_id", driverId).eq("status","izmireno")
      .order("date", { ascending: false }).limit(1)
      .then(({ data }) => {
        const last = data?.[0]?.date ?? null;
        setLastPaidDate(last);
        // Auto-postavi "Od" na dan posle poslednje plaćene rente
        if (last) {
          const nxt = new Date(last + "T00:00:00");
          nxt.setDate(nxt.getDate() + 1);
          const iso = `${nxt.getFullYear()}-${String(nxt.getMonth()+1).padStart(2,"0")}-${String(nxt.getDate()).padStart(2,"0")}`;
          setRentaFrom(iso);
          setRentaTo(iso);
        }
      });
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
  // Preostali (neisplaćeni) iznos izvoda — uzima u obzir "sačuvaj na saldo" iz ranijeg obračuna
  const yRemain = (r: typeof yandexReports[number]) => r.net_amount - (r.paid_amount || 0);
  const cRemain = (r: typeof cardReports[number]) => r.net_amount - (r.paid_amount || 0);
  // AUTO: svi neisplaćeni izvodi za vozača ulaze u pool (bez ručnog izbora)
  const driverYandex = yandexReports.filter(r => r.driver_id === driverId && !r.paid_out);
  const yandexSelected = driverYandex;
  const yandexNet  = yandexSelected.reduce((s,r) => s + yRemain(r), 0);
  const driverCards = cardReports.filter(r => r.driver_id === driverId && !r.paid_out);
  const cardSelected = driverCards;
  const cardNet    = cardSelected.reduce((s,r) => s + cRemain(r), 0);
  const nRemain = (r: typeof neoplantaRides[number]) => r.amount - (r.paid_amount || 0);
  const driverNeoplanta = neoplantaRides.filter(r => r.driver_id === driverId && !r.paid_out);
  const neoplantaSelected = driverNeoplanta;
  const neoplantaNet = neoplantaSelected.reduce((s,r) => s + nRemain(r), 0);
  const vaucerTotal   = vaucerEnabled   ? (Number(vaucerCount)   || 0) * (Number(vaucerAmt)   || 0) : 0;
  const vaucerMbTotal = vaucerMbEnabled ? (Number(vaucerMbCount) || 0) * (Number(vaucerMbAmt) || 0) : 0;
  const keshTotal     = Number(keshAmt) || 0;

  const totalPrihodi = yandexNet + cardNet + neoplantaNet + pdvTotal + vaucerTotal + vaucerMbTotal + keshTotal;
  const weeklyAmt = driver ? (driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own) : 0;
  // Napomena: automatsko postavljanje perioda rente/članarine je uklonjeno —
  // sada korisnik dobija PREDLOG ("možeš još N dana") i sam bira (vidi fillRentaDays).

  // Izračuni za rente i clanarine (ručno ili auto)
  // NEDELJA je uvek besplatna (0) osim ako je eksplicitno markirana "radi".
  // Ostali dani: 1 (radni), 0.5 (pola), 0 (nije_radio/servis/praznik).
  const rentaDates  = driver && rentaEnabled && rentaFrom && rentaTo ? getDatesInRange(rentaFrom, rentaTo) : [];
  const workDays    = rentaDates.reduce((sum, d) => {
    const dow = new Date(d+"T00:00:00").getDay();
    if (dow === 0) {
      // Nedelja: default besplatna; broji se samo ako je user označio "radi"
      const sun = cal.getSundayStatus(driverId, d);
      return sum + (sun === "radi" ? 1 : 0);
    }
    const off = cal.getOffStatus(driverId, d);
    if (off === "pola") return sum + 0.5;
    if (off) return sum; // nije_radio, servis, praznik
    return sum + 1;
  }, 0);
  const rentaTotal  = driver ? Math.round(workDays * driver.daily_rate) : 0;
  const clanWeeks   = clanEnabled && clanFrom && clanTo ? countWeeks(clanFrom, clanTo) : 0;
  const clanTotal   = clanEnabled ? Math.round(clanWeeks * (Number(clanAmt) || 0)) : 0;

  // Bonus nedjelja se ukida — nedelja je sada normalan dan koji korisnik ručno markira "nije_radio" ako je vozač ne plaća.
  const bonusSunday: string | null = null;

  // SALDO
  const totalDuguje  = rentaTotal + clanTotal + posTotal + debtTotal;
  const saldo        = totalPrihodi - totalDuguje;

  // ─── RASPODELA PO IZVORIMA (slobodna kombinacija) ─────────────
  // 3% odbitak (negativni yandex izvod) je obaveza koja "jede" yandex
  const yandexOdbiciList  = yandexSelected.filter(r => r.notes?.startsWith("3% odbitak"));
  const yandexRedovniList = yandexSelected.filter(r => !r.notes?.startsWith("3% odbitak"));
  const yandexRedovniSum  = yandexRedovniList.reduce((s, r) => s + yRemain(r), 0);
  const yandexOdbiciSum   = yandexOdbiciList.reduce((s, r) => s + Math.abs(r.net_amount), 0);

  // OBAVEZE — šta vozač duguje (renta + članarina + POS + dug)
  const obligTotal = rentaTotal + clanTotal + posTotal + debtTotal;

  // DOSTUPNO po izvoru
  const kesTake  = Number(keshAmt) || 0;                              // koliko keša vozač doneo
  const yanAvail = Math.max(0, yandexRedovniSum - yandexOdbiciSum);   // yandex umanjen za 3% odbitak
  const karAvail = cardNet;
  const neoAvail = neoplantaNet;
  const yanTakeNum = Math.max(0, Math.min(Number(yanTake) || 0, yanAvail));
  const karTakeNum = Math.max(0, Math.min(Number(karTake) || 0, karAvail));
  const neoTakeNum = Math.max(0, Math.min(Number(neoTake) || 0, neoAvail));

  // Vaučeri i PDV goriva su prihod vozača — kao yandex/kartica automatski pokrivaju obaveze,
  // a ako ostane surplus → ide u isplatu u keš.
  const takenTotal = kesTake + yanTakeNum + karTakeNum + neoTakeNum + vaucerTotal + vaucerMbTotal + pdvTotal;
  const surplus    = takenTotal - obligTotal;             // >0 isplata vozaču, <0 manjak → dug
  const isplataVozacu = Math.max(surplus, 0);
  const manjak     = Math.max(-surplus, 0);
  const yanStay    = yanAvail - yanTakeNum;               // ostaje na yandex saldu
  const karStay    = karAvail - karTakeNum;               // ostaje na kartica saldu
  const neoStay    = neoAvail - neoTakeNum;               // ostaje na neoplanta saldu

  // BREAKDOWN — koliko dela source-a pokriva obaveze, koliko ide u kes.
  // Proporcionalno prema udelu obaveza u ukupnom uzetom.
  const obligCoverPct = takenTotal > 0 ? Math.min(1, obligTotal / takenTotal) : 0;
  const splitLabel = (amt: number): string => {
    if (amt <= 0) return "";
    const oblig = Math.round(amt * obligCoverPct);
    const cash = amt - oblig;
    if (cash <= 0) return `na obaveze`;
    if (oblig <= 0) return `u keš vozaču`;
    return `${fmt(oblig)} na obaveze, ${fmt(cash)} u keš`;
  };

  // PREDLOG za rentu — koliko dana pokriva raspoloživi novac (bez rente)
  const availableForRenta = totalPrihodi - clanTotal - posTotal - debtTotal;
  const maxRentaDays = driver && driver.daily_rate > 0 ? Math.max(0, Math.floor(availableForRenta / driver.daily_rate)) : 0;

  // Popuni N dana rente. Sidro:
  //  - Ako je korisnik izabrao "Od" (rentaFrom nije danas), koristi to.
  //  - Inače kreni od dana posle poslednje plaćene rente.
  //  - Inače od danas.
  // Nedelja je otključana i računa se kao svaki drugi dan.
  const fillRentaDays = (n: number) => {
    if (!driver || n <= 0) return;
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    let start: Date;
    if (rentaFrom && rentaFrom !== today) {
      start = new Date(rentaFrom + "T00:00:00");
    } else if (lastPaidDate) {
      start = new Date(lastPaidDate + "T00:00:00");
      start.setDate(start.getDate() + 1);
    } else {
      start = new Date();
    }
    const end = new Date(start);
    end.setDate(start.getDate() + n - 1);
    setRentaFrom(iso(start));
    setRentaTo(iso(end));
    setRentaEnabled(true);
  };

  // PREDLOG za članarinu — koliko sedmica pokriva ostatak novca (posle rente)
  const availableForClan = totalPrihodi - rentaTotal - posTotal - debtTotal;
  const maxClanWeeks = weeklyAmt > 0 ? Math.max(0, Math.floor(availableForClan / weeklyAmt)) : 0;

  // Popuni N sedmica članarine počev od naredne sedmice posle poslednje
  const fillClanWeeks = (n: number) => {
    if (!driver || n <= 0) return;
    const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    // Sidro: ako je korisnik izabrao datum "Od" (clanFrom) i nije današnji, koristi njega;
    // inače kreni od naredne sedmice posle poslednje plaćene, inače od danas.
    const userAnchored = clanFrom && clanFrom !== today;
    let start: Date;
    if (userAnchored) {
      start = new Date(clanFrom + "T00:00:00");
    } else {
      start = lastClanDate ? new Date(lastClanDate + "T00:00:00") : new Date();
      if (lastClanDate) start.setDate(start.getDate() + 1);
    }
    // Ako je start negde usred nedelje, pomeri se na ponedeljak TE nedelje (backward)
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
    const end = new Date(start);
    end.setDate(start.getDate() + (n * 7) - 1);
    setClanFrom(iso(start));
    setClanTo(iso(end));
    setClanEnabled(true);
  };

  // Koliko dana rente/sedmica clanarine pokriva pozitivni saldo
  const saldioDana    = driver && saldo > 0 ? Math.floor(saldo / driver.daily_rate) : 0;
  const saldioSedmica = driver && saldo > 0 && weeklyAmt > 0 ? Math.floor(saldo / weeklyAmt) : 0;

  // Resetuj sva polja unosa (bez driverId) — poziva se pri promeni vozača
  const resetEntryFields = () => {
    setRentaEnabled(true); setRentaFrom(today); setRentaTo(today);
    setClanEnabled(false); setClanFrom(today); setClanTo(today); setClanAmt("");
    setPosEnabled(false); setPosAmt(""); setPdvEnabled(false); setPdvAmt("");
    setSelectedDebts(new Set()); setDebtAmounts({});
    setSelectedYandex(new Set()); setYandexAmounts({});
    setSelectedCards(new Set()); setCardAmounts({});
    setVaucerEnabled(false); setVaucerCount(""); setVaucerAmt("400");
    setVaucerMbEnabled(false); setVaucerMbCount(""); setVaucerMbAmt("200");
    setDepositEnabled(false); setDepositAmt("");
    setKeshEnabled(false); setKeshAmt("");
    setRentaDaysPick(""); setClanWeeksPick("");
    setYanTake(""); setKarTake(""); setNeoTake("");
  };

  const reset = () => {
    setDriverId("none");
    resetEntryFields();
  };

  const changeDriver = (v: string) => {
    setDriverId(v);
    resetEntryFields();
  };

  const handleSave = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      const saveDate = obracunDate || today;
      const stavke: any[] = [];

      // 1. Renta — svaki dan doprinosi 1.0 (radni), 0.5 (pola) ili 0 (off)
      if (rentaEnabled && workDays > 0) {
        await onAdd({ type:"renta", direction:"in", driver_id:driverId, amount:rentaTotal, date:saveDate,
          description:`Renta ${fmtD(rentaFrom)} — ${fmtD(rentaTo)} (${workDays} ${workDays===1?"dan":"dana"})`, received_by:currentUser, notes:"" });
        for (const d of rentaDates) {
          const off = cal.getOffStatus(driverId, d);
          if (off === "nije_radio" || off === "servis" || off === "praznik") continue;
          const amt = off === "pola" ? Math.round(driver.daily_rate / 2) : driver.daily_rate;
          await cal.saveAmount(driverId, d, "renta", amt, currentUser);
          await cal.saveStatus(driverId, d, "izmireno", currentUser);
        }
      }

      // 2. Članarina
      if (clanEnabled && clanTotal > 0) {
        await onAdd({ type:"clanarina", direction:"in", driver_id:driverId, amount:clanTotal, date:saveDate,
          description:`Članarina ${fmtD(clanFrom)} — ${fmtD(clanTo)} (${clanWeeks} sed.)`, received_by:currentUser, notes:"" });
        await membership.addEntry({ driver_id:driverId, date_from:clanFrom, date_to:clanTo, amount:clanTotal, evidenced_by:currentUser });
      }

      // 3. POS
      if (posEnabled && posTotal > 0)
        await onAdd({ type:"pos_naknada", direction:"in", driver_id:driverId, amount:posTotal, date:saveDate,
          description:"POS naknada", received_by:currentUser, notes:"" });

      // 4. PDV goriva — izlaz (isplata vozaču)
      if (pdvEnabled && pdvTotal > 0) {
        await onAdd({ type:"pdv_gorivo", direction:"out", driver_id:driverId, amount:pdvTotal, date:saveDate,
          description:`PDV goriva (limit ${fmt(fuelPdv.PDV_MONTHLY_LIMIT)}/mj) · ${splitLabel(pdvTotal)}`, received_by:currentUser, notes:"" });
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
          description:`Vaučeri (naši): ${vaucerCount} × ${fmt(Number(vaucerAmt))} · ${splitLabel(vaucerTotal)}`, received_by:currentUser, notes:"" };
        await onAdd({...stavka});
        stavke.push({ type:stavka.type, direction:stavka.direction, amount:stavka.amount, description:stavka.description });
      }
      // 6b. MB Vaučeri
      if (vaucerMbEnabled && vaucerMbTotal > 0) {
        const stavka = { type:"vaučer_mb", direction:"out", driver_id:driverId, amount:vaucerMbTotal, date:saveDate,
          description:`Vaučeri (MB): ${vaucerMbCount} × ${fmt(Number(vaucerMbAmt))} · ${splitLabel(vaucerMbTotal)}`, received_by:currentUser, notes:"" };
        await onAdd({...stavka});
        stavke.push({ type:stavka.type, direction:stavka.direction, amount:stavka.amount, description:stavka.description });
      }

      // OSNOV isplate — određuje kako je novac iskorišćen na ovom obračunu:
      //   "u kešu"        → sve što je uzeto iz izvora ide vozaču u keš (nema obaveza)
      //   "kroz obračun"  → sve pokriva obaveze (renta/članarina/POS/dug)
      //   "kombinovano"   → deo pokriva obaveze, deo ide u keš
      const basisFor = (): string => {
        if (obligTotal <= 0.01) return "u kešu";
        if (surplus <= 0.01) return "kroz obračun";
        return "kombinovano";
      };
      const paymentBasis = basisFor();

      // 7. Yandex — potroši izvode FIFO (starije prvo) za: uzeti iznos + 3% odbitak.
      //    Ostatak ostaje na saldu (izvod neisplaćen) za sledeći put.
      let poolYandex = yanTakeNum + yandexOdbiciSum;
      const yandexFifo = [...yandexRedovniList].sort((a, b) => (a.period_from ?? a.date).localeCompare(b.period_from ?? b.date));
      for (const r of yandexFifo) {
        if (poolYandex <= 0.01) break;
        const eff = yRemain(r);
        const already = r.paid_amount || 0;
        const room = Math.max(eff, 0);
        const take = Math.min(poolYandex, room);
        if (take <= 0) continue;
        poolYandex -= take;
        const newPaid = already + take;
        const fully = newPaid >= r.net_amount - 0.01;
        await updateYandex(r.id, { paid_amount: newPaid, paid_out: fully, received_by: currentUser, payment_basis: fully ? paymentBasis : r.payment_basis });
      }
      // 3% odbici — evidentiraj kao izmirene (odbitak sa yandexa, nije keš izlaz)
      for (const r of yandexOdbiciList) {
        await updateYandex(r.id, { paid_out: true, received_by: currentUser, payment_basis: "kroz obračun" });
      }
      // Realni izlaz iz yandexa (novac koji radi na obračunu) = yanTakeNum
      if (yanTakeNum > 0) {
        const desc = `Yandex — uzeto ${fmt(yanTakeNum)} · ${splitLabel(yanTakeNum)}${yanStay>0?` · ostaje ${fmt(yanStay)} na saldu`:""}`;
        await onAdd({ type:"yandex", direction:"out", driver_id:driverId, amount:yanTakeNum, date:saveDate,
          description:desc, received_by:currentUser, notes:"" });
        stavke.push({ type:"yandex", direction:"out", amount:yanTakeNum, description:desc });
      }

      // 8. Kartice — FIFO (starije prvo) za karTakeNum, ostatak na saldu
      let poolKartica = karTakeNum;
      const cardsFifo = [...cardSelected].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      for (const r of cardsFifo) {
        if (poolKartica <= 0.01) break;
        const eff = cRemain(r);
        const already = r.paid_amount || 0;
        const take = Math.min(poolKartica, Math.max(eff, 0));
        if (take <= 0) continue;
        poolKartica -= take;
        const newPaid = already + take;
        const fully = newPaid >= r.net_amount - 0.01;
        await updateCard(r.id, { paid_amount: newPaid, paid_out: fully, received_by: currentUser, payment_basis: fully ? paymentBasis : r.payment_basis });
      }
      if (karTakeNum > 0) {
        const desc = `Kartica — uzeto ${fmt(karTakeNum)} · ${splitLabel(karTakeNum)}${karStay>0?` · ostaje ${fmt(karStay)} na saldu`:""}`;
        await onAdd({ type:"kartica", direction:"out", driver_id:driverId, amount:karTakeNum, date:saveDate,
          description:desc, received_by:currentUser, notes:"" });
        stavke.push({ type:"kartica", direction:"out", amount:karTakeNum, description:desc });
      }

      // 8c. Neoplanta — FIFO (starije prvo) za neoTakeNum, ostatak na saldu
      let poolNeo = neoTakeNum;
      const neoFifo = [...neoplantaSelected].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      for (const r of neoFifo) {
        if (poolNeo <= 0.01) break;
        const eff = nRemain(r);
        const already = r.paid_amount || 0;
        const take = Math.min(poolNeo, Math.max(eff, 0));
        if (take <= 0) continue;
        poolNeo -= take;
        const newPaid = already + take;
        const fully = newPaid >= r.amount - 0.01;
        await updateNeoplanta(r.id, { paid_amount: newPaid, paid_out: fully, received_by: currentUser, payment_basis: fully ? paymentBasis : r.payment_basis });
      }
      if (neoTakeNum > 0) {
        const desc = `Neoplanta — uzeto ${fmt(neoTakeNum)} · ${splitLabel(neoTakeNum)}${neoStay>0?` · ostaje ${fmt(neoStay)} na saldu`:""}`;
        await onAdd({ type:"neoplanta", direction:"out", driver_id:driverId, amount:neoTakeNum, date:saveDate,
          description:desc, received_by:currentUser, notes:"" });
        stavke.push({ type:"neoplanta", direction:"out", amount:neoTakeNum, description:desc });
      }

      // 8b. Depozit — prebaci deo isplate na račun vozača
      if (depositEnabled && Number(depositAmt) > 0) {
        const dep = Number(depositAmt);
        await addDeposit({
          driver_id: driverId, amount: dep, date: saveDate,
          description: `Uplata na depozit iz obračuna ${fmtD(saveDate)}`, created_by: currentUser,
        });
        // Novac ostaje u firmi (vozač ne uzima keš) → dolazi kao ulaz u kasu
        await onAdd({ type:"depozit", direction:"in", driver_id:driverId, amount:dep, date:saveDate,
          description:"Prebačeno na depozit vozača", received_by:currentUser, notes:"" });
        stavke.push({ type:"depozit", direction:"in", amount:dep, description:"Prebačeno na depozit vozača" });
      }

      // 9. Sačuvaj obračun
      // Vaučeri i PDV su već umanjili dug (netObligTotal) — ne dodaju se u isplatu u kes
      const isplataUKes = isplataVozacu;
      await saveObracun({
        driver_id: driverId, date: saveDate,
        total_duguje: totalDuguje, total_prima: totalPrihodi, saldo: isplataUKes,
        evidenced_by: currentUser, notes: "",
        stavke
      });

      // 10. Ako izabrani izvor nema pokriće → prenos duga na sledeći obračun
      if (manjak > 0.01) {
        await supabase.from("driver_debts").insert({
          driver_id: driverId, type:"ostalo", amount: Math.round(manjak), paid_amount:0,
          date: saveDate, status:"open",
          description: `Nepokrivena obaveza sa obračuna ${fmtD(saveDate)}`,
          created_by: currentUser
        });
        toast.success(`Obračun završen — nepokriveno ${fmt(Math.round(manjak))} prebačeno u dug`);
      } else if (isplataUKes > 0) {
        toast.success(`Obračun završen — isplati vozaču ${fmt(isplataUKes)}${bonusSunday?" + nedjelja 🎉":""}`);
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
            <DriverCombobox
              value={driverId === "none" ? "" : driverId}
              onChange={changeDriver}
              options={drivers
                .filter(d => d.role === "operativni" && d.status === "active")
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(d => {
                  const veh = vehicles.find(v => v.id === d.vehicle_id);
                  return {
                    value: d.id,
                    label: d.full_name,
                    sublabel: veh ? `${veh.brand} ${veh.model} (${veh.taxi_license_number || "?"})` : "bez vozila",
                  };
                })}
            />
          </div>

          {driver && (
            <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">

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
                  sublabel={workDays > 0 ? `${workDays} ${workDays===1?"dan":"dana"} × ${fmt(driver.daily_rate)}` : undefined}>
                  {/* KALENDAR — vizualni pregled istorije plaćanja */}
                  <div className="rounded-lg border p-3 space-y-2 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => { if(calMonth===1){setCalMonth(12);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }}
                        className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-lg">‹</button>
                      <span className="text-xs font-semibold">{MONTHS_SR[calMonth-1]} {calYear}</span>
                      <button type="button" onClick={() => { if(calMonth===12){setCalMonth(1);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }}
                        className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground font-bold text-lg">›</button>
                    </div>
                    <KalendarPregled driverId={driverId} cal={cal} year={calYear} month={calMonth}/>
                  </div>

                  {/* PREDLOG na osnovu raspoloživog novca */}
                  {maxRentaDays > 0 && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-blue-700">
                        💡 Sa raspoloživim novcem ({fmt(Math.max(availableForRenta,0))}) možeš <strong>{maxRentaDays}</strong> {maxRentaDays===1?"dan":"dana"} rente
                      </span>
                      <Button size="sm" variant="outline" className="h-7 text-xs whitespace-nowrap" onClick={() => fillRentaDays(maxRentaDays)}>
                        Popuni {maxRentaDays}
                      </Button>
                    </div>
                  )}
                  {/* Ručni izbor broja dana */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Broj dana:</Label>
                    <Input type="number" className="h-7 w-20 text-sm" placeholder="npr. 5" value={rentaDaysPick} onChange={e=>setRentaDaysPick(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter" && Number(rentaDaysPick)>0){ fillRentaDays(Number(rentaDaysPick)); } }}/>
                    <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={!(Number(rentaDaysPick)>0)} onClick={()=>fillRentaDays(Number(rentaDaysPick))}>
                      Popuni
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Od</Label><Input type="date" value={rentaFrom} onChange={e=>setRentaFrom(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Do</Label><Input type="date" value={rentaTo} onChange={e=>setRentaTo(e.target.value)}/></div>
                  </div>
                  {rentaDates.length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground mt-1">Klik na dan da označiš: pola rente / nije radio / servis / praznik</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rentaDates.map(date => {
                          const dow = new Date(date+"T00:00:00").getDay();
                          const isSun = dow === 0;
                          const existing = cal.getStatus(driverId, date);
                          const off = cal.getOffStatus(driverId, date);
                          const sun = cal.getSundayStatus(driverId, date);
                          const canEdit = existing !== "izmireno";
                          const setOff = (v: "nije_radio"|"servis"|"praznik"|"pola"|null) => {
                            cal.saveOffStatus(driverId, date, v).catch(e => toast.error("Greška: " + e.message));
                          };
                          const setSun = (v: "radi"|"slobodan") => {
                            cal.saveSundayStatus(driverId, date, v).catch(e => toast.error("Greška: " + e.message));
                          };
                          const sunWorks = isSun && sun === "radi";
                          const label = isSun
                            ? (sunWorks ? "Radi" : "Besplatno")
                            : (off === "nije_radio" ? "Nije radio"
                              : off === "servis" ? "Servis"
                              : off === "praznik" ? "Praznik"
                              : off === "pola" ? "½ rente" : "");
                          const cls = isSun
                            ? (sunWorks
                                ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100")
                            : off === "nije_radio" ? "bg-red-100 text-red-700 border border-red-300 line-through"
                            : off === "servis" ? "bg-amber-100 text-amber-700 border border-amber-300 line-through"
                            : off === "praznik" ? "bg-purple-100 text-purple-700 border border-purple-300 line-through"
                            : off === "pola" ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : existing === "izmireno" ? "bg-gray-100 text-gray-400 line-through"
                            : "bg-primary/10 text-primary hover:bg-primary/20";
                          const pillContent = (
                            <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-colors ${cls} ${canEdit ? "cursor-pointer" : "cursor-default"}`}>
                              {date.slice(8)}. {DAYS_SR[dow]}
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
                                {isSun ? (
                                  <>
                                    <button type="button" onClick={() => setSun("slobodan")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${!sunWorks ? "bg-amber-50" : ""}`}>
                                      <span className="h-3.5 w-3.5 flex items-center justify-center text-xs text-amber-700">🎉</span>Besplatno (default) {!sunWorks && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                    <button type="button" onClick={() => setSun("radi")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${sunWorks ? "bg-emerald-50" : ""}`}>
                                      <Sun className="h-3.5 w-3.5 text-emerald-600" />Radi (naplaćuje se) {sunWorks && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button type="button" onClick={() => setOff(null)}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${!off ? "bg-primary/10" : ""}`}>
                                      <Sun className="h-3.5 w-3.5 text-primary" />Cela renta {!off && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                    <button type="button" onClick={() => setOff("pola")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "pola" ? "bg-blue-50" : ""}`}>
                                      <span className="h-3.5 w-3.5 flex items-center justify-center text-xs text-blue-600 font-bold">½</span>Pola rente {off === "pola" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                    <button type="button" onClick={() => setOff("nije_radio")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "nije_radio" ? "bg-red-50" : ""}`}>
                                      <X className="h-3.5 w-3.5 text-red-600" />Nije radio (ne plaća) {off === "nije_radio" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                    <button type="button" onClick={() => setOff("servis")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "servis" ? "bg-amber-50" : ""}`}>
                                      <Wrench className="h-3.5 w-3.5 text-amber-600" />Servis {off === "servis" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                    <button type="button" onClick={() => setOff("praznik")}
                                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent ${off === "praznik" ? "bg-purple-50" : ""}`}>
                                      <PartyPopper className="h-3.5 w-3.5 text-purple-600" />Praznik {off === "praznik" && <Check className="h-3.5 w-3.5 ml-auto" />}
                                    </button>
                                  </>
                                )}
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
                  {/* PREDLOG za članarinu + brzi izbor */}
                  {maxClanWeeks > 0 && (
                    <div className="rounded-md bg-blue-50 border border-blue-200 p-2 space-y-1.5">
                      <span className="text-xs text-blue-700">
                        💡 Ostatak novca pokriva <strong>{maxClanWeeks}</strong> {maxClanWeeks===1?"članarinu":"članarine"}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[1,2,3,4].filter(n => n <= Math.max(maxClanWeeks,4)).map(n => (
                          <Button key={n} size="sm" variant="outline" className="h-7 text-xs" onClick={()=>fillClanWeeks(n)}>
                            {n} {n===1?"članarina":"članarine"}
                          </Button>
                        ))}
                        {maxClanWeeks > 4 && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={()=>fillClanWeeks(maxClanWeeks)}>
                            Popuni {maxClanWeeks}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Ručni izbor broja sedmica */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs whitespace-nowrap">Broj sedmica:</Label>
                    <Input type="number" className="h-7 w-20 text-sm" placeholder="npr. 2" value={clanWeeksPick} onChange={e=>setClanWeeksPick(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter" && Number(clanWeeksPick)>0){ fillClanWeeks(Number(clanWeeksPick)); } }}/>
                    <Button size="sm" variant="secondary" className="h-7 text-xs" disabled={!(Number(clanWeeksPick)>0)} onClick={()=>fillClanWeeks(Number(clanWeeksPick))}>
                      Popuni
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1"><Label className="text-xs">Od</Label><Input type="date" value={clanFrom} onChange={e=>setClanFrom(e.target.value)}/></div>
                    <div className="grid gap-1"><Label className="text-xs">Do</Label><Input type="date" value={clanTo} onChange={e=>setClanTo(e.target.value)}/></div>
                  </div>
                  <div className="grid gap-1"><Label className="text-xs">Iznos/sedmici</Label><Input type="number" value={clanAmt} onChange={e=>setClanAmt(e.target.value)}/></div>
                  {/* Interaktivni kalendar članarine — klik na sedmicu bira taj period */}
                  <div className="mt-2 rounded-md border p-2 bg-muted/20">
                    <ClanarinaKalendar
                      driverId={driverId}
                      weeklyAmt={driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own}
                      selectedFrom={clanFrom}
                      selectedTo={clanTo}
                      onPickMonday={(monday) => {
                        const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
                        const sunday = new Date(monday + "T00:00:00"); sunday.setDate(sunday.getDate()+6);
                        setClanFrom(monday);
                        setClanTo(iso(sunday));
                      }}
                    />
                  </div>
                </CheckRow>

                {/* POS */}
                {driver.driver_type === "renta" && (
                  <CheckRow label="POS naknada" enabled={posEnabled} onToggle={() => setPosEnabled(!posEnabled)} amount={posTotal}>
                    <Input type="number" value={posAmt} onChange={e=>setPosAmt(e.target.value)}/>
                  </CheckRow>
                )}

                {/* DUGOVANJA */}
                {openDebts.length > 0 && (
                  <details open={selectedDebts.size > 0} className="rounded-lg border p-2 bg-red-50/20 border-red-200 space-y-2">
                    <summary className="text-xs cursor-pointer flex items-center justify-between">
                      <span className="font-semibold text-red-800">
                        Otvorena dugovanja ({openDebts.length}) — {fmt(totalOpenDebt)}
                      </span>
                      <span className="text-muted-foreground">
                        {selectedDebts.size > 0 ? `naplaćuje se ${fmt(debtTotal)}` : "klik za detalje"}
                      </span>
                    </summary>
                    <p className="text-xs text-muted-foreground italic pt-1">Ček znači „plaća sad" — iznos se skida iz izabranog izvora</p>
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
                                  {debt.type} · {fmtD(debt.date)}
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
                  </details>
                )}

                <Separator/>
                <p className="text-xs font-bold text-orange-700 uppercase">Dodatne isplate vozaču</p>

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

                {/* DEPOZIT — prebaci deo isplate na račun vozača */}
                <Separator/>
                <div className="rounded-lg border p-3 space-y-2 bg-blue-50/30 border-blue-200">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={depositEnabled} onChange={() => setDepositEnabled(!depositEnabled)} className="h-4 w-4"/>
                      <span className="text-sm font-medium">💰 Prebaci na depozit vozača</span>
                    </label>
                    <span className="text-xs text-muted-foreground">Stanje: <strong>{fmt(balanceFor(driverId))}</strong></span>
                  </div>
                  {depositEnabled && (
                    <div className="space-y-1">
                      <Label className="text-xs">Iznos za depozit (RSD)</Label>
                      <Input type="number" placeholder={isplataVozacu > 0 ? String(isplataVozacu) : "0"} value={depositAmt} onChange={e=>setDepositAmt(e.target.value)}/>
                      <p className="text-xs text-muted-foreground">
                        Umesto keša — ostaje na računu vozača (npr. za novo vozilo). Novo stanje: {fmt(balanceFor(driverId) + (Number(depositAmt) || 0))}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* DESNA KOLONA — samo Odakle uzimam / rezultat */}
              <div className="space-y-4">
                {/* ODAKLE UZIMAM — slobodna raspodela + rezultat */}
                {(() => {
                  const depozit = depositEnabled ? Number(depositAmt) || 0 : 0;
                  const uKes = Math.max(isplataVozacu - depozit, 0);
                  const coverPct = obligTotal > 0 ? Math.min(100, takenTotal / obligTotal * 100) : 100;
                  const autoSources = vaucerTotal + vaucerMbTotal + pdvTotal;

                  return (
                    <div className="rounded-lg border p-4 space-y-3 sticky top-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase">Odakle uzimam</p>
                        <span className="text-xs text-muted-foreground">Duguje: <strong className="text-red-600">{fmt(obligTotal)}</strong></span>
                      </div>

                      {autoSources > 0 && (() => {
                        const splitRow = (label: string, amt: number) => {
                          const oblig = Math.round(amt * obligCoverPct);
                          const cash = amt - oblig;
                          return (
                            <div key={label} className="flex flex-wrap items-baseline justify-between text-xs gap-x-2">
                              <span className="text-purple-700">{label} <strong>+{fmt(amt)}</strong></span>
                              <span className="text-[11px] flex items-center gap-2">
                                {oblig > 0 && <span className="text-red-700">obaveze <strong>{fmt(oblig)}</strong></span>}
                                {cash > 0 && <span className="text-emerald-700">u keš <strong>{fmt(cash)}</strong></span>}
                              </span>
                            </div>
                          );
                        };
                        return (
                          <div className="rounded-md bg-purple-50 border border-purple-200 p-2 space-y-1">
                            <div className="text-xs font-semibold text-purple-800 mb-1">Automatski u obračun</div>
                            {pdvTotal>0      && splitRow("PDV goriva", pdvTotal)}
                            {vaucerTotal>0   && splitRow("Vaučeri (naši)", vaucerTotal)}
                            {vaucerMbTotal>0 && splitRow("Vaučeri (MB)", vaucerMbTotal)}
                          </div>
                        );
                      })()}

                      {/* KEŠ */}
                      <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"/>Keš (vozač doneo)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap text-muted-foreground">Uzimam:</Label>
                          <Input type="number" className="h-8 text-sm text-right" placeholder="0" value={keshAmt} onChange={e=>setKeshAmt(e.target.value)}/>
                        </div>
                        {kesTake > 0 && (() => {
                          const oblig = Math.round(kesTake * obligCoverPct);
                          const cash = kesTake - oblig;
                          return (
                            <div className="text-[11px] flex items-center gap-3 pt-0.5">
                              {oblig > 0 && <span className="text-red-700">→ obaveze: <strong>{fmt(oblig)}</strong></span>}
                              {cash > 0 && <span className="text-emerald-700">→ u keš: <strong>{fmt(cash)}</strong></span>}
                            </div>
                          );
                        })()}
                      </div>

                      {/* YANDEX */}
                      {yanAvail > 0 && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"/>Yandex</span>
                            <span className="text-xs text-muted-foreground">dostupno <strong className="text-foreground">{fmt(yanAvail)}</strong>{yandexOdbiciSum>0 && <span className="text-red-600"> (−3% {fmt(yandexOdbiciSum)})</span>}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap text-muted-foreground">Uzimam:</Label>
                            <Input type="number" className="h-8 text-sm text-right" placeholder="0" value={yanTake} onChange={e=>setYanTake(e.target.value)}/>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setYanTake(String(Math.min(Math.max(obligTotal - kesTake - karTakeNum - neoTakeNum - vaucerTotal - vaucerMbTotal - pdvTotal,0), yanAvail)))}>Pokrij obaveze</Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setYanTake(String(yanAvail))}>Sve ({fmt(yanAvail)})</Button>
                          </div>
                          {yanTakeNum > 0 && (() => {
                            const oblig = Math.round(yanTakeNum * obligCoverPct);
                            const cash = yanTakeNum - oblig;
                            return (
                              <div className="text-[11px] flex items-center gap-3 pt-0.5">
                                {oblig > 0 && <span className="text-red-700">→ obaveze: <strong>{fmt(oblig)}</strong></span>}
                                {cash > 0 && <span className="text-emerald-700">→ u keš: <strong>{fmt(cash)}</strong></span>}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-blue-600">Ostaje na saldu: <strong>{fmt(Math.max(yanStay,0))}</strong></p>
                        </div>
                      )}

                      {/* KARTICA */}
                      {karAvail > 0 && (
                        <div className="rounded-lg border border-orange-200 bg-orange-50/40 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-orange-500"/>Kartica</span>
                            <span className="text-xs text-muted-foreground">dostupno <strong className="text-foreground">{fmt(karAvail)}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap text-muted-foreground">Uzimam:</Label>
                            <Input type="number" className="h-8 text-sm text-right" placeholder="0" value={karTake} onChange={e=>setKarTake(e.target.value)}/>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setKarTake(String(Math.min(Math.max(obligTotal - kesTake - yanTakeNum - neoTakeNum - vaucerTotal - vaucerMbTotal - pdvTotal,0), karAvail)))}>Pokrij obaveze</Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setKarTake(String(karAvail))}>Sve ({fmt(karAvail)})</Button>
                          </div>
                          {karTakeNum > 0 && (() => {
                            const oblig = Math.round(karTakeNum * obligCoverPct);
                            const cash = karTakeNum - oblig;
                            return (
                              <div className="text-[11px] flex items-center gap-3 pt-0.5">
                                {oblig > 0 && <span className="text-red-700">→ obaveze: <strong>{fmt(oblig)}</strong></span>}
                                {cash > 0 && <span className="text-emerald-700">→ u keš: <strong>{fmt(cash)}</strong></span>}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-blue-600">Ostaje na saldu: <strong>{fmt(Math.max(karStay,0))}</strong></p>
                        </div>
                      )}

                      {/* NEOPLANTA */}
                      {neoAvail > 0 && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500"/>Neoplanta</span>
                            <span className="text-xs text-muted-foreground">dostupno <strong className="text-foreground">{fmt(neoAvail)}</strong></span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs whitespace-nowrap text-muted-foreground">Uzimam:</Label>
                            <Input type="number" className="h-8 text-sm text-right" placeholder="0" value={neoTake} onChange={e=>setNeoTake(e.target.value)}/>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setNeoTake(String(Math.min(Math.max(obligTotal - kesTake - yanTakeNum - karTakeNum - vaucerTotal - vaucerMbTotal - pdvTotal,0), neoAvail)))}>Pokrij obaveze</Button>
                            <Button size="sm" variant="outline" className="h-6 text-xs flex-1" onClick={()=>setNeoTake(String(neoAvail))}>Sve ({fmt(neoAvail)})</Button>
                          </div>
                          {neoTakeNum > 0 && (() => {
                            const oblig = Math.round(neoTakeNum * obligCoverPct);
                            const cash = neoTakeNum - oblig;
                            return (
                              <div className="text-[11px] flex items-center gap-3 pt-0.5">
                                {oblig > 0 && <span className="text-red-700">→ obaveze: <strong>{fmt(oblig)}</strong></span>}
                                {cash > 0 && <span className="text-emerald-700">→ u keš: <strong>{fmt(cash)}</strong></span>}
                              </div>
                            );
                          })()}
                          <p className="text-xs text-blue-600">Ostaje na saldu: <strong>{fmt(Math.max(neoStay,0))}</strong></p>
                        </div>
                      )}

                      {/* REZULTAT */}
                      <Separator/>
                      <div className="h-2 rounded bg-muted overflow-hidden">
                        <div className={`h-full rounded transition-all ${manjak>0?"bg-red-500":surplus>0?"bg-orange-500":"bg-green-500"}`} style={{width:`${coverPct}%`}}/>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Uzeto: <strong className="text-foreground">{fmt(takenTotal)}</strong></span>
                        <span>− Obaveze: {fmt(obligTotal)}</span>
                      </div>

                      <div className={`flex justify-between items-center text-base font-bold rounded-md px-3 py-2 ${manjak>0?"bg-red-50 text-red-700":surplus>0?"bg-orange-50 text-orange-700":"bg-green-50 text-green-700"}`}>
                        <span>{manjak>0?"Nedostaje → dug:":surplus>0?"Za isplatu vozaču:":"Izmireno:"}</span>
                        <span>{fmt(manjak>0?manjak:isplataVozacu)}</span>
                      </div>

                      {depozit > 0 && (
                        <div className="flex justify-between text-xs text-blue-700"><span>💰 Na depozit</span><span>−{fmt(depozit)}</span></div>
                      )}

                      <div className="flex justify-between items-center text-sm font-bold border-t pt-2">
                        <span>Ukupno u keš vozaču:</span>
                        <span className="text-orange-600">{fmt(uKes)}</span>
                      </div>

                      {manjak > 0 && (
                        <p className="text-xs text-amber-600">Uzmi više iz nekog izvora ili se {fmt(manjak)} prenosi kao dugovanje.</p>
                      )}
                    </div>
                  );
                })()}
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
Datum: ${fmtD(obracunDate || today)}
Evidentirao: ${currentUser}

DUGUJE (obaveze): ${fmt(obligTotal)}
${rentaEnabled && rentaTotal > 0 ? `  Renta (${workDays} dana): ${fmt(rentaTotal)}` : ""}
${clanEnabled && clanTotal > 0 ? `  Članarina (${clanWeeks} sed.): ${fmt(clanTotal)}` : ""}
${posEnabled && posTotal > 0 ? `  POS naknada: ${fmt(posTotal)}` : ""}
${debtTotal > 0 ? `  Dugovanja: ${fmt(debtTotal)}` : ""}

UZETO IZ IZVORA: ${fmt(takenTotal)}
${kesTake > 0 ? `  Keš (doneo): ${fmt(kesTake)}` : ""}
${yanTakeNum > 0 ? `  Yandex: ${fmt(yanTakeNum)} (ostaje ${fmt(Math.max(yanStay,0))} na saldu)` : ""}
${karTakeNum > 0 ? `  Kartica: ${fmt(karTakeNum)} (ostaje ${fmt(Math.max(karStay,0))} na saldu)` : ""}
${neoTakeNum > 0 ? `  Neoplanta: ${fmt(neoTakeNum)} (ostaje ${fmt(Math.max(neoStay,0))} na saldu)` : ""}
${pdvEnabled && pdvTotal > 0 ? `  PDV goriva: ${fmt(pdvTotal)}` : ""}
${vaucerEnabled && vaucerTotal > 0 ? `  Vaučeri (naši): ${fmt(vaucerTotal)}` : ""}
${vaucerMbEnabled && vaucerMbTotal > 0 ? `  Vaučeri (MB): ${fmt(vaucerMbTotal)}` : ""}

==========================
${manjak > 0 ? `NEDOSTAJE (dug): ${fmt(manjak)}` : `ZA ISPLATU VOZAČU: ${fmt(isplataVozacu)}`}
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
  const [stornoOpen,setStornoOpen]=useState(false);
  const [stornoReason,setStornoReason]=useState("");
  const [saving,setSaving]=useState(false);
  const [openDriverId,setOpenDriverId]=useState<string|null>(null);
  const total_in =entries.filter(e=>e.direction==="in").reduce((s,e)=>s+e.amount,0);
  const total_out=entries.filter(e=>e.direction==="out").reduce((s,e)=>s+e.amount,0);
  const confirmed  =obracun?.isConfirmed(date)??false;
  const confirmedBy=obracun?.getConfirmedBy(date)??"";
  const stornoLogs =obracun?.getStornoLogs(date)??[];

  // Grupiši unose po vozaču
  const byDriver = entries.reduce((acc:Record<string,any[]>, e:any)=>{
    const key = e.driver_id ?? "none";
    if(!acc[key]) acc[key]=[];
    acc[key].push(e);
    return acc;
  }, {});
  const driverGroups = Object.entries(byDriver).map(([driverId, ents])=>{
    const driver = driverId!=="none" ? drivers.find((d:any)=>d.id===driverId) : null;
    const inSum  = (ents as any[]).filter(e=>e.direction==="in").reduce((s,e)=>s+e.amount,0);   // vozač PLAĆA firmi (renta, članarina...)
    const outSum = (ents as any[]).filter(e=>e.direction==="out").reduce((s,e)=>s+e.amount,0);  // vozač PRIMA (yandex, kartice...)
    // Iz perspektive vozača: prima ono što izlazi iz kase, plaća ono što ulazi
    return { driverId, driver, ents: ents as any[], inSum, outSum, saldo: outSum-inSum };
  }).sort((a,b)=>(a.driver?.full_name??"—").localeCompare(b.driver?.full_name??"—"));

  const printDriver=(g:typeof driverGroups[0])=>{
    const w=window.open("","_blank","width=400,height=600");
    if(!w)return;
    const rows=g.ents.map(e=>`<tr><td>${CASH_TYPE_LABELS[e.type]??e.type}</td><td>${e.description}</td><td style="text-align:right;color:${e.direction==="in"?"#080":"#c00"}">${e.direction==="in"?"+":"−"}${fmt(e.amount)}</td></tr>`).join("");
    w.document.write(`<html><head><title>${g.driver?.full_name??"Obračun"} — ${fmtDate(date)}</title>
      <style>body{font-family:monospace;font-size:12px;padding:16px;max-width:380px}h2{text-align:center;margin:0}
      .sub{text-align:center;color:#666;font-size:11px;margin-bottom:10px}table{width:100%;border-collapse:collapse}
      td{padding:2px 0;border-bottom:1px solid #eee}th{text-align:left;border-bottom:1px solid #000;font-size:11px}
      .total{font-weight:bold;border-top:2px solid #000;font-size:13px}.foot{text-align:center;color:#999;font-size:10px;margin-top:14px}</style>
      </head><body><h2>VIP PLUS TAXI</h2><div class="sub">${fmtDate(date)}${confirmed?" · ZATVOREN":""}</div>
      <div><strong>${g.driver?.full_name??"—"}</strong></div>
      <table><tr><th>Tip</th><th>Opis</th><th style="text-align:right">Iznos</th></tr>${rows}
      <tr class="total"><td colspan="2">${g.saldo>=0?"Vozač prima":"Vozač plaća"}</td><td style="text-align:right">${fmt(Math.abs(g.saldo))}</td></tr></table>
      <div class="foot">${confirmed?`Zatvorio: ${confirmedBy}`:"Nije zatvoren"} · ${new Date().toLocaleString("sr-RS")}</div>
      </body></html>`);
    w.document.close();w.print();
  };

  const printObracun=()=>{
    const w=window.open("","_blank","width=420,height=640");
    if(!w)return;
    const rows=entries.map(e=>{
      const driver=e.driver_id?drivers.find((d:any)=>d.id===e.driver_id):null;
      return `<tr><td>${CASH_TYPE_LABELS[e.type]??e.type}</td><td>${driver?.full_name??""}</td><td style="text-align:right;color:${e.direction==="in"?"#080":"#c00"}">${e.direction==="in"?"+":"−"}${fmt(e.amount)}</td></tr>`;
    }).join("");
    w.document.write(`
      <html><head><title>Obračun ${fmtDate(date)}</title>
      <style>body{font-family:monospace;font-size:12px;padding:16px;max-width:400px}h2{text-align:center;margin:0}
      .sub{text-align:center;color:#666;font-size:11px;margin-bottom:10px}table{width:100%;border-collapse:collapse}
      td{padding:2px 0;border-bottom:1px solid #eee}th{text-align:left;border-bottom:1px solid #000;font-size:11px}
      .total{font-weight:bold;border-top:2px solid #000}.foot{text-align:center;color:#999;font-size:10px;margin-top:14px}</style>
      </head><body><h2>VIP PLUS TAXI</h2><div class="sub">Obračun · ${fmtDate(date)}${confirmed?" · ZATVOREN":""}</div>
      <table><tr><th>Tip</th><th>Vozač</th><th style="text-align:right">Iznos</th></tr>${rows}
      <tr class="total"><td colspan="2">Ulaz</td><td style="text-align:right;color:#080">+${fmt(total_in)}</td></tr>
      <tr class="total"><td colspan="2">Izlaz</td><td style="text-align:right;color:#c00">−${fmt(total_out)}</td></tr>
      <tr class="total"><td colspan="2">BILANS</td><td style="text-align:right">${fmt(total_in-total_out)}</td></tr></table>
      <div class="foot">${confirmed?`Zatvorio: ${confirmedBy}`:"Nije zatvoren"} · ${new Date().toLocaleString("sr-RS")}</div>
      </body></html>`);
    w.document.close();w.print();
  };
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
                <div className="divide-y">
                  {driverGroups.map(g=>{
                    const isOpen = openDriverId===g.driverId;
                    return (
                      <div key={g.driverId}>
                        <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 cursor-pointer"
                          onClick={()=>setOpenDriverId(isOpen?null:g.driverId)}>
                          <div className="flex items-center gap-2">
                            {isOpen?<ChevronUp className="h-4 w-4 text-muted-foreground"/>:<ChevronDown className="h-4 w-4 text-muted-foreground"/>}
                            <span className="font-medium text-sm">{g.driver?.full_name ?? "— (bez vozača)"}</span>
                            <Badge variant="secondary" className="text-xs">{g.ents.length} {g.ents.length===1?"stavka":"stavke"}</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold text-sm ${g.saldo>=0?"text-orange-600":"text-green-600"}`}>
                              {g.saldo>=0?"prima ":"plaća "}{fmt(Math.abs(g.saldo))}
                            </span>
                            <button onClick={(e)=>{e.stopPropagation();printDriver(g);}}
                              className="text-xs text-primary hover:underline" title="Štampaj za ovog vozača">🖨</button>
                          </div>
                        </div>
                        <AnimatePresence>
                          {isOpen && (
                            <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                              <div className="bg-muted/10 px-4 pb-2">
                                <Table>
                                  <TableBody>
                                    {g.ents.map(e=>(
                                      <TableRow key={e.id}>
                                        <TableCell className="py-1.5"><Badge variant="outline" className={`text-xs ${CASH_TYPE_COLORS[e.type]??""}`}>{CASH_TYPE_LABELS[e.type]??e.type}</Badge></TableCell>
                                        <TableCell className="py-1.5 text-xs text-muted-foreground">{e.description}</TableCell>
                                        <TableCell className="py-1.5 text-right"><span className={`font-bold text-sm ${e.direction==="in"?"text-green-600":"text-red-500"}`}>{e.direction==="in"?"+":"−"}{fmt(e.amount)}</span></TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
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
                  <div className="flex items-center justify-between w-full gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-sm text-green-700"><CheckCircle2 className="h-4 w-4"/><span>Zatvoren — <strong>{confirmedBy}</strong></span></div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={printObracun}>🖨 Štampaj</Button>
                      <Dialog open={stornoOpen} onOpenChange={v=>{setStornoOpen(v);if(!v)setStornoReason("");}}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5"/>Storniraj
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Storniraj obračun</DialogTitle>
                            <DialogDescription>{fmtDate(date)} — obavezno unesi razlog (ostaje trag)</DialogDescription>
                          </DialogHeader>
                          <div className="py-3 space-y-2">
                            <Label className="text-xs">Razlog storniranja *</Label>
                            <Input value={stornoReason} onChange={e=>setStornoReason(e.target.value)} placeholder="npr. pogrešan iznos rente"/>
                            <p className="text-xs text-muted-foreground">Storno radi: <strong>{displayName}</strong></p>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={()=>setStornoOpen(false)}>Otkazi</Button>
                            <Button variant="destructive" disabled={!stornoReason||saving} onClick={async()=>{
                              setSaving(true);
                              try{await obracun.stornoObracun(date,stornoReason,displayName);toast.success("Obračun storniran — možeš da menjaš unose");setStornoOpen(false);setStornoReason("");}
                              catch(e:any){toast.error("Greška: "+e.message);}finally{setSaving(false);}
                            }}>{saving&&<Loader2 className="h-4 w-4 animate-spin mr-2"/>}Storniraj</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                )}
              </div>
              {stornoLogs.length>0&&(
                <div className="px-4 pb-3 space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Istorija storna</p>
                  {stornoLogs.map(l=>(
                    <div key={l.id} className="flex items-center gap-2 text-xs text-muted-foreground rounded bg-amber-50 border border-amber-200 px-2 py-1">
                      <RotateCcw className="h-3 w-3 text-amber-600 flex-shrink-0"/>
                      <span className="font-medium">{l.storno_by}</span>
                      <span>·</span>
                      <span>{l.reason}</span>
                      <span className="ml-auto opacity-60">{new Date(l.created_at).toLocaleString("sr-RS")}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── DEPOZIT U KASU (likvidnost) ─────────────────────────────
function KasaDepozitDialog({ onAdd, currentUser, defaultDate }: {
  onAdd: (e: any) => Promise<void>; currentUser: string; defaultDate: string;
}) {
  const [open, setOpen]     = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate]     = useState(defaultDate);
  const [note, setNote]     = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setDate(defaultDate); }, [open, defaultDate]);

  const save = async () => {
    if (!(Number(amount) > 0)) { toast.error("Unesi iznos"); return; }
    setSaving(true);
    try {
      await onAdd({
        type: "kasa_depozit", direction: "in", driver_id: null,
        amount: Number(amount), date,
        description: note || "Depozit u kasu", received_by: currentUser, notes: "",
      });
      toast.success(`Depozit u kasu: ${fmt(Number(amount))}`);
      setOpen(false); setAmount(""); setNote("");
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Plus className="mr-2 h-4 w-4"/>Depozit u kasu</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Depozit u kasu</DialogTitle>
          <DialogDescription>Ubaci novac u kasu (likvidnost) za isplate</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5"><Label>Iznos (RSD)</Label><Input type="number" placeholder="0" value={amount} onChange={e=>setAmount(e.target.value)} onKeyDown={e=>{ if(e.key==="Enter") save(); }}/></div>
          <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={date} onChange={e=>setDate(e.target.value)}/></div>
          <div className="grid gap-1.5"><Label>Napomena</Label><Input placeholder="npr. iz sefa, od gazde..." value={note} onChange={e=>setNote(e.target.value)}/></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Otkazi</Button>
          <Button disabled={!(Number(amount)>0)||saving} onClick={save}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
          <KasaDepozitDialog onAdd={addEntry} currentUser={displayName} defaultDate={currentObracun}/>
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
