import { useState } from "react";
import { useDrivers } from "@/hooks/useDrivers";
import { useCalendar } from "@/hooks/useCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Check, X, Coffee, Loader2 } from "lucide-react";
import { toast } from "sonner";

const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function getDow(y: number, m: number, d: number) { return new Date(y, m-1, d).getDay(); }
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

type DayStatus = "izmireno" | "neizmireno" | null;
type SundayStatus = "radi" | "slobodan" | null;

function isSundayFree(
  getStatus: (driverId: string, date: string) => DayStatus,
  driverId: string, sundayDate: string
): boolean {
  if (!sundayDate || !driverId) return false;
  const sun = new Date(sundayDate + "T00:00:00");
  if (isNaN(sun.getTime())) return false;
  for (let i = 1; i <= 6; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    if (getStatus(driverId, d.toISOString().split("T")[0]) !== "izmireno") return false;
  }
  return true;
}

function getAutoAmount(driver: any, type: string): number {
  if (type === "renta")      return driver.daily_rate ?? 0;
  if (type === "clanarina")  return driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own;
  if (type === "pos_naknada") return driver.pos_monthly_fee ?? 0;
  if (type === "komunalni")  return driver.komunalni_monthly ?? 0;
  if (type === "doprinosi")  return driver.doprinosi_monthly ?? 0;
  return 0;
}

