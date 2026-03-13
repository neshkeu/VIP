import { useState } from "react";
import {
  drivers, vehicles, posTerminalCharges, posTerminalPayments,
  getDriverById, getVehicleById,
  getPosTerminalPaymentsByCharge,
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Plus, CreditCard, CheckCircle2, AlertCircle, Clock,
  ChevronDown, ChevronUp, User, CalendarDays, Settings
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── HELPERS ─────────────────────────────────────────────────
const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Juni",
  "Juli", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar"
];

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return `${MONTHS[parseInt(mo) - 1]} ${y}`;
}

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

type ChargeStatus = "paid" | "partial" | "pending";

const STATUS_CFG: Record<ChargeStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  paid:    { label: "Plaćeno",     color: "text-green-700",   bg: "bg-green-50 border-green-200",    icon: CheckCircle2 },
  partial: { label: "Djelimično",  color: "text-amber-700",   bg: "bg-amber-50 border-amber-200",    icon: Clock },
  pending: { label: "Nije plaćeno", color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", icon: AlertCircle },
};

// ─── KARTICA ZADUZENJA ───────────────────────────────────────
function ChargeCard({ charge }: { charge: typeof posTerminalCharges[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [payNote, setPayNote] = useState("");

  const driver = getDriverById(charge.driver_id);
  const vehicle = getVehicleById(charge.vehicle_id);
  const payments = getPosTerminalPaymentsByCharge(charge.id);
  const remaining = charge.amount - charge.paid_amount;
  const progress = Math.round((charge.paid_amount / charge.amount) * 100);
  const cfg = STATUS_CFG[charge.status];
  const Icon = cfg.icon;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border ${cfg.bg} overflow-hidden`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            {/* Lijeva strana */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white border">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{driver?.full_name ?? "—"}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {vehicle && (
                    <Badge variant="secondary" className="font-mono text-xs px-1.5">{vehicle.taxi_license_number}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{vehicle?.pos_terminal_id}</span>
                </div>
              </div>
            </div>

            {/* Desna strana */}
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-base">{fmt(charge.amount)}</p>
              <Badge variant="outline" className={`text-xs mt-0.5 ${cfg.color}`}>
                <Icon className="h-3 w-3 mr-1" />{cfg.label}
              </Badge>
            </div>
          </div>

          {/* Progress bar */}
          {charge.status !== "pending" && (
            <div className="mt-3 space-y-1">
              <Progress value={progress} className="h-1.5" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Plaćeno: {fmt(charge.paid_amount)}</span>
                {remaining > 0 && <span className="text-destructive font-medium">Ostalo: {fmt(remaining)}</span>}
              </div>
            </div>
          )}

          {/* Akcije */}
          <div className="flex items-center justify-between mt-3">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {payments.length > 0 ? `${payments.length} uplata` : "Nema uplata"}
            </button>

            {charge.status !== "paid" && (
              <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />Evidentiraj uplatu
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Uplata POS naknade</DialogTitle>
                    <DialogDescription>
                      {driver?.full_name} — {fmtMonth(charge.month)} — ostalo: {fmt(remaining)}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label>Iznos uplate (RSD)</Label>
                      <Input
                        type="number"
                        placeholder={String(remaining)}
                        value={payAmount}
                        onChange={e => setPayAmount(e.target.value)}
                      />
                      {payAmount && Number(payAmount) >= remaining && (
                        <p className="text-xs text-green-600">✓ Naknada će biti potpuno izmirena</p>
                      )}
                      {payAmount && Number(payAmount) < remaining && Number(payAmount) > 0 && (
                        <p className="text-xs text-amber-600">Djelimična uplata — ostaje {fmt(remaining - Number(payAmount))}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label>Primio/la</Label>
                      <Input
                        placeholder="Ime zaposlenog"
                        value={receivedBy}
                        onChange={e => setReceivedBy(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Napomena (opciono)</Label>
                      <Input
                        placeholder="Broj priznanice, napomena..."
                        value={payNote}
                        onChange={e => setPayNote(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPayDialogOpen(false)}>Otkazi</Button>
                    <Button
                      disabled={!payAmount || Number(payAmount) <= 0 || !receivedBy}
                      onClick={() => {
                        setPayDialogOpen(false);
                        toast.success(`Evidentirano ${fmt(Number(payAmount))} — primio/la ${receivedBy}`);
                        setPayAmount(""); setReceivedBy(""); setPayNote("");
                      }}
                    >
                      Sačuvaj
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* Historija uplata */}
        <AnimatePresence>
          {expanded && payments.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Separator />
              <div className="px-4 py-3 space-y-2 bg-white/60">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Historija uplata</p>
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                      <span>{fmt(p.amount)}</span>
                      <span className="text-muted-foreground text-xs">— primio/la <strong>{p.received_by}</strong></span>
                    </div>
                    <span className="text-xs text-muted-foreground">{p.payment_date}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
          {expanded && payments.length === 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Separator />
              <p className="text-center text-xs text-muted-foreground py-3">Nema evidentiranih uplata</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const PosFeesPage = () => {
  const [selectedMonth, setSelectedMonth] = useState("2025-03");
  const [genDialogOpen, setGenDialogOpen] = useState(false);
  const [feesDialogOpen, setFeesDialogOpen] = useState(false);
  const [editFees, setEditFees] = useState<Record<string, string>>({});

  const activeDrivers = drivers.filter(d => d.status === "active");

  // Filtriranje po mjesecu
  const chargesForMonth = posTerminalCharges.filter(c => c.month === selectedMonth);
  const totalForMonth = chargesForMonth.reduce((s, c) => s + c.amount, 0);
  const paidForMonth = chargesForMonth.filter(c => c.status === "paid").reduce((s, c) => s + c.amount, 0);
  const partialForMonth = chargesForMonth.filter(c => c.status === "partial");
  const pendingCount = chargesForMonth.filter(c => c.status !== "paid").length;

  // Raspoređivanje po statusu za tab prikaz
  const paid = chargesForMonth.filter(c => c.status === "paid");
  const notPaid = chargesForMonth.filter(c => c.status !== "paid");

  // Dostupni mjeseci za filter
  const months = [...new Set(posTerminalCharges.map(c => c.month))].sort().reverse();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">POS Naknade</h1>
          <p className="text-muted-foreground">Mjesečna naknada za korišćenje kartičnih terminala</p>
        </div>
        <div className="flex gap-2 flex-wrap">

          {/* Postavljanje naknada */}
          <Dialog open={feesDialogOpen} onOpenChange={setFeesDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="mr-2 h-4 w-4" />Naknade po vozaču
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Mjesečna naknada po vozaču</DialogTitle>
                <DialogDescription>Postavi fiksni iznos naknade za svakog vozača</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-4">
                {activeDrivers.map(d => {
                  const v = vehicles.find(v => v.id === d.vehicle_id);
                  return (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.full_name}</p>
                        {v && <p className="text-xs text-muted-foreground">{v.taxi_license_number} · {v.pos_terminal_id}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          className="w-28 h-8 text-sm"
                          defaultValue={d.pos_monthly_fee}
                          value={editFees[d.id] ?? d.pos_monthly_fee}
                          onChange={e => setEditFees(prev => ({ ...prev, [d.id]: e.target.value }))}
                        />
                        <span className="text-xs text-muted-foreground">RSD</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setFeesDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => {
                  setFeesDialogOpen(false);
                  toast.success("Naknade ažurirane");
                }}>
                  Sačuvaj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Generisanje novog mjeseca */}
          <Dialog open={genDialogOpen} onOpenChange={setGenDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />Generiši mjesec
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generisanje naknade za novi mjesec</DialogTitle>
                <DialogDescription>
                  Sistem će automatski kreirati zaduženja za sve aktivne vozače prema njihovim naknadama.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Mjesec</Label>
                  <Input type="month" defaultValue="2025-04" />
                </div>
                <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
                  <p className="text-sm font-medium">Pregled koji će biti generisano:</p>
                  {activeDrivers.filter(d => d.pos_monthly_fee > 0).map(d => {
                    const v = vehicles.find(v => v.id === d.vehicle_id);
                    return (
                      <div key={d.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{d.full_name}</span>
                        <span className="font-medium">{fmt(d.pos_monthly_fee)}</span>
                      </div>
                    );
                  })}
                  <Separator />
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span>Ukupno</span>
                    <span>{fmt(activeDrivers.reduce((s, d) => s + d.pos_monthly_fee, 0))}</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setGenDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => {
                  setGenDialogOpen(false);
                  toast.success("Naknade za April 2025 su kreirane za sve aktivne vozače");
                }}>
                  Kreiraj zaduženja
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* FILTER MJESECA */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-2 flex-wrap">
          {months.map(m => (
            <button
              key={m}
              onClick={() => setSelectedMonth(m)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-all border ${
                selectedMonth === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background hover:bg-muted border-border"
              }`}
            >
              {fmtMonth(m)}
            </button>
          ))}
        </div>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ukupno za mjesec" value={fmt(totalForMonth)} icon={CreditCard} />
        <StatCard title="Naplaćeno" value={fmt(paidForMonth)} icon={CheckCircle2} />
        <StatCard title="Neplaćeno/djelimično" value={pendingCount} icon={AlertCircle} />
        <StatCard title="Aktivnih vozača" value={activeDrivers.filter(d => d.pos_monthly_fee > 0).length} icon={User} />
      </div>

      {/* KARTICE ZADUZENJA */}
      {chargesForMonth.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nema naknade za {fmtMonth(selectedMonth)}</p>
            <Button className="mt-4" onClick={() => setGenDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Generiši ovaj mjesec
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              Neplaćeno
              {notPaid.length > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs">{notPaid.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="paid">
              Plaćeno
              {paid.length > 0 && (
                <Badge variant="secondary" className="ml-2 text-xs">{paid.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">Svi vozači</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {notPaid.length === 0 ? (
              <Card><CardContent className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">Svi su platili za {fmtMonth(selectedMonth)} 🎉</p>
              </CardContent></Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
                {notPaid.map(c => <ChargeCard key={c.id} charge={c} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paid">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {paid.map(c => <ChargeCard key={c.id} charge={c} />)}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {chargesForMonth.map(c => <ChargeCard key={c.id} charge={c} />)}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* PREGLED PO VOZACU - sve naknade */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base">Pregled naknada po vozaču</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozač</TableHead>
                <TableHead>Terminal</TableHead>
                <TableHead>Naknada/mj.</TableHead>
                <TableHead>{fmtMonth(selectedMonth)}</TableHead>
                <TableHead>Plaćeno</TableHead>
                <TableHead>Ostalo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeDrivers.filter(d => d.pos_monthly_fee > 0).map(d => {
                const v = vehicles.find(v => v.id === d.vehicle_id);
                const charge = chargesForMonth.find(c => c.driver_id === d.id);
                const cfg = charge ? STATUS_CFG[charge.status] : null;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.full_name}</TableCell>
                    <TableCell>
                      {v ? <Badge variant="outline" className="font-mono text-xs">{v.pos_terminal_id}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(d.pos_monthly_fee)}</TableCell>
                    <TableCell>
                      {charge && cfg ? (
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">Nije kreirano</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-green-600">{fmt(charge?.paid_amount ?? 0)}</TableCell>
                    <TableCell className={charge && (charge.amount - charge.paid_amount) > 0 ? "text-destructive font-semibold" : "text-green-600"}>
                      {charge ? fmt(charge.amount - charge.paid_amount) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PosFeesPage;
