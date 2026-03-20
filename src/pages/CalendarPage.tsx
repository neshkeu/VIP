import { useState } from "react";
import { drivers, getDriverById, Driver } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, X, Coffee } from "lucide-react";
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

// Nedjelja je besplatna ako su svi pon-sub te sedmice izmireni
function isSundayFree(statuses: Record<string, DayStatus>, driverId: string, sundayDate: string): boolean {
  if (!sundayDate || !driverId) return false;
  const sun = new Date(sundayDate + "T00:00:00");
  if (isNaN(sun.getTime())) return false;
  for (let i = 1; i <= 6; i++) {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    if (statuses[`${driverId}_${d.toISOString().split("T")[0]}`] !== "izmireno") return false;
  }
  return true;
}

// Automatski iznos za vozača za taj tip
function getAutoAmount(driver: Driver, type: string): number {
  if (type === "renta")     return driver.daily_rate;
  if (type === "clanarina") return driver.driver_type === "renta" ? driver.weekly_membership : driver.weekly_membership_own;
  if (type === "pos_naknada") return driver.pos_monthly_fee;
  if (type === "komunalni") return driver.komunalni_monthly;
  if (type === "doprinosi") return driver.doprinosi_monthly;
  return 0;
}

const ULAZ_TYPES = [
  { value: "renta",      label: "Renta" },
  { value: "clanarina",  label: "Članarina" },
  { value: "pos_naknada",label: "POS naknada" },
  { value: "komunalni",  label: "Komunalni" },
  { value: "doprinosi",  label: "Doprinosi" },
];

const MOCK_STATUS: Record<string, DayStatus> = {
  "d1_2026-03-10": "izmireno",
  "d1_2026-03-11": "neizmireno",
  "d1_2026-03-12": "izmireno",
  "d2_2026-03-10": "izmireno",
  "d2_2026-03-11": "izmireno",
  "d2_2026-03-12": "neizmireno",
  "d3_2026-03-10": "neizmireno",
  "d3_2026-03-12": "izmireno",
  "d4_2026-03-10": "izmireno",
  "d4_2026-03-11": "neizmireno",
  "d5_2026-03-10": "izmireno",
  "d5_2026-03-11": "izmireno",
  "d5_2026-03-12": "izmireno",
};