const ULAZ_TYPES = [
  { value: "renta", label: "Renta" },
  { value: "clanarina", label: "Članarina" },
  { value: "pos_naknada", label: "POS naknada" },
  { value: "komunalni", label: "Komunalni" },
  { value: "doprinosi", label: "Doprinosi" },
];

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driver, date, cal }: {
  open: boolean; onClose: () => void;
  driver: any; date: string; cal: any;
}) {
  const [by, setBy]               = useState("");
  const [entryType, setEntryType] = useState("renta");
  const [entryAmount, setEntryAmount] = useState("");
  const [addOpen, setAddOpen]     = useState(false);
  const [saving, setSaving]       = useState(false);

  if (!driver || !date) return null;

  const dow    = new Date(date + "T00:00:00").getDay();
  const isSun  = dow === 0;
  const status = cal.getStatus(driver.id, date);
  const sundayStatus = cal.getSundayStatus(driver.id, date);
  const sunFree = isSun ? isSundayFree(cal.getStatus, driver.id, date) : false;
  const entries = cal.getAmounts(driver.id, date);

  const handleTypeChange = (type: string) => {
    setEntryType(type);
    const auto = getAutoAmount(driver, type);
    if (auto > 0) setEntryAmount(String(auto));
  };

  const handleSaveEntry = async (newStatus: DayStatus) => {
    if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
    if (!entryAmount) { toast.error("Unesi iznos!"); return; }
    setSaving(true);
    try {
      await cal.saveAmount(driver.id, date, entryType, Number(entryAmount), by);
      await cal.saveStatus(driver.id, date, newStatus!, by);
      toast.success(`Evidentirano ${fmt(Number(entryAmount))} — ${newStatus}`);
      setAddOpen(false); setEntryAmount(""); onClose();
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSundaySave = async (s: SundayStatus) => {
    if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
    setSaving(true);
    try {
      await cal.saveSundayStatus(driver.id, date, s!);
      toast.success(s === "radi" ? "Evidentiran rad u nedjelju" : "Slobodan dan");
      onClose();
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setAddOpen(false); setBy(""); setEntryAmount(""); } onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{driver.full_name}</DialogTitle>
          <DialogDescription>{DAYS_SR[dow]}, {date}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isSun && (
            <div className={`rounded-lg border p-3 space-y-3 ${sunFree ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
              <p className="text-sm font-medium text-center">
                {sunFree ? "🎉 Nedjelja besplatna — radio sve pon–sub" : "Nedjelja — evidentiraj prisustvo"}
              </p>
              {!sunFree && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleSundaySave("radi")} disabled={saving}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${sundayStatus === "radi" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-gray-200"}`}>
                    <Check className="h-4 w-4"/>Radi
                  </button>
                  <button onClick={() => handleSundaySave("slobodan")} disabled={saving}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${sundayStatus === "slobodan" ? "bg-gray-200 text-gray-700 border-gray-400" : "hover:bg-muted border-gray-200"}`}>
                    <Coffee className="h-4 w-4"/>Slobodan
                  </button>
                </div>
              )}
            </div>
          )}

          {entries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Evidentirano</p>
              {entries.map((e: any, i: number) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{ULAZ_TYPES.find(t => t.value === e.type)?.label ?? e.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">{fmt(e.amount)}</span>
                    <span className="text-xs text-muted-foreground">— {e.evidenced_by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} className="h-9"/>
          </div>

          {!isSun && (
            !addOpen ? (
              <Button variant="outline" size="sm" className="w-full h-8 text-xs"
                onClick={() => { setAddOpen(true); setEntryType("renta"); setEntryAmount(String(getAutoAmount(driver, "renta"))); }}>
                + Evidentiraj uplatu
              </Button>
            ) : (
              <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Nova uplata</p>
                <Select value={entryType} onValueChange={handleTypeChange}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {ULAZ_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input type="number" placeholder="Iznos RSD" className="h-8 text-sm"
                  value={entryAmount} onChange={e => setEntryAmount(e.target.value)}/>
                <p className="text-xs text-muted-foreground">Označi status <span className="text-destructive">*</span></p>
                <div className="grid grid-cols-2 gap-2">
                  <button disabled={!entryAmount || !by || saving} onClick={() => handleSaveEntry("izmireno")}
                    className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all disabled:opacity-40 hover:bg-green-50 hover:border-green-400 hover:text-green-700 border-gray-200">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 text-green-600"/>}Izmireno
                  </button>
                  <button disabled={!entryAmount || !by || saving} onClick={() => handleSaveEntry("neizmireno")}
                    className="flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all disabled:opacity-40 hover:bg-red-50 hover:border-red-400 hover:text-red-700 border-gray-200">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4 text-red-500"/>}Neizmireno
                  </button>
                </div>
                <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={() => setAddOpen(false)}>Otkazi</Button>
              </div>
            )
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ĆELIJA ──────────────────────────────────────────────────
function Cell({ status, isSun, sunFree, sundayStatus, totalAmount, onClick }: {
  status: DayStatus; isSun: boolean; sunFree: boolean; sundayStatus: SundayStatus; totalAmount: number; onClick: () => void;
}) {
  const bg =
    isSun && sunFree                    ? "bg-green-50 border-green-200 hover:bg-green-100" :
    isSun && sundayStatus === "slobodan"? "bg-gray-100 border-gray-200 hover:bg-gray-200" :
    isSun && sundayStatus === "radi"    ? "bg-blue-50 border-blue-200 hover:bg-blue-100" :
    isSun                              ? "bg-gray-50 border-gray-100 hover:bg-gray-100" :
    status === "izmireno"              ? "bg-green-100 border-green-300 hover:bg-green-200" :
    status === "neizmireno"            ? "bg-red-100 border-red-300 hover:bg-red-200" :
                                         "bg-white border-gray-100 hover:bg-muted/40";

  return (
    <td onClick={onClick} className={`border p-0.5 transition-all cursor-pointer min-w-[44px] w-11 ${bg}`}>
      <div className="flex flex-col items-center justify-center h-9 gap-0.5">
        {isSun && sunFree                          && <span className="text-green-500 text-xs">✓</span>}
        {isSun && sundayStatus === "slobodan"      && <Coffee className="h-3 w-3 text-gray-400"/>}
        {isSun && sundayStatus === "radi"          && <Check className="h-3 w-3 text-blue-500"/>}
        {isSun && !sunFree && !sundayStatus        && <span className="text-gray-300 text-xs">·</span>}
        {!isSun && status === "izmireno"           && <Check className="h-3 w-3 text-green-600"/>}
        {!isSun && status === "neizmireno"         && <X     className="h-3 w-3 text-red-500"/>}
        {totalAmount > 0 && (
          <span className="font-semibold text-primary leading-none" style={{ fontSize:"9px" }}>
            {totalAmount >= 1000 ? `${(totalAmount/1000).toFixed(1)}k` : totalAmount}
          </span>
        )}
      </div>
    </td>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const CalendarPage = () => {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [modalOpen, setModalOpen]   = useState(false);
  const [modalDriver, setModalDriver] = useState<any>(null);
  const [modalDate, setModalDate]   = useState("");

  const { drivers, loading: loadingDrivers } = useDrivers();
  const cal = useCalendar(year, month);

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driver: any, date: string) => {
    setModalDriver(driver); setModalDate(date); setModalOpen(true);
  };

  const getDriverSummary = (driverId: string) => {
    const summary = cal.getDriverMonthSummary(driverId);
    const driver  = drivers.find(d => d.id === driverId);
    const neizmDays = cal.entries.filter((e: any) => e.driver_id === driverId && e.status === "neizmireno");
    const duguje = neizmDays.reduce((s: number) => s + (driver?.daily_rate ?? 0), 0);
    return { ...summary, duguje };
  };

  if (loadingDrivers || cal.loading) return (
    <div className="flex items-center justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary"/></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar</h1>
          <p className="text-muted-foreground text-sm">Klikni na dan za detalje i unos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-display font-bold text-lg min-w-[180px] text-center">{MONTHS_SR[month-1]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}>Danas</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-100 border border-green-300 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-green-600"/></div><span className="text-muted-foreground">Izmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-red-100 border border-red-300 flex items-center justify-center"><X className="h-2.5 w-2.5 text-red-500"/></div><span className="text-muted-foreground">Neizmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-50 border border-green-200 flex items-center justify-center"><span className="text-green-500 text-xs">✓</span></div><span className="text-muted-foreground">Ned. besplatna</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-blue-50 border border-blue-200 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-blue-500"/></div><span className="text-muted-foreground">Ned. radi</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-gray-100 border border-gray-200 flex items-center justify-center"><Coffee className="h-2.5 w-2.5 text-gray-400"/></div><span className="text-muted-foreground">Ned. slobodan</span></div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[150px]">Vozač</th>
              {days.map(day => {
                const dow     = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isTod   = dateStr === today.toISOString().split("T")[0];
                const isSun   = dow === 0;
                const isOb    = dow === 1 || dow === 3 || dow === 5;
                return (
                  <th key={day} className={`border px-0.5 py-1.5 text-center min-w-[44px] w-11 ${isTod ? "bg-primary/10 text-primary" : isSun ? "bg-gray-100 text-gray-500" : isOb ? "bg-green-50/70 text-green-700" : "bg-muted/40 text-muted-foreground"}`}>
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-60">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[130px]">Sumarno</th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const summary = getDriverSummary(driver.id);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[150px]">
                    <p className="font-semibold text-sm">{driver.full_name}</p>
                    <p className="text-xs text-muted-foreground">{driver.driver_type === "renta" ? "Renta" : "Vlastito"}</p>
                  </td>
                  {days.map(day => {
                    const dow       = getDow(year, month, day);
                    const dateStr   = getDateStr(year, month, day);
                    const isSun     = dow === 0;
                    const sunFree   = isSun ? isSundayFree(cal.getStatus, driver.id, dateStr) : false;
                    const dayAmounts = cal.getAmounts(driver.id, dateStr);
                    const totalAmount = dayAmounts.reduce((s: number, e: any) => s + e.amount, 0);
                    return (
                      <Cell key={day}
                        status={cal.getStatus(driver.id, dateStr)}
                        isSun={isSun} sunFree={sunFree}
                        sundayStatus={cal.getSundayStatus(driver.id, dateStr)}
                        totalAmount={totalAmount}
                        onClick={() => handleCellClick(driver, dateStr)}
                      />
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-right min-w-[130px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Uplaćeno:</span>
                        <span className="text-green-600 font-bold">{fmt(summary.uplaceno)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Duguje:</span>
                        <span className={`font-bold ${summary.duguje > 0 ? "text-red-500" : "text-green-600"}`}>
                          {summary.duguje > 0 ? fmt(summary.duguje) : "—"}
                        </span>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        driver={modalDriver} date={modalDate} cal={cal}
      />
    </div>
  );
};

export default CalendarPage;
