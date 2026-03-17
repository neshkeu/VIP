import { useState } from "react";
import { drivers, getDriverById } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { toast } from "sonner";

const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getDateStr(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
}
function getDow(y: number, m: number, d: number) { return new Date(y, m-1, d).getDay(); }

// Stanje dana po vozaču: "izmireno" | "neizmireno" | null (nema obaveza)
type DayStatus = "izmireno" | "neizmireno" | null;

// Mock — u pravoj verziji dolazi iz baze
const MOCK_STATUS: Record<string, DayStatus> = {
  "d1_2026-03-10": "izmireno",
  "d1_2026-03-11": "neizmireno",
  "d1_2026-03-12": "izmireno",
  "d1_2026-03-13": "neizmireno",
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

// ─── MODAL ───────────────────────────────────────────────────
function DetailModal({ open, onClose, driverId, date, status, onSave }: {
  open: boolean;
  onClose: () => void;
  driverId: string;
  date: string;
  status: DayStatus;
  onSave: (driverId: string, date: string, status: DayStatus, by: string) => void;
}) {
  const [by, setBy] = useState("");
  const driver = getDriverById(driverId);
  const dow = new Date(date + "T00:00:00").getDay();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{driver?.full_name}</DialogTitle>
          <DialogDescription>{DAYS_SR[dow]}, {date}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Trenutni status */}
          <div className={`rounded-lg border p-3 text-center ${
            status === "izmireno"   ? "bg-green-50 border-green-300" :
            status === "neizmireno" ? "bg-red-50 border-red-300" :
                                      "bg-gray-50 border-gray-200"
          }`}>
            <p className="text-sm font-semibold">
              {status === "izmireno"   ? "✓ Izmireno" :
               status === "neizmireno" ? "✗ Neizmireno" :
                                         "— Nema obaveza"}
            </p>
          </div>

          <Separator />

          <div className="grid gap-1.5">
            <Label className="text-xs">Ko evidentira</Label>
            <Input
              placeholder="Nemanja, Milica..."
              value={by}
              onChange={e => setBy(e.target.value)}
              className="h-9"
            />
          </div>

          {/* Dugmad za promjenu statusa */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => {
                if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                onSave(driverId, date, "izmireno", by);
                toast.success(`Izmireno — ${by}`);
                onClose();
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                status === "izmireno"
                  ? "bg-green-100 border-green-500 text-green-700"
                  : "hover:bg-green-50 hover:border-green-400 hover:text-green-700 border-gray-200"
              }`}>
              <Check className="h-4 w-4" />Izmireno
            </button>
            <button
              onClick={() => {
                if (!by.trim()) { toast.error("Unesi ko evidentira!"); return; }
                onSave(driverId, date, "neizmireno", by);
                toast.success(`Označeno kao neizmireno — ${by}`);
                onClose();
              }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                status === "neizmireno"
                  ? "bg-red-100 border-red-500 text-red-700"
                  : "hover:bg-red-50 hover:border-red-400 hover:text-red-700 border-gray-200"
              }`}>
              <X className="h-4 w-4" />Neizmireno
            </button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── ĆELIJA ──────────────────────────────────────────────────
function Cell({ status, onClick }: { status: DayStatus; onClick: () => void }) {
  return (
    <td
      onClick={onClick}
      className={`border p-0.5 transition-all cursor-pointer min-w-[36px] w-9 ${
        status === "izmireno"   ? "bg-green-100 border-green-300 hover:bg-green-200" :
        status === "neizmireno" ? "bg-red-100 border-red-300 hover:bg-red-200" :
                                  "bg-white border-gray-100 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-center h-7">
        {status === "izmireno"   && <Check className="h-3.5 w-3.5 text-green-600" />}
        {status === "neizmireno" && <X     className="h-3.5 w-3.5 text-red-500"   />}
      </div>
    </td>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const CalendarPage = () => {
  const today = new Date();
  const [year, setYear]   = useState(2026);
  const [month, setMonth] = useState(3);
  const [statuses, setStatuses] = useState<Record<string, DayStatus>>(MOCK_STATUS);

  const [modalOpen, setModalOpen]     = useState(false);
  const [modalDriver, setModalDriver] = useState("");
  const [modalDate, setModalDate]     = useState("");

  const activeDrivers = drivers.filter(d => d.status === "active");
  const daysInMonth   = getDaysInMonth(year, month);
  const days          = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  const handleCellClick = (driverId: string, date: string) => {
    setModalDriver(driverId);
    setModalDate(date);
    setModalOpen(true);
  };

  const handleSave = (driverId: string, date: string, status: DayStatus) => {
    setStatuses(prev => ({ ...prev, [`${driverId}_${date}`]: status }));
  };

  // Broj izmirenih i neizmirenih za vozača u mjesecu
  const getDriverStats = (driverId: string) => {
    const prefix = `${year}-${String(month).padStart(2,"0")}`;
    const keys   = Object.keys(statuses).filter(k => k.startsWith(`${driverId}_${prefix}`));
    const izm    = keys.filter(k => statuses[k] === "izmireno").length;
    const neizm  = keys.filter(k => statuses[k] === "neizmireno").length;
    return { izm, neizm };
  };

  return (
    <div className="space-y-4">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar</h1>
          <p className="text-muted-foreground text-sm">Klikni na dan — izmireno / neizmireno</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4"/></Button>
          <span className="font-display font-bold text-lg min-w-[180px] text-center">
            {MONTHS_SR[month-1]} {year}
          </span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4"/></Button>
          <Button variant="outline" size="sm"
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}>
            Danas
          </Button>
        </div>
      </div>

      {/* LEGENDA */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-green-100 border border-green-300 flex items-center justify-center">
            <Check className="h-2.5 w-2.5 text-green-600"/>
          </div>
          <span className="text-muted-foreground">Izmireno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-red-100 border border-red-300 flex items-center justify-center">
            <X className="h-2.5 w-2.5 text-red-500"/>
          </div>
          <span className="text-muted-foreground">Neizmireno</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-white border border-gray-200"/>
          <span className="text-muted-foreground">Nije evidentirano</span>
        </div>
      </div>

      {/* TABELA */}
      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              {/* Ime vozača */}
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[150px]">
                Vozač
              </th>
              {/* Dani */}
              {days.map(day => {
                const dow     = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isTod   = dateStr === today.toISOString().split("T")[0];
                const isSun   = dow === 0;
                const isOb    = dow === 1 || dow === 3 || dow === 5;
                return (
                  <th key={day} className={`border px-0.5 py-1.5 text-center min-w-[36px] w-9 ${
                    isTod ? "bg-primary/10 text-primary" :
                    isSun ? "bg-gray-100 text-gray-400" :
                    isOb  ? "bg-green-50/70 text-green-700" :
                            "bg-muted/40 text-muted-foreground"
                  }`}>
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-60">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              {/* Statistika */}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[100px]">
                Stanje
              </th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const stats = getDriverStats(driver.id);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  {/* Ime */}
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[150px]">
                    <p className="font-semibold text-sm">{driver.full_name}</p>
                    <p className="text-xs text-muted-foreground">{driver.driver_type === "renta" ? "Renta" : "Vlastito"}</p>
                  </td>
                  {/* Ćelije */}
                  {days.map(day => {
                    const dateStr = getDateStr(year, month, day);
                    const key     = `${driver.id}_${dateStr}`;
                    return (
                      <Cell
                        key={day}
                        status={statuses[key] ?? null}
                        onClick={() => handleCellClick(driver.id, dateStr)}
                      />
                    );
                  })}
                  {/* Statistika */}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-2 py-2 text-center min-w-[100px]">
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className="text-green-600 font-bold">{stats.izm}✓</span>
                      <span className="text-red-500 font-bold">{stats.neizm}✗</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <DetailModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        driverId={modalDriver}
        date={modalDate}
        status={statuses[`${modalDriver}_${modalDate}`] ?? null}
        onSave={handleSave}
      />
    </div>
  );
};

export default CalendarPage;
