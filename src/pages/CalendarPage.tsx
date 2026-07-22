import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { useCalendar } from "@/hooks/useCalendar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Check, X, Loader2, Home, Car } from "lucide-react";

const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function getDaysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function getDateStr(y: number, m: number, d: number) { return `${y}-${String(m).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function getDow(y: number, m: number, d: number) { return new Date(y, m-1, d).getDay(); }
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

type DayStatus = "izmireno" | "neizmireno" | "nije_radio" | null;

function DriverSummaryModal({
  open, onClose, driver, year, month, cal,
}: {
  open: boolean;
  onClose: () => void;
  driver: any;
  year: number;
  month: number;
  cal: ReturnType<typeof useCalendar>;
}) {
  if (!driver) return null;
  const daysInMonth = getDaysInMonth(year, month);
  const days: {
    date: string;
    day: number;
    dow: number;
    status: DayStatus;
    off: string | null;
    amounts: number;
  }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = getDateStr(year, month, d);
    days.push({
      date,
      day: d,
      dow: getDow(year, month, d),
      status: cal.getStatus(driver.id, date) as DayStatus,
      off: cal.getOffStatus(driver.id, date),
      amounts: cal.getAmounts(driver.id, date).reduce((s: number, a: any) => s + a.amount, 0),
    });
  }

  const izm = days.filter(d => d.status === "izmireno").length;
  const neizm = days.filter(d => d.status === "neizmireno").length;
  const off = days.filter(d => d.off).length;
  const totalUplaceno = days.reduce((s, d) => s + d.amounts, 0);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{driver.full_name}</DialogTitle>
          <DialogDescription>{MONTHS_SR[month-1]} {year} — pregled</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="rounded-lg bg-green-50 border border-green-200 p-2">
            <p className="text-muted-foreground">Izmireno</p>
            <p className="text-lg font-bold text-green-600">{izm}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-2">
            <p className="text-muted-foreground">Neizmireno</p>
            <p className="text-lg font-bold text-red-600">{neizm}</p>
          </div>
          <div className="rounded-lg bg-gray-50 border border-gray-200 p-2">
            <p className="text-muted-foreground">Off dani</p>
            <p className="text-lg font-bold text-gray-600">{off}</p>
          </div>
          <div className="rounded-lg bg-primary/5 border border-primary/20 p-2">
            <p className="text-muted-foreground">Uplaćeno</p>
            <p className="text-lg font-bold text-primary">{fmt(totalUplaceno)}</p>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto rounded-lg border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Dan</th>
                <th className="px-3 py-2 text-left font-semibold">Status</th>
                <th className="px-3 py-2 text-right font-semibold">Iznos</th>
              </tr>
            </thead>
            <tbody>
              {days.map(d => (
                <tr key={d.date} className="border-t">
                  <td className="px-3 py-1.5">
                    <span className="font-medium">{d.day}.</span>
                    <span className="text-muted-foreground ml-1">{DAYS_SR[d.dow]}</span>
                  </td>
                  <td className="px-3 py-1.5">
                    {d.status === "izmireno" && <span className="text-green-600">✓ Izmireno</span>}
                    {d.status === "neizmireno" && <span className="text-red-600">✗ Neizmireno</span>}
                    {d.status === "nije_radio" && <span className="text-gray-500">🏠 Nije radio</span>}
                    {d.off === "nije_radio" && !d.status && <span className="text-red-500">Nije radio</span>}
                    {d.off === "servis" && <span className="text-amber-600">🔧 Servis</span>}
                    {d.off === "praznik" && <span className="text-purple-600">🎉 Praznik</span>}
                    {!d.status && !d.off && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium">
                    {d.amounts > 0 ? fmt(d.amounts) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Cell({ status, off, isSun, totalAmount, hasAssignment }: {
  status: DayStatus; off: string | null; isSun: boolean; totalAmount: number; hasAssignment: boolean;
}) {
  const bg =
    !hasAssignment ? "bg-gray-50 border-gray-100"
    : off === "servis" ? "bg-amber-50 border-amber-200"
    : off === "praznik" ? "bg-purple-50 border-purple-200"
    : off === "nije_radio" ? "bg-red-50 border-red-200"
    : status === "izmireno" ? "bg-green-100 border-green-300"
    : status === "neizmireno" ? "bg-red-100 border-red-300"
    : status === "nije_radio" ? "bg-gray-100 border-gray-300"
    : isSun ? "bg-gray-50 border-gray-100"
    : "bg-white border-gray-100";
  return (
    <td className={`border p-0.5 min-w-[44px] w-11 ${bg}`}>
      <div className="flex flex-col items-center justify-center h-9 gap-0.5">
        {!hasAssignment && <span className="text-gray-200 text-xs">—</span>}
        {hasAssignment && !off && status === "izmireno" && <Check className="h-3 w-3 text-green-600" />}
        {hasAssignment && !off && status === "neizmireno" && <X className="h-3 w-3 text-red-500" />}
        {hasAssignment && !off && status === "nije_radio" && <Home className="h-3 w-3 text-gray-400" />}
        {hasAssignment && off === "servis" && <span className="text-amber-600 font-bold" style={{ fontSize: "10px" }}>S</span>}
        {hasAssignment && off === "praznik" && <span className="text-purple-600 font-bold" style={{ fontSize: "10px" }}>P</span>}
        {hasAssignment && off === "nije_radio" && <span className="text-red-500 font-bold" style={{ fontSize: "10px" }}>×</span>}
        {hasAssignment && totalAmount > 0 && (
          <span className="font-semibold text-primary leading-none" style={{ fontSize: "9px" }}>
            {totalAmount >= 1000 ? `${(totalAmount/1000).toFixed(1)}k` : totalAmount}
          </span>
        )}
      </div>
    </td>
  );
}

const CalendarPage = () => {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [openDriver, setOpenDriver] = useState<any>(null);

  const { drivers, vehicles } = useApp();
  const cal = useCalendar(year, month);

  const activeDrivers = drivers.filter(d => d.status === "active" && d.role === "operativni");
  const daysInMonth = getDaysInMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const getDriverSummary = (driverId: string) => {
    const uplaceno = cal.amounts.filter(a => a.driver_id === driverId).reduce((s, a) => s + a.amount, 0);
    const izm = cal.entries.filter(e => e.driver_id === driverId && e.status === "izmireno").length;
    const neizm = cal.entries.filter(e => e.driver_id === driverId && e.status === "neizmireno").length;
    return { uplaceno, izm, neizm };
  };

  if (cal.loading) return (
    <div className="flex items-center justify-center py-32"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kalendar</h1>
          <p className="text-muted-foreground text-sm">Pregled izmirenih dana — klikni na vozača za detalje</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-display font-bold text-lg min-w-[180px] text-center">{MONTHS_SR[month-1]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()+1); }}>Danas</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-green-100 border border-green-300 flex items-center justify-center"><Check className="h-2.5 w-2.5 text-green-600" /></div><span className="text-muted-foreground">Izmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-red-100 border border-red-300 flex items-center justify-center"><X className="h-2.5 w-2.5 text-red-500" /></div><span className="text-muted-foreground">Neizmireno</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-red-50 border border-red-200 flex items-center justify-center"><span className="text-red-500 font-bold" style={{ fontSize: "10px" }}>×</span></div><span className="text-muted-foreground">Nije radio</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-amber-50 border border-amber-200 flex items-center justify-center"><span className="text-amber-600 font-bold" style={{ fontSize: "10px" }}>S</span></div><span className="text-muted-foreground">Servis</span></div>
        <div className="flex items-center gap-1.5"><div className="h-4 w-4 rounded bg-purple-50 border border-purple-200 flex items-center justify-center"><span className="text-purple-600 font-bold" style={{ fontSize: "10px" }}>P</span></div><span className="text-muted-foreground">Praznik</span></div>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase min-w-[220px]">
                Vozač / Vozilo
              </th>
              {days.map(day => {
                const dow = getDow(year, month, day);
                const dateStr = getDateStr(year, month, day);
                const isTod = dateStr === today.toISOString().split("T")[0];
                const isSun = dow === 0;
                return (
                  <th key={day} className={`border px-0.5 py-1.5 text-center min-w-[44px] w-11 ${isTod ? "bg-primary/10 text-primary" : isSun ? "bg-gray-100 text-gray-500" : "bg-muted/40 text-muted-foreground"}`}>
                    <div className="font-bold text-xs leading-none">{day}</div>
                    <div className="text-xs leading-none mt-0.5 font-normal opacity-60">{DAYS_SR[dow]}</div>
                  </th>
                );
              })}
              <th className="sticky right-0 z-20 bg-muted border border-gray-200 px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase min-w-[140px]">Sumarno</th>
            </tr>
          </thead>
          <tbody>
            {activeDrivers.map(driver => {
              const vehicle = vehicles.find(v => v.id === driver.vehicle_id);
              const summary = getDriverSummary(driver.id);
              return (
                <tr key={driver.id} className="hover:bg-muted/10 transition-colors">
                  <td className="sticky left-0 z-10 bg-card border border-gray-200 px-3 py-2 min-w-[220px] cursor-pointer"
                      onClick={() => setOpenDriver(driver)}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm hover:text-primary transition-colors">{driver.full_name}</p>
                        {vehicle ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Car className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{vehicle.brand} {vehicle.model}</span>
                            <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                          </div>
                        ) : (
                          <span className="text-xs text-amber-600">— bez vozila</span>
                        )}
                      </div>
                    </div>
                  </td>
                  {days.map(day => {
                    const dow = getDow(year, month, day);
                    const dateStr = getDateStr(year, month, day);
                    const isSun = dow === 0;
                    const totalAmount = cal.getAmounts(driver.id, dateStr).reduce((s, e) => s + e.amount, 0);
                    return (
                      <Cell key={day}
                        status={cal.getStatus(driver.id, dateStr) as DayStatus}
                        off={cal.getOffStatus(driver.id, dateStr)}
                        isSun={isSun}
                        totalAmount={totalAmount}
                        hasAssignment={!!driver.vehicle_id} />
                    );
                  })}
                  <td className="sticky right-0 z-10 bg-card border border-gray-200 px-3 py-2 text-right min-w-[140px]">
                    <div className="space-y-0.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Uplaćeno:</span>
                        <span className="text-green-600 font-bold">{fmt(summary.uplaceno)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-muted-foreground">Izm/Neizm:</span>
                        <span className="font-medium">
                          <span className="text-green-600">{summary.izm}</span>
                          <span className="text-muted-foreground">/</span>
                          <span className="text-red-500">{summary.neizm}</span>
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

      <p className="text-xs text-muted-foreground text-center">
        Sve unose radiš preko <strong>Kase</strong> — ovo je samo pregled.
      </p>

      <DriverSummaryModal
        open={!!openDriver}
        onClose={() => setOpenDriver(null)}
        driver={openDriver}
        year={year}
        month={month}
        cal={cal}
      />
    </div>
  );
};

export default CalendarPage;
