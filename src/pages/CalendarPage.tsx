import { useState } from "react";
import { drivers, cashEntries, CashEntry, CashType, CASH_TYPE_CONFIG, getDriverById } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function getDow(y: number, m: number, d: number) { return new Date(y, m-1, d).getDay(); }
function isSunday(dow: number) { return dow === 0; }
function isObracun(dow: number) { return dow === 1 || dow === 3 || dow === 5; }

const ULAZ_TYPES: CashType[] = ["renta","clanarina","pos_naknada","komunalni","doprinosi","dugovanje"];

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driverId, date, entries, onCheck }: {
  open: boolean; onClose: () => void;
  driverId: string; date: string; entries: CashEntry[];
  onCheck: (date: string, driverId: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<CashType>("renta");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [by, setBy]               = useState("");

  const driver = getDriverById(driverId);
  const dow    = new Date(date + "T00:00:00").getDay();
  const allDone = entries.length > 0 && entries.every(e => e.received_by);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver?.full_name}</DialogTitle>
          <DialogDescription>
            {DAYS_SR[dow]}, {date}
            {isObracun(dow) && (
              <span className="ml-2 text-xs text-green-600 font-medium">· Obračunski dan</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} className="h-8 text-sm" />
          </div>
          <Separator />

          {entries.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-2">Nema unosa za ovaj dan</p>
          ) : (
            <AnimatePresence>
              {entries.map(e => {
                const cfg = CASH_TYPE_CONFIG[e.type];
                return (
                  <motion.div key={e.id} layout initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                    className={`rounded-lg border p-3 ${cfg.bg}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{e.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-sm font-bold ${e.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                          {e.direction === "in" ? "+" : "−"}{fmt(e.amount)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <Check className="h-3.5 w-3.5"/>{e.received_by}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {/* Čekiranje dana */}
          {entries.length > 0 && (
            <button
              onClick={() => { onCheck(date, driverId); toast.success("Dan označen kao izmiren"); onClose(); }}
              className={`w-full flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                allDone ? "bg-green-100 border-green-400 text-green-700" : "bg-white border-gray-300 hover:bg-green-50 hover:border-green-400 hover:text-green-700"
              }`}>
              <Check className="h-4 w-4"/>
              {allDone ? "Izmireno ✓" : "Označi kao izmireno"}
            </button>
          )}

          {/* Dodaj unos */}
          {!addOpen ? (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1"/>Dodaj unos za ovaj dan
            </Button>
          ) : (
            <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
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
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ĆELIJA ───────────────────────────────────────────────────
function Cell({ driverId, date, dow, checked, onCellClick }: {
  driverId: string; date: string; dow: number; checked: boolean;
  onCellClick: (d: string, dt: string, ev: CashEntry[]) => void;
}) {
  const isSun     = isSunday(dow);
  const entries   = cashEntries.filter(e => e.driver_id === driverId && e.date === date);
  const hasEntries = entries.length > 0;

  if (isSun) return (
    <td className="border border-gray-100 bg-gray-50/60 text-center text-gray-300 text-xs py-2 px-1 min-w-[44px]">—</td>
  );

  return (
    <td
      onClick={() => onCellClick(driverId, date, entries)}
      className={`border p-1 transition-all cursor-pointer hover:opacity-80 min-w-[44px] w-11 ${
        checked    ? "bg-green-100 border-green-300" :
        hasEntries ? "bg-blue-50 border-blue-200" :
                     "bg-white border-gray-100 hover:bg-muted/30"
      }`}>
      <div className="flex flex-col items-center justify-center gap-0.5 h-8">
        {checked ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : hasEntries ? (
          <>
            <div className="flex gap-0.5">
              {entries.slice(0,3).map(e => (
                <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${CASH_TYPE_CONFIG[e.type].color.replace("text-","bg-").replace("-700","-500")}`} />
              ))}
            </div>
            <X className="h-3 w-3 text-blue-400" />
          </>
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

  // Čekirani dani: key = "driverId_date"
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const [modalOpen, setModalOpen]       = useState(false);
  const [modalDriver, setModalDriver]   = useState("");
  const [modalDate, setModalDate]       = useState("");
  const [modalEntries, setModalEntries] = useState<CashEntry[]>([]);

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driverId: string, date: string, entries: CashEntry[]) => {
    setModalDriver(driverId); setModalDate(date); setModalEntries(entries); setModalOpen(true);
  };

  const handleCheck = (date: string, driverId: string) => {
    setChecked(prev => ({ ...prev, [`${driverId}_${date}`]: true }));
  };

  const getMonthTotal = (driverId: string) => {
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
          <p className="text-muted-foreground text-sm">Klikni na dan da vidiš detalje i čekiraš izmireno</p>
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
        <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-green-500"/><span className="text-muted-foreground">Izmireno</span></div>
        <div className="flex items-center gap-1.5"><X className="h-3 w-3 text-blue-400"/><span className="text-muted-foreground">Ima unos — nije čekirano</span></div>
        <div className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-gray-100 inline-block"/><span className="text-muted-foreground">Nedjelja</span></div>
      </div>

      {/* TABELA — vozači u redovima, dani u kolonama */}
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
                const isOb    = isObracun(dow);
                const isTod   = dateStr === today.toISOString().split("T")[0];
                return (
                  <th key={day} className={`border px-1 py-1.5 text-center min-w-[44px] w-11 ${
                    isSun  ? "bg-gray-100 text-gray-400" :
                    isTod  ? "bg-primary/10 text-primary" :
                    isOb   ? "bg-green-50/80 text-green-700" :
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
            {activeDrivers.map(driver => (
              <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[144px]">
                  <p className="font-semibold text-sm leading-none">{driver.full_name.split(" ")[0]}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{driver.full_name.split(" ")[1]}</p>
                </td>
                {days.map(day => {
                  const dow     = getDow(year, month, day);
                  const dateStr = getDateStr(year, month, day);
                  const key     = `${driver.id}_${dateStr}`;
                  return (
                    <Cell key={day}
                      driverId={driver.id}
                      date={dateStr}
                      dow={dow}
                      checked={!!checked[key]}
                      onCellClick={handleCellClick}
                    />
                  );
                })}
                <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-center min-w-[110px]">
                  <p className="text-sm font-bold text-green-600">{fmt(getMonthTotal(driver.id))}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        driverId={modalDriver} date={modalDate} entries={modalEntries}
        onCheck={handleCheck}
      />
    </div>
  );
};

export default CalendarPage;