// Mock iznosi evidentirani po danu
const MOCK_AMOUNTS: Record<string, { type: string; amount: number; by: string }[]> = {
  "d1_2026-03-10": [{ type: "renta", amount: 3500, by: "Nemanja" }],
  "d2_2026-03-10": [{ type: "renta", amount: 3000, by: "Admin" }],
  "d3_2026-03-12": [{ type: "renta", amount: 4000, by: "Milica" }, { type: "clanarina", amount: 800, by: "Milica" }],
  "d5_2026-03-10": [{ type: "renta", amount: 3200, by: "Milica" }],
};

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driverId, date, status, sundayStatus, sundayFree, entries, onSave, onSaveEntry, onSundaySave }: {
  open: boolean; onClose: () => void;
  driverId: string; date: string;
  status: DayStatus; sundayStatus: SundayStatus; sundayFree: boolean;
  entries: { type: string; amount: number; by: string }[];
  onSave: (driverId: string, date: string, status: DayStatus, by: string) => void;
  onSaveEntry: (driverId: string, date: string, entry: { type: string; amount: number; by: string }) => void;
  onSundaySave: (driverId: string, date: string, status: SundayStatus) => void;
}) {
  const [by, setBy]           = useState("");
  const [entryType, setEntryType] = useState("renta");
  const [entryAmount, setEntryAmount] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  const driver = getDriverById(driverId);
  const dow    = date ? new Date(date + "T00:00:00").getDay() : 0;
  const isSun  = dow === 0;

  // Kad se mijenja tip — auto popuni iznos sa kartice vozača
  const handleTypeChange = (type: string) => {
    setEntryType(type);
    if (driver) {
      const auto = getAutoAmount(driver, type);
      if (auto > 0) setEntryAmount(String(auto));
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { setAddOpen(false); setBy(""); setEntryAmount(""); } onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{driver?.full_name}</DialogTitle>
          <DialogDescription>{DAYS_SR[dow]}, {date}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">

          {/* NEDJELJA */}
          {isSun && (
            <div className={`rounded-lg border p-3 space-y-3 ${
              sundayFree ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
            }`}>
              <p className="text-sm font-medium text-center">
                {sundayFree ? "🎉 Nedjelja besplatna — radio sve dane pon–sub" : "Nedjelja — evidentiraj prisustvo"}
              </p>
              {!sundayFree && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => { onSundaySave(driverId, date, "radi"); toast.success("Evidentiran rad u nedjelju"); onClose(); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${
                      sundayStatus === "radi" ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted border-gray-200"
                    }`}>
                    <Check className="h-4 w-4" />Radi
                  </button>
                  <button onClick={() => { onSundaySave(driverId, date, "slobodan"); toast.success("Evidentiran slobodan dan"); onClose(); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border py-2 text-sm font-medium transition-all ${
                      sundayStatus === "slobodan" ? "bg-gray-200 text-gray-700 border-gray-400" : "hover:bg-muted border-gray-200"
                    }`}>
                    <Coffee className="h-4 w-4" />Slobodan
                  </button>
                </div>
              )}
            </div>
          )}

          {/* RADNI DAN — status izmireno/neizmireno */}
          {!isSun && (
            <div className={`rounded-lg border p-3 text-center ${
              status === "izmireno"   ? "bg-green-50 border-green-300" :
              status === "neizmireno" ? "bg-red-50 border-red-300" :
                                        "bg-gray-50 border-gray-200"
            }`}>
              <p className="text-sm font-semibold">
                {status === "izmireno"   ? "✓ Izmireno" :
                 status === "neizmireno" ? "✗ Neizmireno" : "— Nije evidentirano"}
              </p>
            </div>
          )}

          {/* Evidentirani iznosi */}
          {entries.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Evidentirano</p>
              {entries.map((e, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                  <span className="text-muted-foreground">{ULAZ_TYPES.find(t => t.value === e.type)?.label ?? e.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-green-600">{fmt(e.amount)}</span>
                    <span className="text-xs text-muted-foreground">— {e.by}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Separator />

          {/* Ko evidentira */}
          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} className="h-9" />
          </div>

          {/* Označi izmireno/neizmireno — samo radni dani */}
          {!isSun && (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => {
                if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                onSave(driverId, date, "izmireno", by);
                toast.success(`Izmireno — ${by}`); onClose();
              }} className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                status === "izmireno" ? "bg-green-100 border-green-500 text-green-700" : "hover:bg-green-50 hover:border-green-400 hover:text-green-700 border-gray-200"
              }`}>
                <Check className="h-4 w-4" />Izmireno
              </button>
              <button onClick={() => {
                if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                onSave(driverId, date, "neizmireno", by);
                toast.success(`Neizmireno — ${by}`); onClose();
              }} className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                status === "neizmireno" ? "bg-red-100 border-red-500 text-red-700" : "hover:bg-red-50 hover:border-red-400 hover:text-red-700 border-gray-200"
              }`}>
                <X className="h-4 w-4" />Neizmireno
              </button>
            </div>
          )}

          {/* Dodaj iznos */}
          {!addOpen ? (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs"
              onClick={() => {
                setAddOpen(true);
                setEntryType("renta");
                if (driver) setEntryAmount(String(getAutoAmount(driver, "renta")));
              }}>
              + Evidentiraj iznos
            </Button>
          ) : (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Novi unos</p>
              <Select value={entryType} onValueChange={handleTypeChange}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ULAZ_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input type="number" placeholder="Iznos RSD" className="h-8 text-sm flex-1"
                  value={entryAmount} onChange={e => setEntryAmount(e.target.value)} />
                <Button size="sm" className="h-8 text-xs"
                  disabled={!entryAmount || !by}
                  onClick={() => {
                    if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                    onSaveEntry(driverId, date, { type: entryType, amount: Number(entryAmount), by });
                    toast.success(`Evidentirano: ${fmt(Number(entryAmount))}`);
                    setAddOpen(false); setEntryAmount("");
                  }}>Sačuvaj</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddOpen(false)}>✕</Button>
              </div>
            </div>
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
  status: DayStatus; isSun: boolean; sunFree: boolean;
  sundayStatus: SundayStatus; totalAmount: number; onClick: () => void;
}) {
  const bg =
    isSun && sunFree              ? "bg-green-50 border-green-200 hover:bg-green-100" :
    isSun && sundayStatus === "slobodan" ? "bg-gray-100 border-gray-200 hover:bg-gray-200" :
    isSun && sundayStatus === "radi"     ? "bg-blue-50 border-blue-200 hover:bg-blue-100" :
    isSun                         ? "bg-gray-50 border-gray-100 hover:bg-gray-100" :
    status === "izmireno"         ? "bg-green-100 border-green-300 hover:bg-green-200" :
    status === "neizmireno"       ? "bg-red-100 border-red-300 hover:bg-red-200" :
                                    "bg-white border-gray-100 hover:bg-muted/40";

  return (
    <td onClick={onClick} className={`border p-0.5 transition-all cursor-pointer min-w-[44px] w-11 ${bg}`}>
      <div className="flex flex-col items-center justify-center h-9 gap-0.5">
        {/* Ikona statusa */}
        {isSun && sunFree                          && <span className="text-green-500 text-xs">✓</span>}
        {isSun && sundayStatus === "slobodan"      && <Coffee className="h-3 w-3 text-gray-400" />}
        {isSun && sundayStatus === "radi"          && <Check className="h-3 w-3 text-blue-500" />}
        {isSun && !sunFree && !sundayStatus        && <span className="text-gray-300 text-xs">·</span>}
        {!isSun && status === "izmireno"           && <Check className="h-3 w-3 text-green-600" />}
        {!isSun && status === "neizmireno"         && <X     className="h-3 w-3 text-red-500"   />}
        {/* Iznos */}
        {totalAmount > 0 && (
          <span className="text-xs font-semibold text-primary leading-none" style={{ fontSize: "9px" }}>
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
  const [year, setYear]   = useState(2026);
  const [month, setMonth] = useState(3);
  const [statuses, setStatuses]         = useState<Record<string, DayStatus>>(MOCK_STATUS);
  const [sundayStatuses, setSundayStatuses] = useState<Record<string, SundayStatus>>({});
  const [amounts, setAmounts]           = useState<Record<string, { type: string; amount: number; by: string }[]>>(MOCK_AMOUNTS);

  const [modalOpen, setModalOpen]     = useState(false);
  const [modalDriver, setModalDriver] = useState("");
  const [modalDate, setModalDate]     = useState("");

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driverId: string, date: string) => {
    setModalDriver(driverId); setModalDate(date); setModalOpen(true);
  };

  const handleSave = (driverId: string, date: string, status: DayStatus) => {
    setStatuses(prev => ({ ...prev, [`${driverId}_${date}`]: status }));
  };

  const handleSaveEntry = (driverId: string, date: string, entry: { type: string; amount: number; by: string }) => {
    const key = `${driverId}_${date}`;
    setAmounts(prev => ({ ...prev, [key]: [...(prev[key] ?? []), entry] }));
  };

  const handleSundaySave = (driverId: string, date: string, status: SundayStatus) => {
    setSundayStatuses(prev => ({ ...prev, [`${driverId}_${date}`]: status }));
  };

  const getDriverStats = (driverId: string) => {
    const prefix = `${year}-${String(month).padStart(2,"0")}`;
    const keys   = Object.keys(statuses).filter(k => k.startsWith(`${driverId}_${prefix}`));
    const izm    = keys.filter(k => statuses[k] === "izmireno").length;
    const neizm  = keys.filter(k => statuses[k] === "neizmireno").length;

    // Ukupno evidentirano (uplaćeno)
    const uplaceno = Object.entries(amounts)
      .filter(([k]) => k.startsWith(`${driverId}_${prefix}`))
      .reduce((s, [, entries]) => s + entries.reduce((ss, e) => ss + e.amount, 0), 0);

    // Ukupno duguje — broj dana × dnevna renta (samo izmireni dani se računaju kao zaduženi)
    const driver = getDriverById(driverId);
    const duguje = keys
      .filter(k => statuses[k] === "neizmireno")
      .reduce((s, k) => {
        const date = k.split("_")[1];
        const dow  = new Date(date + "T00:00:00").getDay();
        if (dow === 0) return s; // nedjelja se posebno računa
        return s + (driver?.daily_rate ?? 0);
      }, 0);

    return { izm, neizm, uplaceno, duguje };
  };

  const modalDow     = modalDate ? new Date(modalDate + "T00:00:00").getDay() : 0;
  const modalSunFree = modalDow === 0 ? isSundayFree(statuses, modalDriver, modalDate) : false;

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

      {/* LEGENDA */}
      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-100 border border-green-300 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-green-600"/></div><span className="text-muted-foreground">Izmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-red-100 border border-red-300 flex items-center justify-center"><X className="h-2.5 w-2.5 text-red-500"/></div><span className="text-muted-foreground">Neizmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-50 border border-green-200 flex items-center justify-center"><span className="text-green-500 text-xs">✓</span></div><span className="text-muted-foreground">Ned. besplatna</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-blue-50 border border-blue-200 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-blue-500"/></div><span className="text-muted-foreground">Ned. radi</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-gray-100 border border-gray-200 flex items-center justify-center"><Coffee className="h-2.5 w-2.5 text-gray-400"/></div><span className="text-muted-foreground">Ned. slobodan</span></div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[150px]">
                Vozač
              </th>
              {days.map(day => {
                const dow     = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isTod   = dateStr === today.toISOString().split("T")[0];
                const isSun   = dow === 0;
                const isOb    = dow === 1 || dow === 3 || dow === 5;
                return (
                  <th key={day} className={`border px-0.5 py-1.5 text-center min-w-[44px] w-11 ${
                    isTod ? "bg-primary/10 text-primary" :
                    isSun ? "bg-gray-100 text-gray-500" :
                    isOb  ? "bg-green-50/70 text-green-700" :
                            "bg-muted/40 text-muted-foreground"
                  }`}>
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-60">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[130px]">
                Sumarno
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const stats = getDriverStats(driver.id);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[150px]">
                    <p className="font-semibold text-sm">{driver.full_name}</p>
                    <p className="text-xs text-muted-foreground">{driver.driver_type === "renta" ? "Renta" : "Vlastito"}</p>
                  </td>
                  {days.map(day => {
                    const dow     = getDow(year, month, day);
                    const dateStr = getDateStr(year, month, day);
                    const key     = `${driver.id}_${dateStr}`;
                    const isSun   = dow === 0;
                    const sunFree = isSun ? isSundayFree(statuses, driver.id, dateStr) : false;
                    const dayAmounts = amounts[key] ?? [];
                    const totalAmount = dayAmounts.reduce((s, e) => s + e.amount, 0);
                    return (
                      <Cell key={day}
                        status={statuses[key] ?? null}
                        isSun={isSun}
                        sunFree={sunFree}
                        sundayStatus={sundayStatuses[key] ?? null}
                        totalAmount={totalAmount}
                        onClick={() => handleCellClick(driver.id, dateStr)}
                      />
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-right min-w-[130px]">
                    <div className="space-y-0.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Uplaćeno:</span>
                        <span className="text-green-600 font-bold">{fmt(stats.uplaceno)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Duguje:</span>
                        <span className={`font-bold ${stats.duguje > 0 ? "text-red-500" : "text-green-600"}`}>
                          {stats.duguje > 0 ? fmt(stats.duguje) : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs border-t pt-0.5 mt-0.5">
                        <span className="text-muted-foreground">Dana:</span>
                        <span className="text-xs">
                          <span className="text-green-600 font-semibold">{stats.izm}✓</span>
                          {" "}<span className="text-red-500 font-semibold">{stats.neizm}✗</span>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        driverId={modalDriver}
        date={modalDate}
        status={statuses[`${modalDriver}_${modalDate}`] ?? null}
        sundayStatus={sundayStatuses[`${modalDriver}_${modalDate}`] ?? null}
        sundayFree={modalSunFree}
        entries={amounts[`${modalDriver}_${modalDate}`] ?? []}
        onSave={handleSave}
        onSaveEntry={handleSaveEntry}
        onSundaySave={handleSundaySave}
      />
    </div>
  );
};

export default CalendarPage;
