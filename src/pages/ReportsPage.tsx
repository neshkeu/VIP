import { useState } from "react";
import {
  drivers, vehicles,
  rentCharges, rentPayments,
  posReports, posPayoutRequests,
  yandexReports, voucherEntries,
  getDriverById, getVehicleById,
  getPaidAmount,
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, User, Car, ArrowDownLeft, Search, TrendingDown, TrendingUp, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ────────────────────────────────────────────────
function inPeriod(date: string, from: string, to: string) {
  return (!from || date >= from) && (!to || date <= to);
}

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

// ─── IZVJESTAJ 1: PO VOZACU ─────────────────────────────────
function DriverReport() {
  const [driverId, setDriverId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generated, setGenerated] = useState(false);

  const driver = getDriverById(driverId);

  // Zaduzenja za period
  const charges = rentCharges.filter(c =>
    c.driver_id === driverId && inPeriod(c.date_from, from, to)
  );
  const totalCharged = charges.reduce((s, c) => s + c.total_amount, 0);

  // Uplate gotovinom
  const cashPayments = rentPayments.filter(p =>
    p.driver_id === driverId && inPeriod(p.payment_date, from, to)
  );
  const totalCash = cashPayments.reduce((s, p) => s + p.amount, 0);

  // Yandex (oduzet od duga)
  const yandexDeducted = yandexReports
    .filter(y => y.driver_id === driverId && inPeriod(y.report_date, from, to))
    .reduce((s, y) => s + y.amount, 0);

  // POS oduzet od duga
  const posDeducted = posPayoutRequests
    .filter(p => p.driver_id === driverId && p.action === "deduct_debt" && p.status === "done" && inPeriod(p.request_date, from, to))
    .reduce((s, p) => s + p.amount, 0);

  // Vauceri
  const vouchers = voucherEntries
    .filter(v => v.driver_id === driverId && inPeriod(v.date, from, to))
    .reduce((s, v) => s + v.amount, 0);

  const totalPaid = totalCash + yandexDeducted + posDeducted + vouchers;
  const balance = totalPaid - totalCharged;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Vozac</Label>
          <Select value={driverId} onValueChange={v => { setDriverId(v); setGenerated(false); }}>
            <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
            <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Period od</Label>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setGenerated(false); }} />
        </div>
        <div className="grid gap-2">
          <Label>Period do</Label>
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setGenerated(false); }} />
        </div>
      </div>
      <Button disabled={!driverId} onClick={() => setGenerated(true)} className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />Generisi izvjestaj
      </Button>

      <AnimatePresence>
        {generated && driver && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Separator />

            {/* Header vozaca */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-lg">{driver.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {from || "pocetak"} — {to || "danas"} &nbsp;·&nbsp; Dnevna: {fmt(driver.daily_rate)}
                </p>
              </div>
            </div>

            {/* Sumarni grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Ukupno zaduzeno", value: fmt(totalCharged), icon: TrendingDown, color: "text-destructive", bg: "bg-destructive/5" },
                { label: "Gotovina", value: fmt(totalCash), icon: Banknote, color: "text-green-600", bg: "bg-green-50" },
                { label: "Yandex + POS", value: fmt(yandexDeducted + posDeducted), icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Stanje", value: fmt(Math.abs(balance)), icon: FileText,
                  color: balance >= 0 ? "text-green-600" : "text-destructive",
                  bg: balance >= 0 ? "bg-green-50" : "bg-destructive/5",
                  label2: balance >= 0 ? "Pretplata" : "Duguje" },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border p-4 ${item.bg}`}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  {item.label2 && <Badge variant="outline" className={`text-xs mb-1 ${item.color}`}>{item.label2}</Badge>}
                  <p className={`text-lg font-bold font-display ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Detaljna tabela zaduzenja */}
            {charges.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Zaduzenja u periodu</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead>Dani</TableHead>
                        <TableHead>Iznos</TableHead>
                        <TableHead>Placeno</TableHead>
                        <TableHead>Ostalo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {charges.map(c => {
                        const paid = getPaidAmount(c.id);
                        const rem = c.total_amount - paid;
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="text-xs">{c.date_from} — {c.date_to}</TableCell>
                            <TableCell>{c.days}d ({c.off_days} slob.)</TableCell>
                            <TableCell className="font-semibold">{fmt(c.total_amount)}</TableCell>
                            <TableCell className="text-green-600">{fmt(paid)}</TableCell>
                            <TableCell className={rem > 0 ? "text-destructive font-semibold" : "text-green-600"}>
                              {rem > 0 ? fmt(rem) : "Izmireno ✓"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
            {charges.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">Nema zaduzenja za izabrani period.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── IZVJESTAJ 2: PO VOZILU ─────────────────────────────────
function VehicleReport() {
  const [vehicleId, setVehicleId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generated, setGenerated] = useState(false);

  const vehicle = getVehicleById(vehicleId);

  const posTotal = posReports
    .filter(p => p.vehicle_id === vehicleId && inPeriod(p.report_date, from, to))
    .reduce((s, p) => s + p.amount, 0);

  const yandexTotal = yandexReports
    .filter(y => y.vehicle_id === vehicleId && inPeriod(y.report_date, from, to))
    .reduce((s, y) => s + y.amount, 0);

  const posReportsFiltered = posReports.filter(p =>
    p.vehicle_id === vehicleId && inPeriod(p.report_date, from, to)
  );

  const yandexFiltered = yandexReports.filter(y =>
    y.vehicle_id === vehicleId && inPeriod(y.report_date, from, to)
  );

  // Koji vozaci su vozili ovo vozilo u periodu
  const driverIds = [...new Set([
    ...posReportsFiltered.map(p => p.driver_id),
    ...yandexFiltered.map(y => y.driver_id),
  ])];

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="grid gap-2">
          <Label>Vozilo</Label>
          <Select value={vehicleId} onValueChange={v => { setVehicleId(v); setGenerated(false); }}>
            <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
            <SelectContent>
              {vehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Period od</Label>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setGenerated(false); }} />
        </div>
        <div className="grid gap-2">
          <Label>Period do</Label>
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setGenerated(false); }} />
        </div>
      </div>
      <Button disabled={!vehicleId} onClick={() => setGenerated(true)} className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />Generisi izvjestaj
      </Button>

      <AnimatePresence>
        {generated && vehicle && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Separator />

            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Car className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-display font-bold text-lg">{vehicle.brand} {vehicle.model}</p>
                <div className="flex gap-2 mt-0.5">
                  <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                  <Badge variant="outline" className="font-mono text-xs">{vehicle.pos_terminal_id}</Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: "POS prihodi", value: fmt(posTotal), color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Yandex prihodi", value: fmt(yandexTotal), color: "text-yellow-700", bg: "bg-yellow-50" },
                { label: "Ukupno terminali", value: fmt(posTotal + yandexTotal), color: "text-primary", bg: "bg-primary/5" },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border p-4 ${item.bg}`}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`text-xl font-bold font-display ${item.color}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Ko je vozio */}
            {driverIds.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Vozaci u periodu</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {driverIds.map(id => {
                      const d = getDriverById(id);
                      if (!d) return null;
                      const dPos = posReportsFiltered.filter(p => p.driver_id === id).reduce((s, p) => s + p.amount, 0);
                      const dYandex = yandexFiltered.filter(y => y.driver_id === id).reduce((s, y) => s + y.amount, 0);
                      return (
                        <div key={id} className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                          <p className="font-medium">{d.full_name}</p>
                          <p className="text-xs text-muted-foreground">POS: {fmt(dPos)} · Yandex: {fmt(dYandex)}</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* POS tabela */}
            {posReportsFiltered.length > 0 && (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">POS izvodi</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vozac</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Datum izvoda</TableHead>
                        <TableHead>Iznos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {posReportsFiltered.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{getDriverById(p.driver_id)?.full_name ?? "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{p.period_from} — {p.period_to}</TableCell>
                          <TableCell className="text-xs">{p.report_date}</TableCell>
                          <TableCell className="font-semibold">{fmt(p.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── IZVJESTAJ 3: ISPLATE VOZACIMA ──────────────────────────
function PayoutsReport() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [generated, setGenerated] = useState(false);

  const payouts = posPayoutRequests.filter(p =>
    p.action === "pay_cash" && p.status === "done" && inPeriod(p.request_date, from, to)
  );

  const yandexPayouts = yandexReports.filter(y =>
    inPeriod(y.report_date, from, to)
  ).filter(y => {
    // Yandex koji je isplacen vozacu (ne oduzet od duga) - ovdje mockujemo sve kao isplaceno
    return true;
  });

  const totalPosPayouts = payouts.reduce((s, p) => s + p.amount, 0);

  // Grupisano po vozacu
  const byDriver = drivers.map(d => {
    const dPayouts = payouts.filter(p => p.driver_id === d.id);
    const total = dPayouts.reduce((s, p) => s + p.amount, 0);
    return { driver: d, payouts: dPayouts, total };
  }).filter(x => x.payouts.length > 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label>Period od</Label>
          <Input type="date" value={from} onChange={e => { setFrom(e.target.value); setGenerated(false); }} />
        </div>
        <div className="grid gap-2">
          <Label>Period do</Label>
          <Input type="date" value={to} onChange={e => { setTo(e.target.value); setGenerated(false); }} />
        </div>
      </div>
      <Button onClick={() => setGenerated(true)} className="w-full sm:w-auto">
        <Search className="mr-2 h-4 w-4" />Generisi izvjestaj
      </Button>

      <AnimatePresence>
        {generated && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Separator />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border bg-orange-50 p-4">
                <p className="text-xs text-muted-foreground">Ukupno isplaceno gotovinom</p>
                <p className="text-xl font-bold font-display text-orange-600">{fmt(totalPosPayouts)}</p>
                <p className="text-xs text-muted-foreground mt-1">POS isplate vozacima</p>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Broj isplata</p>
                <p className="text-xl font-bold font-display">{payouts.length}</p>
              </div>
            </div>

            {byDriver.length > 0 ? (
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Isplate po vozacu</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vozac</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Iznos</TableHead>
                        <TableHead>Napomena</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payouts.map(p => {
                        const d = getDriverById(p.driver_id);
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-medium">{d?.full_name ?? "—"}</TableCell>
                            <TableCell className="text-xs">{p.request_date}</TableCell>
                            <TableCell className="font-semibold text-orange-600">{fmt(p.amount)}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{p.notes || "POS isplata"}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : (
              <p className="text-center text-muted-foreground text-sm py-4">Nema isplata vozacima za izabrani period.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const ReportsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Izvjestaji</h1>
        <p className="text-muted-foreground">Generisite detaljne izvjestaje po vozacu, vozilu ili isplatama</p>
      </div>

      <Tabs defaultValue="driver">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="driver" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Izvjestaj po vozacu</span>
            <span className="sm:hidden">Vozac</span>
          </TabsTrigger>
          <TabsTrigger value="vehicle" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            <span className="hidden sm:inline">Izvjestaj po vozilu</span>
            <span className="sm:hidden">Vozilo</span>
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Isplate vozacima</span>
            <span className="sm:hidden">Isplate</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="driver">
          <Card><CardContent className="pt-6"><DriverReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="vehicle">
          <Card><CardContent className="pt-6"><VehicleReport /></CardContent></Card>
        </TabsContent>
        <TabsContent value="payouts">
          <Card><CardContent className="pt-6"><PayoutsReport /></CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
