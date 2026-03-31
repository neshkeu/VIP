import { useApp } from "@/context/AppContext";
import { useState, useMemo } from "react";
import { useCash } from "@/hooks/useCash";
import { useObracun } from "@/hooks/useObracun";
import { useCalendar } from "@/hooks/useCalendar";
import { useYandex } from "@/hooks/useYandex";
import { useCards } from "@/hooks/useCards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDownLeft, ArrowUpRight, Plus, CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle, Loader2, RotateCcw, Check, CalendarDays } from "lucide-react";
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
  for (let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
    dates.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
  }
  return dates;
}
function getDateStr(y:number,m:number,d:number){return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;}
function getDow(y:number,m:number,d:number){return new Date(y,m-1,d).getDay();}
function getDaysInMonth(y:number,m:number){return new Date(y,m,0).getDate();}

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
const CARD_DEDUCTIONS: Record<string,number> = { visa:1.5, mastercard:1.5, dina:1.0, amex:2.5, ostalo:1.5 };

// ─── MINI KALENDAR ───────────────────────────────────────────
function KalendarPregled({ driverId, cal, year, month }: { driverId: string; cal: any; year: number; month: number }) {
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({length: daysInMonth}, (_,i) => i+1);

  const statusColor = (status: string|null) => {
    if (status === "izmireno")   return "bg-green-500";
    if (status === "neizmireno") return "bg-red-400";
    if (status === "nije_radio") return "bg-gray-300";
    return "bg-gray-100";
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted-foreground uppercase">{MONTHS_SR[month-1]} {year} — Kalendar</p>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["N","P","U","S","Č","Pet","Sub"].map(d => (
          <div key={d} className="text-xs text-muted-foreground font-medium py-0.5">{d}</div>
        ))}
        {/* Prazan prostor za prvi dan */}
        {Array.from({length: getDow(year, month, 1)}, (_,i) => <div key={`e${i}`}/>)}
        {days.map(day => {
          const dow    = getDow(year, month, day);
          const dateStr = getDateStr(year, month, day);
          const status  = cal.getStatus(driverId, dateStr);
          const isSun   = dow === 0;
          return (
            <div key={day} className={`rounded text-xs py-1 font-medium ${
              isSun ? "bg-gray-50 text-gray-300" :
              status === "izmireno"   ? "bg-green-100 text-green-700" :
              status === "neizmireno" ? "bg-red-100 text-red-600" :
              status === "nije_radio" ? "bg-gray-100 text-gray-400" :
              "text-gray-300"
            }`}>
              {day}
            </div>
          );
        })}
      </div>
      <div className="flex gap-3 text-xs mt-1">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-green-100 inline-block"/>Izmireno</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-red-100 inline-block"/>Neizmireno</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-gray-100 inline-block"/>Nije radio</span>
      </div>
    </div>
  );
}

