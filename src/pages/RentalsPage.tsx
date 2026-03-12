import { useState } from "react";
import {
  drivers, vehicles, offDays, rentCharges, rentPayments,
  yandexReports, voucherEntries, posReports,
  getDriverById, getVehicleById, calculateRent
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
import { Separator } from "@/components/ui/separator";
import { StatCard } from "@/components/StatCard";
import { Plus, CalendarOff, DollarSign, AlertCircle, CheckCircle2, Banknote, Smartphone, Ticket, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── TIPOVI STAVKI ZADUZENJA ────────────────────────────────
type EntryType = "cash" | "yandex" | "pos" | "voucher" | "off_day";

interface ChargeEntry {
  id: string;
  charge_id: string;
  type: EntryType;
  amount: number;
  date: string;
  notes: string;
  // Za POS/Yandex
  action?: "deduct_debt" | "pay_cash";
  // Za vaucere
  count?: number;
}

// Mock stavke po zaduzenju
const chargeEntries: ChargeEntry[] = [
  // rc1 - Ahmed, 5 dana
  { id: "ce1", charge_id: "rc1", type: "cash",    amount: 10000, date: "2025-03-03", notes: "Prva rata" },
  { id: "ce2", charge_id: "rc1", type: "yandex",  amount: 4200,  date: "2025-03-06", notes: "Yandex izvod #Y-441", action: "deduct_debt" },
  { id: "ce3", charge_id: "rc1", type: "voucher", amount: 1200,  date: "2025-03-04", notes: "3 vaucera × 400 RSD", count: 3, action: "deduct_debt" },
  // rc2 - Maria, 7 dana
  { id: "ce4", charge_id: "rc2", type: "cash",    amount: 6000,  date: "2025-03-05", notes: "" },
  { id: "ce5", charge_id: "rc2", type: "pos",     amount: 620,   date: "2025-03-06", notes: "POS izvod", action: "deduct_debt" },
  // rc3 - Ahmed, 3 dana
  { id: "ce6", charge_id: "rc3", type: "cash",    amount: 5000,  date: "2025-03-07", notes: "" },
  { id: "ce7", charge_id: "rc3", type: "pos",     amount: 910,   date: "2025-03-08", notes: "POS — isplaceno vozacu", action: "pay_cash" },
  // rc4 - James, 5 dana
  { id: "ce8", charge_id: "rc4", type: "cash",    amount: 16000, date: "2025-03-04", notes: "Sve odjednom" },
];

function getEntriesForCharge(chargeId: string) {
  return chargeEntries.filter(e => e.charge_id === chargeId);
}

function getPaidForCharge(chargeId: string) {
  return chargeEntries
    .filter(e => e.charge_id === chargeId && e.action !== "pay_cash")
    .reduce((sum, e) => sum + e.amount, 0);
}

function getRemainingForCharge(chargeId: string, total: number) {
  return total - getPaidForCharge(chargeId);
}

const ENTRY_CONFIG: Record<EntryType, { label: string; icon: any; color: string; bg: string }> = {
  cash:    { label: "Gotovina",    icon: Banknote,    color: "text-green-700",  bg: "bg-green-50 border-green-200" },
  yandex:  { label: "Yandex",     icon: Smartphone,  color: "text-violet-700", bg: "bg-violet-50 border-violet-200" },
  pos:     { label: "POS kartica",icon: CreditCard,  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200" },
  voucher: { label: "Vaucer",     icon: Ticket,      color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
  off_day: { label: "Slobodan dan",icon: CalendarOff,color: "text-gray-600",   bg: "bg-gray-50 border-gray-200" },
};

// ─── KOMPONENTA ZA JEDNU STAVKU ─────────────────────────────
function EntryRow({ entry }: { entry: ChargeEntry }) {
  const cfg = ENTRY_CONFIG[entry.type];
  const Icon = cfg.icon;
  const isPayout = entry.action === "pay_cash";

  return (
    <div className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${cfg.bg}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${cfg.color}`} />
        <div>
          <span className={`font-medium ${cfg.color}`}>{cfg.label}</span>
          {entry.count && <span className="ml-1 text-xs text-muted-foreground">({entry.count}×400)</span>}
          {isPayout && <Badge variant="outline" className="ml-2 text-xs text-orange-600 border-orange-300">isplaceno vozacu</Badge>}
          {entry.notes && <p className="text-xs text-muted-foreground">{entry.notes}</p>}
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${isPayout ? "text-orange-600" : "text-green-700"}`}>
          {isPayout ? "↑" : "−"} {entry.amount.toLocaleString()} RSD
        </p>
        <p className="text-xs text-muted-foreground">{entry.date}</p>
      </div>
    </div>
  );
}

// ─── KOMPONENTA ZA JEDNO ZADUZENJE ──────────────────────────
function ChargeCard({ charge, onAddEntry }: { charge: typeof rentCharges[0]; onAddEntry: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const driver = getDriverById(charge.driver_id);
  const vehicle = getVehicleById(charge.vehicle_id);
  const entries = getEntriesForCharge(charge.id);
  const paid = getPaidForCharge(charge.id);
  const remaining = getRemainingForCharge(charge.id, charge.total_amount);
  const percent = Math.min(100, Math.round((paid / charge.total_amount) * 100));
  const isDone = remaining <= 0;
  const isOverpaid = remaining < 0;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`overflow-hidden ${isDone ? "border-green-200" : ""}`}>
        {/* HEADER */}
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-base">{driver?.full_name ?? "—"}</span>
                {vehicle && (
                  <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                )}
                {isDone && !isOverpaid && (
                  <Badge variant="outline" className="text-green-600 border-green-300 text-xs">
                    <CheckCircle2 className="mr-1 h-3 w-3" />Izmireno
                  </Badge>
                )}
                {isOverpaid && (
                  <Badge variant="outline" className="text-blue-600 border-blue-300 text-xs">
                    Pretplata: {Math.abs(remaining).toLocaleString()} RSD
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {charge.date_from} → {charge.date_to}
                {" · "}
                {charge.days} dana × {charge.daily_rate.toLocaleString()} RSD
                {charge.off_days > 0 && ` (${charge.off_days} slobodnih)`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isDone && (
                <Button size="sm" onClick={() => onAddEntry(charge.id)}>
                  <Plus className="mr-1 h-3 w-3" />Dodaj stavku
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => setExpanded(!expanded)}>
                {expanded ? "Sakrij" : "Detalji"}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {/* PROGRESS BAR */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Uplaceno: <span className="font-medium text-foreground">{paid.toLocaleString()} RSD</span>
              </span>
              {!isDone && (
                <span className="font-semibold text-destructive">
                  Ostalo: {remaining.toLocaleString()} RSD
                </span>
              )}
            </div>
            <Progress value={percent} className="h-2" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{percent}% izmireno</span>
              <span>Ukupno: {charge.total_amount.toLocaleString()} RSD</span>
            </div>
          </div>

          {/* STAVKE */}
          <AnimatePresence>
            {(expanded || !isDone) && entries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 overflow-hidden"
              >
                <Separator />
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Stavke</p>
                {entries.map(entry => <EntryRow key={entry.id} entry={entry} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const RentalsPage = () => {
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [offDayDialogOpen, setOffDayDialogOpen] = useState(false);
  const [selectedChargeId, setSelectedChargeId] = useState<string | null>(null);

  // Forma zaduzenje
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [dailyRate, setDailyRate] = useState("");
  const [days, setDays] = useState("");
  const [offDaysCount, setOffDaysCount] = useState("0");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split("T")[0]);

  // Forma stavka
  const [entryType, setEntryType] = useState<EntryType>("cash");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryVoucherCount, setEntryVoucherCount] = useState("1");
  const [entryAction, setEntryAction] = useState<"deduct_debt" | "pay_cash">("deduct_debt");
  const [entryNote, setEntryNote] = useState("");

  const calcResult = dailyRate && days
    ? calculateRent(Number(dailyRate), Number(days), Number(offDaysCount))
    : null;

  const openEntryDialog = (chargeId: string) => {
    setSelectedChargeId(chargeId);
    setEntryType("cash");
    setEntryAmount("");
    setEntryVoucherCount("1");
    setEntryNote("");
    setEntryDialogOpen(true);
  };

  // Auto-povuci dnevnu cijenu kad se izabere vozac
  const handleDriverSelect = (id: string) => {
    setDriverId(id);
    const d = drivers.find(x => x.id === id);
    if (d?.daily_rate) setDailyRate(String(d.daily_rate));
    const v = vehicles.find(x => x.id === d?.vehicle_id);
    if (v) setVehicleId(v.id);
  };

  const openCharges = rentCharges.filter(c => getRemainingForCharge(c.id, c.total_amount) > 0);
  const closedCharges = rentCharges.filter(c => getRemainingForCharge(c.id, c.total_amount) <= 0);
  const totalDebt = openCharges.reduce((sum, c) => sum + getRemainingForCharge(c.id, c.total_amount), 0);

  const selectedCharge = rentCharges.find(c => c.id === selectedChargeId);
  const selectedDriver = selectedCharge ? getDriverById(selectedCharge.driver_id) : null;
  const remaining = selectedCharge ? getRemainingForCharge(selectedCharge.id, selectedCharge.total_amount) : 0;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Zaduzenja</h1>
          <p className="text-muted-foreground">Pracenje rente, uplata, Yandexa, POS-a i vaucera</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={offDayDialogOpen} onOpenChange={setOffDayDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><CalendarOff className="mr-2 h-4 w-4" />Slobodan dan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Oznaci slobodan dan</DialogTitle>
                <DialogDescription>Vozac ne radi — placa 50% dnevne rente za taj dan.</DialogDescription>
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
                  <Label>Vozilo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>{vehicles.filter(v => v.status === "active").map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                    ))}</SelectContent>
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

          <Dialog open={chargeDialogOpen} onOpenChange={(open) => {
            setChargeDialogOpen(open);
            if (!open) { setDriverId(""); setVehicleId(""); setDailyRate(""); setDays(""); setOffDaysCount("0"); }
          }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo zaduzenje</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kreiraj zaduzenje</DialogTitle>
                <DialogDescription>Izaberite vozaca — cijena rente se povlaci automatski.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select value={driverId} onValueChange={handleDriverSelect}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>{drivers.filter(d => d.status === "active").map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Vozilo</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>{vehicles.filter(v => v.status === "active").map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Dnevna cijena</Label>
                    <Input type="number" placeholder="3500" value={dailyRate} onChange={e => setDailyRate(e.target.value)} />
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
                  <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border bg-muted/40 p-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Radni dani</p>
                        <p className="text-lg font-bold">{calcResult.workDays}</p>
                        <p className="text-xs text-muted-foreground">× {Number(dailyRate).toLocaleString()}</p>
                      </div>
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Slobodni</p>
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
                <Button disabled={!calcResult || !driverId || !vehicleId}
                  onClick={() => { setChargeDialogOpen(false); toast.success(`Zaduzenje kreirano: ${calcResult?.total.toLocaleString()} RSD`); }}>
                  Kreiraj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ukupan otvoreni dug" value={`${totalDebt.toLocaleString()} RSD`} icon={DollarSign} />
        <StatCard title="Otvorena zaduzenja" value={openCharges.length} icon={AlertCircle} />
        <StatCard title="Zatvorena zaduzenja" value={closedCharges.length} icon={CheckCircle2} />
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Otvorena
            {openCharges.length > 0 && <Badge variant="destructive" className="ml-2 text-xs">{openCharges.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="closed">Zatvorena ({closedCharges.length})</TabsTrigger>
          <TabsTrigger value="offdays">Slobodni dani</TabsTrigger>
        </TabsList>

        {/* OTVORENA */}
        <TabsContent value="open" className="mt-4 space-y-3">
          {openCharges.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-green-500" />
              <p>Sva zaduzenja su izmirena!</p>
            </CardContent></Card>
          )}
          {openCharges.map(charge => (
            <ChargeCard key={charge.id} charge={charge} onAddEntry={openEntryDialog} />
          ))}
        </TabsContent>

        {/* ZATVORENA */}
        <TabsContent value="closed" className="mt-4 space-y-3">
          {closedCharges.length === 0 && (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nema zatvorenih zaduzenja</CardContent></Card>
          )}
          {closedCharges.map(charge => (
            <ChargeCard key={charge.id} charge={charge} onAddEntry={openEntryDialog} />
          ))}
        </TabsContent>

        {/* SLOBODNI DANI */}
        <TabsContent value="offdays" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-base">Slobodni dani — 50% rente</CardTitle></CardHeader>
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
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* DIALOG ZA STAVKU */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dodaj stavku</DialogTitle>
            {selectedDriver && (
              <DialogDescription>
                {selectedDriver.full_name} — ostalo: <span className="font-semibold text-destructive">{remaining.toLocaleString()} RSD</span>
              </DialogDescription>
            )}
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Vrsta stavke</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["cash", "yandex", "pos", "voucher"] as EntryType[]).map(t => {
                  const cfg = ENTRY_CONFIG[t];
                  const Icon = cfg.icon;
                  return (
                    <button key={t} type="button"
                      onClick={() => setEntryType(t)}
                      className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-all ${entryType === t ? `${cfg.bg} ${cfg.color} border-current` : "hover:bg-muted"}`}>
                      <Icon className="h-4 w-4" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {entryType === "voucher" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Broj vaucera</Label>
                  <Input type="number" min="1" value={entryVoucherCount}
                    onChange={e => { setEntryVoucherCount(e.target.value); setEntryAmount(String(Number(e.target.value) * 400)); }} />
                </div>
                <div className="grid gap-2">
                  <Label>Ukupno (RSD)</Label>
                  <Input readOnly value={entryAmount} className="bg-muted" />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Iznos (RSD)</Label>
                <Input type="number" placeholder="5000" value={entryAmount} onChange={e => setEntryAmount(e.target.value)} />
                {entryAmount && remaining > 0 && Number(entryAmount) <= remaining && (
                  <p className="text-xs text-muted-foreground">Ostace: {(remaining - Number(entryAmount)).toLocaleString()} RSD</p>
                )}
                {entryAmount && Number(entryAmount) > remaining && (
                  <p className="text-xs text-green-600">Zaduzenje ce biti potpuno izmireno!</p>
                )}
              </div>
            )}

            {(entryType === "yandex" || entryType === "pos") && (
              <div className="grid gap-2">
                <Label>Sta uraditi sa ovim iznosom?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setEntryAction("deduct_debt")}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-all ${entryAction === "deduct_debt" ? "bg-green-50 border-green-400 text-green-700" : "hover:bg-muted"}`}>
                    Oduzmi od duga
                  </button>
                  <button type="button" onClick={() => setEntryAction("pay_cash")}
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition-all ${entryAction === "pay_cash" ? "bg-orange-50 border-orange-400 text-orange-700" : "hover:bg-muted"}`}>
                    Isplati vozacu
                  </button>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Napomena (opciono)</Label>
              <Input placeholder="Broj izvoda, napomena..." value={entryNote} onChange={e => setEntryNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Otkazi</Button>
            <Button disabled={!entryAmount || Number(entryAmount) <= 0}
              onClick={() => {
                setEntryDialogOpen(false);
                const cfg = ENTRY_CONFIG[entryType];
                toast.success(`${cfg.label}: ${Number(entryAmount).toLocaleString()} RSD zabiljezeeno`);
              }}>
              Dodaj stavku
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RentalsPage;
