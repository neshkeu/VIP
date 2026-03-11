import { useState } from "react";
import {
  drivers, vehicles, offDays,
  rentCharges, rentPayments, yandexReports, voucherEntries,
  getDriverById, getVehicleById,
  getRentPaymentsByCharge, getPaidAmount, getRemainingAmount,
  getYandexTotalByDriver, getVoucherTotalByDriver,
  calculateRent
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { StatCard } from "@/components/StatCard";
import { Plus, CalendarOff, DollarSign, AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Zap, Ticket } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const VOUCHER_VALUE = 400;

const RentalsPage = () => {
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [offDayDialogOpen, setOffDayDialogOpen] = useState(false);
  const [yandexDialogOpen, setYandexDialogOpen] = useState(false);
  const [voucherDialogOpen, setVoucherDialogOpen] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);
  const [expandedCharge, setExpandedCharge] = useState<string | null>(null);

  // Forma za novo zaduzenje
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [days, setDays] = useState("");
  const [offDaysCount, setOffDaysCount] = useState("0");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);

  // Forma za uplatu
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payNote, setPayNote] = useState("");

  // Forma za vaucere
  const [voucherDriver, setVoucherDriver] = useState("");
  const [voucherCount, setVoucherCount] = useState("");

  // Kad se izabere vozac, automatski popuni dnevnu cijenu i vozilo
  const handleDriverSelect = (id: string) => {
    setDriverId(id);
    const driver = drivers.find(d => d.id === id);
    if (driver) {
      setDailyRate(String(driver.daily_rate));
      if (driver.vehicle_id) setVehicleId(driver.vehicle_id);
    }
  };

  const calcResult = dailyRate && days
    ? calculateRent(Number(dailyRate), Number(days), Number(offDaysCount))
    : null;

  // Neto dug po vozacu (nakon Yandex i vaucera)
  const getNetDebt = (dId: string) => {
    const charges = rentCharges.filter(c => c.driver_id === dId);
    const gross = charges.reduce((s, c) => s + getRemainingAmount(c.id, c.total_amount), 0);
    const yandex = getYandexTotalByDriver(dId);
    const vouchers = getVoucherTotalByDriver(dId);
    return Math.max(0, gross - yandex - vouchers);
  };

  const totalDebt = drivers.reduce((s, d) => s + getNetDebt(d.id), 0);
  const unpaidCharges = rentCharges.filter(c => getRemainingAmount(c.id, c.total_amount) > 0);
  const paidCharges = rentCharges.filter(c => getRemainingAmount(c.id, c.total_amount) <= 0);

  const openPayment = (chargeId: string) => {
    setSelectedChargeId(chargeId);
    setPayAmount(""); setPayNote("");
    setPaymentDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Zaduzenja i Uplate</h1>
          <p className="text-muted-foreground">Pracenje duga po vozacu — renta, Yandex, vauceri</p>
        </div>
        <div className="flex gap-2 flex-wrap">

          {/* SLOBODAN DAN */}
          <Dialog open={offDayDialogOpen} onOpenChange={setOffDayDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><CalendarOff className="mr-2 h-4 w-4" />Slobodan dan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Slobodan dan</DialogTitle>
                <DialogDescription>Vozac ne radi — placa 50% dnevne rente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Datum</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="grid gap-2">
                  <Label>Napomena</Label>
                  <Input placeholder="Bolovanje, odmor..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOffDayDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => { setOffDayDialogOpen(false); toast.success("Slobodan dan zabiljezan"); }}>Sacuvaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* YANDEX IZVOD */}
          <Dialog open={yandexDialogOpen} onOpenChange={setYandexDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Zap className="mr-2 h-4 w-4" />Yandex izvod</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unos Yandex izvoda</DialogTitle>
                <DialogDescription>Iznos se vezuje za vozilo i pripisuje vozacu koji je vozio u tom periodu.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozilo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.filter(v => v.status === "active").map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Iznos (RSD)</Label>
                  <Input type="number" placeholder="4200" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2"><Label>Period od</Label><Input type="date" /></div>
                  <div className="grid gap-2"><Label>Period do</Label><Input type="date" /></div>
                </div>
                <div className="grid gap-2">
                  <Label>Datum izvoda</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="grid gap-2"><Label>Napomena</Label><Input placeholder="Broj izvoda..." /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setYandexDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => { setYandexDialogOpen(false); toast.success("Yandex izvod unesen"); }}>Sacuvaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* VAUCERI */}
          <Dialog open={voucherDialogOpen} onOpenChange={setVoucherDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Ticket className="mr-2 h-4 w-4" />Vauceri</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unos vaucera</DialogTitle>
                <DialogDescription>Vozac predaje naplaceene vaucere — firma mu isplacuje gotovinom.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select value={voucherDriver} onValueChange={setVoucherDriver}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>{drivers.filter(d => d.status === "active").map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Broj vaucera</Label>
                  <Input type="number" placeholder="3" value={voucherCount} onChange={e => setVoucherCount(e.target.value)} />
                </div>
                {voucherCount && Number(voucherCount) > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-md border bg-blue-50 dark:bg-blue-950/20 p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{voucherCount} × {VOUCHER_VALUE} RSD =</span>
                    <span className="font-bold text-blue-600">{(Number(voucherCount) * VOUCHER_VALUE).toLocaleString()} RSD</span>
                  </motion.div>
                )}
                <div className="grid gap-2">
                  <Label>Datum</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="grid gap-2"><Label>Napomena</Label><Input placeholder="..." /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setVoucherDialogOpen(false)}>Otkazi</Button>
                <Button
                  disabled={!voucherDriver || !voucherCount}
                  onClick={() => {
                    setVoucherDialogOpen(false);
                    toast.success(`Vauceri uneseni: ${(Number(voucherCount) * VOUCHER_VALUE).toLocaleString()} RSD`);
                    setVoucherCount(""); setVoucherDriver("");
                  }}
                >
                  Sacuvaj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* NOVO ZADUZENJE */}
          <Dialog open={chargeDialogOpen} onOpenChange={(open) => {
            setChargeDialogOpen(open);
            if (!open) { setDriverId(""); setVehicleId(""); setDailyRate(""); setDays(""); setOffDaysCount("0"); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-2 h-4 w-4" />Novo zaduzenje</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kreiraj zaduzenje</DialogTitle>
                <DialogDescription>Cijena se automatski povlaci iz profila vozaca.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select value={driverId} onValueChange={handleDriverSelect}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>
                      {drivers.filter(d => d.status === "active").map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {driverId && (() => {
                  const driver = drivers.find(d => d.id === driverId);
                  const vehicle = vehicles.find(v => v.id === driver?.vehicle_id);
                  return driver ? (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="rounded-md border bg-muted/40 px-3 py-2 flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Vozilo:</span>
                      <div className="flex gap-2 items-center">
                        {vehicle
                          ? <><span>{vehicle.brand} {vehicle.model}</span><Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge></>
                          : <span className="text-muted-foreground italic">Nije dodijeljeno</span>
                        }
                      </div>
                    </motion.div>
                  ) : null;
                })()}

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Dnevna cijena</Label>
                    <Input type="number" placeholder="3500" value={dailyRate} onChange={e => setDailyRate(e.target.value)} />
                    {driverId && <p className="text-xs text-muted-foreground">Auto-popunjeno</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Broj dana</Label>
                    <Input type="number" placeholder="5" value={days} onChange={e => setDays(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Slobodni dani</Label>
                    <Input type="number" placeholder="0" value={offDaysCount} onChange={e => setOffDaysCount(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Datum od</Label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
                </div>

                {calcResult && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border bg-muted/40 p-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Radni dani</p>
                        <p className="text-lg font-bold">{calcResult.workDays}</p>
                        <p className="text-xs text-muted-foreground">× {Number(dailyRate).toLocaleString()}</p>
                      </div>
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Slobodni dani</p>
                        <p className="text-lg font-bold">{calcResult.offDays}</p>
                        <p className="text-xs text-muted-foreground">× {(Number(dailyRate) * 0.5).toLocaleString()}</p>
                      </div>
                      <div className="rounded-md bg-primary/10 border border-primary/30 p-3">
                        <p className="text-xs text-muted-foreground">UKUPNO</p>
                        <p className="text-lg font-bold text-primary">{calcResult.total.toLocaleString()} RSD</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChargeDialogOpen(false)}>Otkazi</Button>
                <Button disabled={!calcResult || !driverId} onClick={() => {
                  setChargeDialogOpen(false);
                  toast.success(`Zaduzenje kreirano: ${calcResult?.total.toLocaleString()} RSD`);
                }}>
                  Kreiraj zaduzenje
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard title="Ukupan dug (neto)" value={`${totalDebt.toLocaleString()} RSD`} icon={DollarSign} />
        <StatCard title="Neizmirena zaduzenja" value={unpaidCharges.length} icon={AlertCircle} />
        <StatCard title="Izmirena" value={paidCharges.length} icon={CheckCircle2} />
        <StatCard title="Yandex izvodi" value={yandexReports.length} icon={Zap} />
      </div>

      <Tabs defaultValue="unpaid">
        <TabsList>
          <TabsTrigger value="unpaid">
            Neizmireno
            {unpaidCharges.length > 0 && <Badge variant="destructive" className="ml-2 text-xs">{unpaidCharges.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="paid">Izmireno</TabsTrigger>
          <TabsTrigger value="yandex">Yandex</TabsTrigger>
          <TabsTrigger value="vouchers">Vauceri</TabsTrigger>
          <TabsTrigger value="offdays">Slobodni dani</TabsTrigger>
        </TabsList>

        {/* NEIZMIRENA */}
        <TabsContent value="unpaid" className="mt-4 space-y-3">
          {unpaidCharges.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
              <p>Sva zaduzenja su izmirena!</p>
            </CardContent></Card>
          )}
          {unpaidCharges.map((charge) => {
            const driver = getDriverById(charge.driver_id);
            const vehicle = getVehicleById(charge.vehicle_id);
            const paid = getPaidAmount(charge.id);
            const remaining = getRemainingAmount(charge.id, charge.total_amount);
            const yandex = getYandexTotalByDriver(charge.driver_id);
            const vouchers = getVoucherTotalByDriver(charge.driver_id);
            const netRemaining = Math.max(0, remaining - yandex - vouchers);
            const percent = Math.round((paid / charge.total_amount) * 100);
            const chargePayments = getRentPaymentsByCharge(charge.id);
            const isExpanded = expandedCharge === charge.id;

            return (
              <motion.div key={charge.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-base">{driver?.full_name ?? "—"}</span>
                          {vehicle && <Badge variant="outline" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>}
                          <Badge variant="secondary" className="text-xs">{charge.date_from} → {charge.date_to}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {charge.days} dana × {charge.daily_rate.toLocaleString()} RSD
                          {charge.off_days > 0 && ` + ${charge.off_days} slobodnih`}
                        </p>
                        {(yandex > 0 || vouchers > 0) && (
                          <div className="flex gap-3 text-xs mt-1">
                            {yandex > 0 && <span className="text-green-600 flex items-center gap-1"><Zap className="h-3 w-3" />Yandex: -{yandex.toLocaleString()} RSD</span>}
                            {vouchers > 0 && <span className="text-blue-600 flex items-center gap-1"><Ticket className="h-3 w-3" />Vauceri: -{vouchers.toLocaleString()} RSD</span>}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={() => openPayment(charge.id)}>
                          <Plus className="mr-1 h-3 w-3" />Uplata
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setExpandedCharge(isExpanded ? null : charge.id)}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Placeno: <span className="font-medium text-foreground">{paid.toLocaleString()} RSD</span></span>
                        <span className="text-destructive font-semibold">Neto ostatak: {netRemaining.toLocaleString()} RSD</span>
                      </div>
                      <Progress value={percent} className="h-2" />
                      <p className="text-xs text-right text-muted-foreground">{percent}% izmireno od {charge.total_amount.toLocaleString()} RSD</p>
                    </div>

                    <AnimatePresence>
                      {isExpanded && chargePayments.length > 0 && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mt-3 overflow-hidden">
                          <div className="rounded-md border bg-muted/30">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Datum</TableHead>
                                  <TableHead className="text-xs">Iznos</TableHead>
                                  <TableHead className="text-xs">Nacin</TableHead>
                                  <TableHead className="text-xs">Napomena</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {chargePayments.map(p => (
                                  <TableRow key={p.id}>
                                    <TableCell className="text-xs">{p.payment_date}</TableCell>
                                    <TableCell className="text-xs font-medium">{p.amount.toLocaleString()} RSD</TableCell>
                                    <TableCell className="text-xs capitalize">{p.payment_method}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{p.notes || "—"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TabsContent>

        {/* IZMIRENA */}
        <TabsContent value="paid" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Izmirena zaduzenja ({paidCharges.length})</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Komunalni br.</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidCharges.map(charge => {
                    const driver = getDriverById(charge.driver_id);
                    const vehicle = getVehicleById(charge.vehicle_id);
                    return (
                      <TableRow key={charge.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? <Badge variant="outline" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge> : "—"}</TableCell>
                        <TableCell className="text-xs">{charge.date_from} — {charge.date_to}</TableCell>
                        <TableCell>{charge.total_amount.toLocaleString()} RSD</TableCell>
                        <TableCell><Badge variant="outline" className="text-green-600 border-green-300 bg-green-50 text-xs"><CheckCircle2 className="mr-1 h-3 w-3" />Izmireno</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                  {paidCharges.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nema izmirenih zaduzenja</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* YANDEX */}
        <TabsContent value="yandex" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" />Yandex izvodi</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Datum izvoda</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Napomena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {yandexReports.map(r => {
                    const driver = getDriverById(r.driver_id);
                    const vehicle = getVehicleById(r.vehicle_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge> : "—"}</TableCell>
                        <TableCell className="text-xs">{r.period_from} — {r.period_to}</TableCell>
                        <TableCell>{r.report_date}</TableCell>
                        <TableCell className="font-semibold text-green-600">-{r.amount.toLocaleString()} RSD</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* VAUCERI */}
        <TabsContent value="vouchers" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base flex items-center gap-2"><Ticket className="h-4 w-4 text-blue-500" />Interni vauceri (400 RSD)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Broj vaucera</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Isplaceno</TableHead>
                    <TableHead>Napomena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {voucherEntries.map(v => {
                    const driver = getDriverById(v.driver_id);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{v.date}</TableCell>
                        <TableCell>{v.count}×</TableCell>
                        <TableCell className="font-semibold text-blue-600">{v.amount.toLocaleString()} RSD</TableCell>
                        <TableCell>
                          {v.paid_out
                            ? <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Isplaceno</Badge>
                            : <Badge variant="destructive" className="text-xs">Na cekanju</Badge>
                          }
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{v.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SLOBODNI DANI */}
        <TabsContent value="offdays" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Slobodni dani — pola rente</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Napomena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offDays.map(o => {
                    const driver = getDriverById(o.driver_id);
                    const vehicle = getVehicleById(o.vehicle_id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                        <TableCell>{o.date}</TableCell>
                        <TableCell className="text-muted-foreground">{o.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {offDays.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nema slobodnih dana</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG ZA UPLATU */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unesi uplatu</DialogTitle>
            {selectedChargeId && (() => {
              const charge = rentCharges.find(c => c.id === selectedChargeId);
              const driver = charge ? getDriverById(charge.driver_id) : null;
              const remaining = charge ? getRemainingAmount(charge.id, charge.total_amount) : 0;
              const yandex = charge ? getYandexTotalByDriver(charge.driver_id) : 0;
              const vouchers = charge ? getVoucherTotalByDriver(charge.driver_id) : 0;
              const net = Math.max(0, remaining - yandex - vouchers);
              return (
                <DialogDescription>
                  <span className="font-medium">{driver?.full_name}</span>
                  {(yandex > 0 || vouchers > 0) && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (nakon Yandex/vaucera: <span className="font-semibold text-destructive">{net.toLocaleString()} RSD</span>)
                    </span>
                  )}
                  {!(yandex > 0 || vouchers > 0) && (
                    <span className="ml-2">ostatak: <span className="font-semibold text-destructive">{remaining.toLocaleString()} RSD</span></span>
                  )}
                </DialogDescription>
              );
            })()}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Iznos uplate (RSD)</Label>
              <Input type="number" placeholder="6000" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
              {selectedChargeId && payAmount && (() => {
                const charge = rentCharges.find(c => c.id === selectedChargeId);
                const remaining = charge ? getRemainingAmount(charge.id, charge.total_amount) : 0;
                const newRemaining = remaining - Number(payAmount);
                return <p className={`text-xs ${newRemaining <= 0 ? "text-green-600" : "text-muted-foreground"}`}>
                  {newRemaining <= 0 ? "Zaduzenje ce biti potpuno izmireno!" : `Ostace: ${newRemaining.toLocaleString()} RSD`}
                </p>;
              })()}
            </div>
            <div className="grid gap-2">
              <Label>Nacin placanja</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Gotovina</SelectItem>
                  <SelectItem value="bank">Banka</SelectItem>
                  <SelectItem value="card">Kartica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Napomena</Label>
              <Input placeholder="Prva rata, ostatak..." value={payNote} onChange={e => setPayNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Otkazi</Button>
            <Button disabled={!payAmount || Number(payAmount) <= 0} onClick={() => {
              setPaymentDialogOpen(false);
              toast.success(`Uplata od ${Number(payAmount).toLocaleString()} RSD zabiljezejena`);
            }}>
              Potvrdi uplatu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalsPage;