// ─── OBRACUN PO VOZACU ────────────────────────────────────────
function ObracunVozacDialog({ onAdd, currentUser, obracunDate }: {
  onAdd: (e: any) => Promise<void>; currentUser: string; obracunDate: string;
}) {
  const { drivers } = useApp();
  const { reports: yandexReports, markPaidOut: yandexPaidOut } = useYandex();
  const { reports: cardReports, markPaidOut: cardPaidOut } = useCards();
  const today = new Date().toISOString().split("T")[0];
  const curYear  = new Date().getFullYear();
  const curMonth = new Date().getMonth()+1;

  const [open, setOpen]         = useState(false);
  const [driverId, setDriverId] = useState("none");
  const [saving, setSaving]     = useState(false);
  const [showKal, setShowKal]   = useState(false);

  // ULAZ
  const [rentaFrom, setRentaFrom]           = useState(today);
  const [rentaTo, setRentaTo]               = useState(today);
  const [rentaEnabled, setRentaEnabled]     = useState(true);
  const [clanarinaAmt, setClanarinaAmt]     = useState("");
  const [clanarinaEnabled, setClanarinaEnabled] = useState(false);
  const [posAmt, setPosAmt]                 = useState("");
  const [posEnabled, setPosEnabled]         = useState(false);

  // YANDEX — čekiraj izvode
  const [selectedYandex, setSelectedYandex] = useState<Set<string>>(new Set());
  // KARTICE — čekiraj izvode
  const [selectedCards, setSelectedCards]   = useState<Set<string>>(new Set());

  const driver = drivers.find(d => d.id === driverId);
  const cal    = useCalendar(curYear, curMonth);

  // Neisplaćeni yandex i kartice za ovog vozača
  const driverYandex = yandexReports.filter(r => r.driver_id === driverId && !r.paid_out);
  const driverCards  = cardReports.filter(r => r.driver_id === driverId && !r.paid_out);

  const rentaDates  = driver && rentaEnabled && rentaFrom && rentaTo ? getDatesInRange(rentaFrom, rentaTo) : [];
  const workDays    = rentaDates.filter(d => new Date(d+"T00:00:00").getDay() !== 0).length;
  const rentaTotal  = driver ? workDays * driver.daily_rate : 0;
  const clanarinaTotal = clanarinaEnabled
    ? (Number(clanarinaAmt) || (driver ? (driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own) : 0))
    : 0;
  const posTotal = posEnabled ? (Number(posAmt) || (driver?.pos_monthly_fee ?? 0)) : 0;

  // Yandex zbir selektovanih
  const yandexSelectedReports = driverYandex.filter(r => selectedYandex.has(r.id));
  const yandexGrossTotal = yandexSelectedReports.reduce((s,r) => s+r.gross_amount, 0);
  const yandexNetTotal   = yandexSelectedReports.reduce((s,r) => s+r.net_amount, 0);
  const yandexDeductTotal = yandexSelectedReports.reduce((s,r) => s+r.deduction_amount, 0);

  // Kartice zbir selektovanih
  const cardSelectedReports = driverCards.filter(r => selectedCards.has(r.id));
  const cardGrossTotal  = cardSelectedReports.reduce((s,r) => s+r.gross_amount, 0);
  const cardNetTotal    = cardSelectedReports.reduce((s,r) => s+r.net_amount, 0);
  const cardDeductTotal = cardSelectedReports.reduce((s,r) => s+r.deduction_amount, 0);

  const totalUlaz   = rentaTotal + clanarinaTotal + posTotal;
  const totalIzlaz  = yandexNetTotal + cardNetTotal;
  const saldo       = totalIzlaz - totalUlaz; // pozitivno = isplatiti vozaču

  // Bonus nedjelja
  const lastDate  = rentaTo ? new Date(rentaTo + "T00:00:00") : null;
  const lastDow   = lastDate?.getDay() ?? -1;
  const daysToSun = lastDow > 0 ? 7 - lastDow : 0;
  const bonusSunday = daysToSun > 0 && workDays >= 6 ? (() => {
    const sun = new Date(lastDate!);
    sun.setDate(sun.getDate() + daysToSun);
    return `${sun.getFullYear()}-${String(sun.getMonth()+1).padStart(2,"0")}-${String(sun.getDate()).padStart(2,"0")}`;
  })() : null;

  const lastPaidDate = driverId !== "none"
    ? [...(cal.entries ?? [])].filter((e:any) => e.driver_id === driverId && e.status === "izmireno")
        .sort((a:any,b:any) => b.date.localeCompare(a.date))[0]?.date ?? null
    : null;

  const reset = () => {
    setDriverId("none"); setShowKal(false);
    setRentaFrom(today); setRentaTo(today); setRentaEnabled(true);
    setClanarinaAmt(""); setClanarinaEnabled(false);
    setPosAmt(""); setPosEnabled(false);
    setSelectedYandex(new Set()); setSelectedCards(new Set());
  };

  const toggleYandex = (id: string) => setSelectedYandex(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });
  const toggleCard = (id: string) => setSelectedCards(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  const handleSave = async () => {
    if (!driver) return;
    setSaving(true);
    try {
      const saveDate = obracunDate || today;

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
      if (clanarinaEnabled && clanarinaTotal > 0)
        await onAdd({ type:"clanarina", direction:"in", driver_id:driverId, amount:clanarinaTotal, date:saveDate,
          description:"Članarina", received_by:currentUser, notes:"" });
      if (posEnabled && posTotal > 0)
        await onAdd({ type:"pos_naknada", direction:"in", driver_id:driverId, amount:posTotal, date:saveDate,
          description:"POS naknada", received_by:currentUser, notes:"" });

      // Yandex — isplati selektovane
      for (const r of yandexSelectedReports) {
        await onAdd({ type:"yandex", direction:"out", driver_id:driverId, amount:r.net_amount, date:saveDate,
          description:`Yandex ${r.period_from} — ${r.period_to}`, received_by:currentUser, notes:"" });
        await yandexPaidOut(r.id, currentUser);
      }

      // Kartice — isplati selektovane
      for (const r of cardSelectedReports) {
        await onAdd({ type:"kartica", direction:"out", driver_id:driverId, amount:r.net_amount, date:saveDate,
          description:`Kartica ${r.card_type.toUpperCase()} ${r.period_from} — ${r.period_to}`, received_by:currentUser, notes:"" });
        await cardPaidOut(r.id, currentUser);
      }

      toast.success(`Obračun za ${driver.full_name} završen${bonusSunday?" + nedjelja 🎉":""}`);
      setOpen(false); reset();
    } catch (e: any) { toast.error("Greška: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4"/>Novi obračun</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Obračun vozača</DialogTitle>
          <DialogDescription>{obracunDate ? `Obračunski dan: ${fmtDate(obracunDate)}` : `Evidentira: ${currentUser}`}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Vozač */}
          <div className="grid gap-2">
            <Label>Vozač</Label>
            <Select value={driverId} onValueChange={v => { setDriverId(v); setShowKal(false); }}>
              <SelectTrigger><SelectValue/></SelectTrigger>
              <SelectContent>{drivers.filter(d => d.status === "active").map(d => (
                <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>

          {driver && (
            <>
              {/* Info + Kalendar toggle */}
              <div className="rounded-lg bg-muted/30 px-3 py-2 text-xs space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Dnevna renta:</span><strong>{fmt(driver.daily_rate)}</strong></div>
                {lastPaidDate && <div className="flex justify-between"><span className="text-muted-foreground">Posljednji izmireni dan:</span><strong>{fmtDate(lastPaidDate)}</strong></div>}
                <button onClick={() => setShowKal(!showKal)}
                  className="flex items-center gap-1 text-primary hover:underline mt-1">
                  <CalendarDays className="h-3.5 w-3.5"/>
                  {showKal ? "Sakrij kalendar" : "Prikaži kalendar ovog mjeseca"}
                </button>
              </div>

              {/* Mini kalendar */}
              <AnimatePresence>
                {showKal && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                    <div className="rounded-lg border p-3">
                      <KalendarPregled driverId={driverId} cal={cal} year={curYear} month={curMonth}/>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <Separator/>

              {/* ULAZ */}
              <p className="text-xs font-bold text-green-700 uppercase">Ulaz — naplata</p>

              {/* Renta */}
              <div className={`rounded-lg border p-3 space-y-3 ${rentaEnabled?"border-green-300 bg-green-50/30":"border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setRentaEnabled(!rentaEnabled)}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${rentaEnabled?"bg-green-500 border-green-500":"border-gray-300"}`}>
                      {rentaEnabled && <Check className="h-3 w-3 text-white"/>}
                    </button>
                    <span className="text-sm font-medium">Renta</span>
                  </div>
                  {rentaEnabled && <span className="text-sm font-bold text-green-600">{fmt(rentaTotal)}</span>}
                </div>
                {rentaEnabled && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1"><Label className="text-xs">Od</Label><Input type="date" value={rentaFrom} onChange={e => setRentaFrom(e.target.value)}/></div>
                      <div className="grid gap-1"><Label className="text-xs">Do</Label><Input type="date" value={rentaTo} onChange={e => setRentaTo(e.target.value)}/></div>
                    </div>
                    {workDays > 0 && (
                      <div className="text-xs text-muted-foreground">
                        {workDays} dana × {fmt(driver.daily_rate)}
                        {bonusSunday && <span className="text-green-600 ml-1">+ nedjelja 🎉</span>}
                      </div>
                    )}
                    {rentaDates.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {[...rentaDates, ...(bonusSunday?[bonusSunday]:[])].map(date => {
                          const dow = new Date(date+"T00:00:00").getDay();
                          const isSun = dow === 0;
                          const existing = cal.getStatus(driverId, date);
                          return (
                            <div key={date} className={`rounded px-1.5 py-0.5 text-xs ${
                              isSun&&date===bonusSunday?"bg-green-100 text-green-700 border border-green-300":
                              existing==="izmireno"?"bg-gray-100 text-gray-400 line-through":
                              "bg-primary/10 text-primary"}`}>
                              {date.slice(8)}. {DAYS_SR[dow]}{isSun?" 🎉":""}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Članarina */}
              <div className={`rounded-lg border p-3 space-y-2 ${clanarinaEnabled?"border-green-300 bg-green-50/30":"border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button onClick={() => { setClanarinaEnabled(!clanarinaEnabled); if (!clanarinaAmt && driver) setClanarinaAmt(String(driver.driver_type==="renta"?driver.weekly_membership:driver.weekly_membership_own)); }}
                      className={`h-5 w-5 rounded border-2 flex items-center justify-center ${clanarinaEnabled?"bg-green-500 border-green-500":"border-gray-300"}`}>
                      {clanarinaEnabled && <Check className="h-3 w-3 text-white"/>}
                    </button>
                    <span className="text-sm font-medium">Članarina</span>
                  </div>
                  {clanarinaEnabled && <span className="text-sm font-bold text-green-600">{fmt(clanarinaTotal)}</span>}
                </div>
                {clanarinaEnabled && <Input type="number" value={clanarinaAmt} onChange={e => setClanarinaAmt(e.target.value)}/>}
              </div>

              {/* POS */}
              {driver.driver_type === "renta" && (
                <div className={`rounded-lg border p-3 space-y-2 ${posEnabled?"border-green-300 bg-green-50/30":"border-gray-200"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => { setPosEnabled(!posEnabled); if (!posAmt) setPosAmt(String(driver.pos_monthly_fee)); }}
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center ${posEnabled?"bg-green-500 border-green-500":"border-gray-300"}`}>
                        {posEnabled && <Check className="h-3 w-3 text-white"/>}
                      </button>
                      <span className="text-sm font-medium">POS naknada</span>
                    </div>
                    {posEnabled && <span className="text-sm font-bold text-green-600">{fmt(posTotal)}</span>}
                  </div>
                  {posEnabled && <Input type="number" value={posAmt} onChange={e => setPosAmt(e.target.value)}/>}
                </div>
              )}

              <Separator/>

              {/* IZLAZ — Yandex */}
              <p className="text-xs font-bold text-orange-700 uppercase">Izlaz — isplata vozaču</p>

              {driverYandex.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nema neisplaćenih Yandex izvoda</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Yandex izvodi</p>
                  {driverYandex.map(r => (
                    <div key={r.id} className={`rounded-lg border p-3 cursor-pointer transition-colors ${selectedYandex.has(r.id)?"border-orange-300 bg-orange-50/30":"border-gray-200 hover:bg-muted/30"}`}
                      onClick={() => toggleYandex(r.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${selectedYandex.has(r.id)?"bg-orange-500 border-orange-500":"border-gray-300"}`}>
                            {selectedYandex.has(r.id) && <Check className="h-3 w-3 text-white"/>}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.period_from} — {r.period_to}</p>
                            <p className="text-xs text-muted-foreground">Bruto: {fmt(r.gross_amount)} · Odbitak: {r.deduction_pct}%</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{fmt(r.net_amount)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedYandex.size > 0 && (
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-muted-foreground">Ukupno Yandex neto:</span>
                      <span className="font-bold text-orange-600">{fmt(yandexNetTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* IZLAZ — Kartice */}
              {driverCards.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nema neisplaćenih kartica</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Kartice</p>
                  {driverCards.map(r => (
                    <div key={r.id} className={`rounded-lg border p-3 cursor-pointer transition-colors ${selectedCards.has(r.id)?"border-orange-300 bg-orange-50/30":"border-gray-200 hover:bg-muted/30"}`}
                      onClick={() => toggleCard(r.id)}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${selectedCards.has(r.id)?"bg-orange-500 border-orange-500":"border-gray-300"}`}>
                            {selectedCards.has(r.id) && <Check className="h-3 w-3 text-white"/>}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{r.card_type.toUpperCase()} · {r.period_from} — {r.period_to}</p>
                            <p className="text-xs text-muted-foreground">Bruto: {fmt(r.gross_amount)} · Odbitak: {r.deduction_pct}%</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-orange-600">{fmt(r.net_amount)}</span>
                      </div>
                    </div>
                  ))}
                  {selectedCards.size > 0 && (
                    <div className="flex justify-between text-xs px-1">
                      <span className="text-muted-foreground">Ukupno kartice neto:</span>
                      <span className="font-bold text-orange-600">{fmt(cardNetTotal)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* SUMARNO */}
              {(totalUlaz > 0 || totalIzlaz > 0) && (
                <>
                  <Separator/>
                  <div className="rounded-lg border p-3 space-y-2">
                    <p className="text-xs font-bold uppercase">Sumarno</p>
                    {totalUlaz > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Naplata od vozača:</span><span className="text-green-600 font-semibold">+{fmt(totalUlaz)}</span></div>}
                    {totalIzlaz > 0 && <div className="flex justify-between text-sm"><span className="text-muted-foreground">Isplata vozaču:</span><span className="text-orange-600 font-semibold">−{fmt(totalIzlaz)}</span></div>}
                    <Separator/>
                    <div className="flex justify-between text-base font-bold">
                      <span>{saldo >= 0 ? "Vozač prima:" : "Vozač duguje:"}</span>
                      <span className={saldo >= 0 ? "text-orange-600" : "text-green-600"}>{fmt(Math.abs(saldo))}</span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Otkazi</Button>
          <Button disabled={!driver || saving} onClick={handleSave}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj obračun
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
                            try{await obracun.closeObracun(date,displayName,total_in,total_out);toast.success(`Obračun zatvoren`);setCloseOpen(false);}
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
