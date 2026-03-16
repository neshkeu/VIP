import { useState } from "react";
import {
  drivers, calendarEvents, CalendarEvent, CalendarEventType,
  getEventsForDateAndDriver, getDriverMonthSummary,
  EVENT_TYPE_CONFIG, getDriverById,
} from "@/data/mockData";
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
function isRentDay(dow: number) { return dow === 1 || dow === 3 || dow === 5; }
function isSunday(dow: number)  { return dow === 0; }

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driverId, date, events }: {
  open: boolean; onClose: () => void;
  driverId: string; date: string; events: CalendarEvent[];
}) {
  const [addOpen, setAddOpen]     = useState(false);
  const [newType, setNewType]     = useState<CalendarEventType>("rent");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc]     = useState("");
  const [by, setBy]               = useState("");

  const driver = getDriverById(driverId);
  const dow    = new Date(date + "T00:00:00").getDay();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{driver?.full_name}</DialogTitle>
          <DialogDescription>
            {DAYS_SR[dow]}, {date} · {events.length} obaveza
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} className="h-8 text-sm" />
          </div>
          <Separator />

          {events.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-2">Nema obaveza za ovaj dan</p>
          )}

          <AnimatePresence>
            {events.map(ev => {
              const cfg = EVENT_TYPE_CONFIG[ev.type];
              return (
                <motion.div key={ev.id} layout initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }}
                  className={`rounded-lg border p-3 ${ev.is_done ? cfg.bgDone+" "+cfg.border : "bg-white border-gray-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold">{fmt(ev.amount)}</span>
                      {ev.is_done
                        ? <span className="flex items-center gap-1 text-xs text-green-600"><Check className="h-3.5 w-3.5"/>{ev.done_by}</span>
                        : <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => {
                              if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                              toast.success(`Izmireno — evidentirano: ${by}`);
                            }}>
                            <Check className="h-3 w-3 mr-1"/>Izmiri
                          </Button>
                      }
                    </div>
                  </div>
                  {ev.is_done && ev.done_at && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-4">{ev.done_at} · {ev.done_by}</p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {!addOpen
            ? <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setAddOpen(true)}>
                <Plus className="h-3 w-3 mr-1"/>Dodaj obavezu
              </Button>
            : <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                className="space-y-3 rounded-lg border p-3 bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Nova obaveza</p>
                <Select value={newType} onValueChange={v => setNewType(v as CalendarEventType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[]).map(t => (
                      <SelectItem key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" placeholder="Iznos RSD" className="h-8 text-sm" value={newAmount} onChange={e => setNewAmount(e.target.value)} />
                  <Input placeholder="Opis" className="h-8 text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8 text-xs" disabled={!newAmount}
                    onClick={() => { toast.success("Obaveza dodana"); setAddOpen(false); setNewAmount(""); setNewDesc(""); }}>
                    Sačuvaj
                  </Button>
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

// ─── CELIJA ───────────────────────────────────────────────────
function Cell({ driverId, date, dow, onCellClick }: {
  driverId: string; date: string; dow: number;
  onCellClick: (d: string, dt: string, ev: CalendarEvent[]) => void;
}) {
  const events  = getEventsForDateAndDriver(driverId, date);
  const isSun   = isSunday(dow);

  if (isSun) return (
    <td className="border border-gray-100 bg-gray-50/60 text-center text-gray-300 text-xs py-2 px-1">—</td>
  );

  if (events.length === 0) return (
    <td className="border border-dashed border-gray-200 p-1 hover:bg-muted/40 cursor-pointer transition-colors"
      onClick={() => onCellClick(driverId, date, [])}>
      <div className="h-8 flex items-center justify-center text-gray-300 text-xs">+</div>
    </td>
  );

  const allDone  = events.every(e => e.is_done);
  const noneDone = events.every(e => !e.is_done);

  return (
    <td
      className={`border p-1 cursor-pointer transition-all hover:opacity-80 ${
        allDone  ? "bg-green-50  border-green-200" :
        noneDone ? "bg-red-50   border-red-200" :
                   "bg-amber-50 border-amber-200"
      }`}
      onClick={() => onCellClick(driverId, date, events)}
    >
      <div className="flex flex-col items-center justify-center gap-1 h-8">
        {/* Tačkice */}
        <div className="flex flex-wrap justify-center gap-0.5">
          {events.map(e => (
            <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${e.is_done ? EVENT_TYPE_CONFIG[e.type].dot : "bg-red-400"}`} />
          ))}
        </div>
        {/* Ikona statusa */}
        {allDone  && <Check className="h-3 w-3 text-green-600" />}
        {noneDone && <X     className="h-3 w-3 text-red-400"   />}
        {!allDone && !noneDone && <span className="text-amber-500 text-xs font-bold leading-none">~</span>}
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
  const [modalEvents, setModalEvents] = useState<CalendarEvent[]>([]);

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driverId: string, date: string, events: CalendarEvent[]) => {
    setModalDriver(driverId); setModalDate(date); setModalEvents(events); setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar obaveza</h1>
          <p className="text-muted-foreground text-sm">Vozači × dani — klik na ćeliju za detalje</p>
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
        <div className="flex items-center gap-1.5"><X className="h-3 w-3 text-red-400"/><span className="text-muted-foreground">Neizmireno</span></div>
      </div>

      {/* TABELA — vozaci u REDOVIMA, dani u KOLONAMA */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {/* Gornji lijevi ugao */}
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-36 min-w-[144px]">
                Vozač
              </th>
              {/* Kolone po danima */}
              {days.map(day => {
                const dow     = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isSun   = isSunday(dow);
                const isRent  = isRentDay(dow);
                const isToday = dateStr === today.toISOString().split("T")[0];
                return (
                  <th key={day}
                    className={`border px-1 py-1.5 text-center min-w-[44px] w-11 ${
                      isSun   ? "bg-gray-100 text-gray-400" :
                      isToday ? "bg-primary/10 text-primary" :
                      isRent  ? "bg-green-50 text-green-700" :
                                "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-70">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              {/* Sumarni red */}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[120px]">
                Stanje
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const summary = getDriverMonthSummary(driver.id, year, month);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  {/* Ime vozaca — sticky lijevo */}
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[144px]">
                    <p className="font-semibold text-sm leading-none">{driver.full_name.split(" ")[0]}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{driver.full_name.split(" ")[1]}</p>
                  </td>
                  {/* Celije po danima */}
                  {days.map(day => {
                    const dow     = getDow(year, month, day);
                    const dateStr = getDateStr(year, month, day);
                    return (
                      <Cell key={day} driverId={driver.id} date={dateStr} dow={dow} onCellClick={handleCellClick} />
                    );
                  })}
                  {/* Sumarni desno */}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-center min-w-[120px]">
                    <p className="text-xs text-green-600 font-semibold">{fmt(summary.paid)}</p>
                    {summary.pending > 0 && (
                      <Badge variant="destructive" className="text-xs mt-0.5 h-4 px-1">{fmt(summary.pending)}</Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <DetailModal
        open={modalOpen} onClose={() => setModalOpen(false)}
        driverId={modalDriver} date={modalDate} events={modalEvents}
      />
    </div>
  );
};

export default CalendarPage;
