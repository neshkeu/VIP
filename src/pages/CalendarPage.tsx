import { useState } from "react";
import { drivers, cashEntries, CashEntry, CashType, CASH_TYPE_CONFIG, getDriverById } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ─────────────────────────────────────────────────
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function getDow(y: number, m: number, d: number) { return new Date(y, m-1, d).getDay(); }
function isObracunDay(dow: number) { return dow === 1 || dow === 3 || dow === 5; }
function isSunday(dow: number) { return dow === 0; }

// Ulazni tipovi koji se prikazuju na kalendaru (obaveze vozača)
const ULAZ_TYPES: CashType[] = ["renta","clanarina","pos_naknada","komunalni","doprinosi"];

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driverId, date, entries }: {
  open: boolean; onClose: () => void;
  driverId: string; date: string; entries: CashEntry[];
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<CashType>("renta");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [by, setBy] = useState("");

  const driver = getDriverById(driverId);
  const dow = new Date(date + "T00:00:00").getDay();
  const isObracun = isObracunDay(dow);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver?.full_name}</DialogTitle>
          <DialogDescription>
            {DAYS_SR[dow]}, {date}
            {isObracun && <Badge variant="outline" className="ml-2 text-xs text-green-700 border-green-300">Obračunski dan</Badge>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} className="h-8 text-sm" />
          </div>
          <Separator />

          {entries.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-2">Nema unosa za ovaj dan</p>
          )}

          <AnimatePresence>
            {entries.map(ev => {
              const cfg = CASH_TYPE_CONFIG[ev.type];
              return (
                <motion.div key={ev.id} layout initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                  className={`rounded-lg border p-3 ${cfg.bg}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-xs text-muted-foreground">{ev.description}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-sm font-bold ${ev.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                        {ev.direction === "in" ? "+" : "−"}{fmt(ev.amount)}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <Check className="h-3.5 w-3.5"/>{ev.received_by}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!addOpen
            ? <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="h-3 w-3 mr-1"/>Dodaj unos za ovaj dan
              </Button>
            : <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Novi unos</p>
                <Select value={newType} onValueChange={v => setNewType(v as CashType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ULAZ_TYPES.map(t => (
                      <SelectItem key={t} value={t}>{CASH_TYPE_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Iznos RSD" className="h-8 text-sm" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                  <Input placeholder="Opis" className="h-8 text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs" disabled={!newAmount || !by}
                    onClick={() => {
                      toast.success(`Dodano: ${CASH_TYPE_CONFIG[newType].label} — ${fmt(Number(newAmount))}`);
                      setAddOpen(false); setNewAmount(""); setNewDesc("");
                    }}>Sačuvaj</Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddOpen(false)}>Otkazi</Button>
                </div>
              </motion.div>
          }
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ĆELIJA ───────────────────────────────────────────────────
function Cell({ driverId, date, dow, onCellClick }: {
  driverId: string; date: string; dow: number;
  onCellClick: (d: string, dt: string, ev: CashEntry[]) => void;
}) {
  const isSun     = isSunday(dow);
  const isObracun = isObracunDay(dow);

  // Unosi za ovog vozača na ovaj datum
  const entries = cashEntries.filter(e => e.driver_id === driverId && e.date === date);
  const hasEntries = entries.length > 0;

  if (isSun) return (
    <td className="border border-gray-100 bg-gray-50/60 text-center text-gray-300 text-xs py-2 px-1 min-w-[44px]">—</td>
  );

  // Boja ćelije
  const bg = hasEntries
    ? "bg-green-50 border-green-200 cursor-pointer hover:bg-green-100"
    : isObracun
      ? "bg-amber-50/60 border-amber-100 cursor-pointer hover:bg-amber-100"
      : "bg-white border-gray-100 cursor-pointer hover:bg-muted/40";

  return (
    <td className={`border p-1 transition-colors min-w-[44px] w-11 ${bg}`}
      onClick={() => onCellClick(driverId, date, entries)}>
      <div className="flex flex-col items-center justify-center gap-0.5 h-8">
        {hasEntries ? (
          <>
            <Check className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-700 font-semibold leading-none">
              {entries.length}
            </span>
          </>
        ) : isObracun ? (
          <X className="h-3 w-3 text-amber-400" />
        ) : (
          <span className="text-gray-200 text-xs">·</span>
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
  const [modalOpen, setModalOpen]     = useState(false);
  const [modalDriver, setModalDriver] = useState("");
  const [modalDate, setModalDate]     = useState("");
  const [modalEntries, setModalEntries] = useState<CashEntry[]>([]);

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driverId: string, date: string, entries: CashEntry[]) => {
    setModalDriver(driverId); setModalDate(date); setModalEntries(entries); setModalOpen(true);
  };

  // Sumarno po vozaču za mjesec
  const getDriverMonthTotal = (driverId: string) => {
    const prefix = `${year}-${String(month).padStart(2,"0")}`;
    return cashEntries
      .filter(e => e.driver_id === driverId && e.date.startsWith(prefix) && e.direction === "in")
      .reduce((s,e) => s+e.amount, 0);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar</h1>
          <p className="text-muted-foreground text-sm">Pregled uplata po vozačima · obračun pon/sri/pet</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-display font-bold text-lg min-w-[180px] text-center">{MONTHS_SR[month-1]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}>Danas</Button>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500"/><span className="text-muted-foreground">Evidentirano</span></div>
        <div className="flex items-center gap-1.5"><X className="h-3 w-3 text-amber-400"/><span className="text-muted-foreground">Obračunski dan — nema unosa</span></div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-100 inline-block"/><span className="text-muted-foreground">Nedjelja</span></div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-36 min-w-[144px]">
                Vozač
              </th>
              {days.map(day => {
                const dow     = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isSun   = isSunday(dow);
                const isOb    = isObracunDay(dow);
                const isTod   = dateStr === today.toISOString().split("T")[0];
                return (
                  <th key={day} className={`border px-1 py-1.5 text-center min-w-[44px] w-11 ${
                    isSun  ? "bg-gray-100 text-gray-400" :
                    isTod  ? "bg-primary/10 text-primary" :
                    isOb   ? "bg-green-50 text-green-700" :
                             "bg-muted/40 text-muted-foreground"
                  }`}>
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-70">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[110px]">
                Ukupno
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const monthTotal = getDriverMonthTotal(driver.id);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[144px]">
                    <p className="font-semibold text-sm leading-none">{driver.full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{driver.full_name.split(" ")[1]}</p>
                  </td>
                  {days.map(day => (
                    <Cell key={day}
                      driverId={driver.id}
                      date={getDateStr(year, month, day)}
                      dow={getDow(year, month, day)}
                      onCellClick={handleCellClick}
                    />
                  ))}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-center min-w-[110px]">
                    <p className="text-sm font-bold text-green-600">{fmt(monthTotal)}</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        driverId={modalDriver} date={modalDate} entries={modalEntries}
      />
    </div>
  );
};

export default CalendarPage;
