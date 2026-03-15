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
import { ChevronLeft, ChevronRight, Check, X, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ─────────────────────────────────────────────────
const DAYS_SR = ["Ned", "Pon", "Uto", "Sri", "Čet", "Pet", "Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getDateStr(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function getDayOfWeek(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getDay(); // 0=ned,1=pon,...,6=sub
}

function isRentDay(dow: number) { return dow === 1 || dow === 3 || dow === 5; } // pon, sri, pet
function isSunday(dow: number)  { return dow === 0; }

// ─── CELIJA KALENDARA ────────────────────────────────────────
interface CellProps {
  driverId: string;
  date: string;
  day: number;
  dow: number;
  onCellClick: (driverId: string, date: string, events: CalendarEvent[]) => void;
}

function CalendarCell({ driverId, date, day, dow, onCellClick }: CellProps) {
  const events = getEventsForDateAndDriver(driverId, date);
  const isSun  = isSunday(dow);
  const isRent = isRentDay(dow);

  // Ako nema ni jednog eventa a nedjelja je — prikaži kao slobodno
  if (isSun) {
    return (
      <div className="h-10 flex items-center justify-center text-xs text-gray-300 bg-gray-50/50 border border-gray-100 rounded">
        —
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div
        className={`h-10 flex items-center justify-center rounded border border-dashed cursor-pointer transition-colors hover:bg-muted/60 ${
          isRent ? "border-green-200" : "border-gray-200"
        }`}
        onClick={() => onCellClick(driverId, date, [])}
      >
        <span className="text-xs text-muted-foreground/50">+</span>
      </div>
    );
  }

  const allDone   = events.every(e => e.is_done);
  const someDone  = events.some(e => e.is_done) && !allDone;
  const noneDone  = events.every(e => !e.is_done);

  return (
    <div
      className={`h-10 rounded border cursor-pointer transition-all hover:shadow-sm hover:scale-[1.03] flex flex-col items-center justify-center gap-0.5 px-1 ${
        allDone  ? "bg-green-100 border-green-300" :
        someDone ? "bg-amber-50 border-amber-300" :
                   "bg-red-50 border-red-200"
      }`}
      onClick={() => onCellClick(driverId, date, events)}
    >
      {/* Tačkice po tipu */}
      <div className="flex gap-0.5 flex-wrap justify-center">
        {events.map(e => {
          const cfg = EVENT_TYPE_CONFIG[e.type];
          return (
            <div key={e.id} className={`h-1.5 w-1.5 rounded-full ${e.is_done ? cfg.dot : "bg-red-400"}`} />
          );
        })}
      </div>
      {/* Check ili X */}
      {allDone  && <Check className="h-3 w-3 text-green-600" />}
      {noneDone && events.length > 0 && <X className="h-3 w-3 text-red-400" />}
      {someDone && <div className="text-xs text-amber-600 font-bold leading-none">~</div>}
    </div>
  );
}

// ─── MODAL DETALJI ────────────────────────────────────────────
interface DetailModalProps {
  open: boolean;
  onClose: () => void;
  driverId: string;
  date: string;
  events: CalendarEvent[];
}

function DetailModal({ open, onClose, driverId, date, events }: DetailModalProps) {
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState<CalendarEventType>("rent");
  const [newAmount, setNewAmount] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  const driver = getDriverById(driverId);
  const dow = new Date(date).getDay();
  const dayName = DAYS_SR[dow];

  const handleCheck = (event: CalendarEvent) => {
    if (!receivedBy.trim()) {
      toast.error("Unesite ime osobe koja evidentira!");
      return;
    }
    toast.success(`${EVENT_TYPE_CONFIG[event.type].label} evidentirana — ${receivedBy}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            {driver?.full_name}
          </DialogTitle>
          <DialogDescription>
            {dayName}, {date} — {events.length > 0 ? `${events.length} obaveza` : "nema obaveza"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Ko evidentira */}
          <div className="grid gap-1.5">
            <Label className="text-xs">Evidentira (tvoje ime)</Label>
            <Input
              placeholder="Nemanja, Milica, Admin..."
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
              className="h-8 text-sm"
            />
          </div>

          <Separator />

          {/* Lista obaveza */}
          {events.length === 0 && (
            <p className="text-sm text-center text-muted-foreground py-2">Nema obaveza za ovaj dan</p>
          )}

          <AnimatePresence>
            {events.map(ev => {
              const cfg = EVENT_TYPE_CONFIG[ev.type];
              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-lg border p-3 ${ev.is_done ? cfg.bgDone + " " + cfg.border : "bg-white border-gray-200"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{ev.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-sm font-bold">{fmt(ev.amount)}</span>
                      {ev.is_done ? (
                        <div className="flex items-center gap-1">
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-xs text-muted-foreground">{ev.done_by}</span>
                        </div>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleCheck(ev)}
                        >
                          <Check className="h-3 w-3 mr-1" />Izmiri
                        </Button>
                      )}
                    </div>
                  </div>
                  {ev.is_done && ev.done_at && (
                    <p className="text-xs text-muted-foreground mt-1.5 pl-4">
                      Evidentirano: {ev.done_at} · {ev.done_by}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Dodaj novu obavezu */}
          {!addOpen ? (
            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => setAddOpen(true)}>
              <Plus className="h-3 w-3 mr-1" />Dodaj obavezu za ovaj dan
            </Button>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 rounded-lg border p-3 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nova obaveza</p>
              <div className="grid gap-2">
                <Label className="text-xs">Tip</Label>
                <Select value={newType} onValueChange={v => setNewType(v as CalendarEventType)}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(EVENT_TYPE_CONFIG) as CalendarEventType[]).map(t => (
                      <SelectItem key={t} value={t}>{EVENT_TYPE_CONFIG[t].label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Iznos (RSD)</Label>
                  <Input type="number" className="h-8 text-sm" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="3500" />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-xs">Opis</Label>
                  <Input className="h-8 text-sm" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Napomena..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex-1 h-8 text-xs"
                  disabled={!newAmount}
                  onClick={() => {
                    toast.success(`Dodana obaveza: ${EVENT_TYPE_CONFIG[newType].label}`);
                    setAddOpen(false); setNewAmount(""); setNewDesc("");
                  }}
                >Sačuvaj</Button>
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

// ─── LEGENDA ─────────────────────────────────────────────────
function Legend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {(Object.entries(EVENT_TYPE_CONFIG) as [CalendarEventType, typeof EVENT_TYPE_CONFIG[CalendarEventType]][]).map(([type, cfg]) => (
        <div key={type} className="flex items-center gap-1.5">
          <div className={`h-2.5 w-2.5 rounded-full ${cfg.dot}`} />
          <span className="text-muted-foreground">{cfg.label}</span>
        </div>
      ))}
      <div className="flex items-center gap-1.5">
        <Check className="h-3 w-3 text-green-500" />
        <span className="text-muted-foreground">Izmireno</span>
      </div>
      <div className="flex items-center gap-1.5">
        <X className="h-3 w-3 text-red-400" />
        <span className="text-muted-foreground">Neizmireno</span>
      </div>
    </div>
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

  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const activeDrivers = drivers.filter(d => d.status === "active");

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleCellClick = (driverId: string, date: string, events: CalendarEvent[]) => {
    setModalDriver(driverId);
    setModalDate(date);
    setModalEvents(events);
    setModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar obaveza</h1>
          <p className="text-muted-foreground text-sm">Pregled svih obaveza vozača po danima</p>
        </div>
        {/* Navigacija */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <div className="min-w-[160px] text-center">
            <p className="font-display font-bold text-lg">{MONTHS_SR[month - 1]} {year}</p>
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}>
            Danas
          </Button>
        </div>
      </div>

      {/* LEGENDA */}
      <Legend />

      {/* SUMARNI RED - stanje vozaca za mjesec */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `140px repeat(${activeDrivers.length}, minmax(100px, 1fr))` }}>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-end pb-1">Vozač</div>
        {activeDrivers.map(d => {
          const summary = getDriverMonthSummary(d.id, year, month);
          return (
            <div key={d.id} className="text-center pb-1">
              <p className="text-xs font-semibold truncate">{d.full_name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground">{fmt(summary.paid)}</p>
              {summary.pending > 0 && (
                <Badge variant="destructive" className="text-xs px-1 py-0 h-4 mt-0.5">{fmt(summary.pending)}</Badge>
              )}
            </div>
          );
        })}
      </div>

      {/* KALENDAR GRID */}
      <div className="overflow-x-auto rounded-xl border bg-card">
        <div
          className="min-w-max"
          style={{ display: "grid", gridTemplateColumns: `100px repeat(${activeDrivers.length}, minmax(90px, 1fr))` }}
        >
          {/* HEADER RED — Vozaci */}
          <div className="sticky left-0 z-10 bg-muted/50 border-b border-r px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Dan</span>
          </div>
          {activeDrivers.map(d => (
            <div key={d.id} className="bg-muted/50 border-b border-r px-2 py-2 text-center last:border-r-0">
              <p className="text-xs font-semibold truncate">{d.full_name.split(" ")[0]}</p>
              <p className="text-xs text-muted-foreground truncate">{d.full_name.split(" ")[1]}</p>
            </div>
          ))}

          {/* REDOVI PO DANIMA */}
          {days.map(day => {
            const dow      = getDayOfWeek(year, month, day);
            const dateStr  = getDateStr(year, month, day);
            const isSun    = isSunday(dow);
            const isRent   = isRentDay(dow);
            const isToday  = dateStr === today.toISOString().split("T")[0];

            return (
              <>
                {/* Dan labela */}
                <div
                  key={`label-${day}`}
                  className={`sticky left-0 z-10 border-b border-r px-3 py-1.5 flex items-center gap-2 ${
                    isSun    ? "bg-gray-50 text-gray-400" :
                    isRent   ? "bg-green-50/60" :
                    isToday  ? "bg-primary/5" :
                               "bg-card"
                  }`}
                >
                  <div className={`text-center leading-none ${isToday ? "text-primary font-bold" : ""}`}>
                    <p className="text-sm font-semibold">{day}</p>
                    <p className="text-xs text-muted-foreground">{DAYS_SR[dow]}</p>
                  </div>
                  {isRent && !isSun && <div className="h-1.5 w-1.5 rounded-full bg-green-400 flex-shrink-0" />}
                </div>

                {/* Celije po vozacima */}
                {activeDrivers.map(d => (
                  <div
                    key={`cell-${day}-${d.id}`}
                    className={`border-b border-r last:border-r-0 p-1 ${isSun ? "bg-gray-50/70" : ""}`}
                  >
                    <CalendarCell
                      driverId={d.id}
                      date={dateStr}
                      day={day}
                      dow={dow}
                      onCellClick={handleCellClick}
                    />
                  </div>
                ))}
              </>
            );
          })}
        </div>
      </div>

      {/* MODAL */}
      <DetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        driverId={modalDriver}
        date={modalDate}
        events={modalEvents}
      />
    </div>
  );
};

export default CalendarPage;
