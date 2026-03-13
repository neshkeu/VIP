import { useState } from "react";
import {
  drivers, driverDebts, debtPayments,
  getDriverById, getDebtsByDriver, getPaymentsByDebt, getPaidForDebt, getTotalDebtByDriver,
  type DebtType, type DriverDebt,
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/StatCard";
import { Separator } from "@/components/ui/separator";
import {
  Plus, User, AlertTriangle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, CreditCard, Banknote, Shield, HelpCircle, Wrench
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── KONFIGURACIJA TIPOVA ────────────────────────────────────
const DEBT_TYPE_CFG: Record<DebtType, { label: string; icon: typeof AlertTriangle; color: string; bg: string }> = {
  pos_fee: { label: "POS Naknada",   icon: CreditCard,    color: "text-blue-700",    bg: "bg-blue-50 border-blue-200" },
  damage:  { label: "Šteta",         icon: Wrench,        color: "text-red-700",     bg: "bg-red-50 border-red-200" },
  penalty: { label: "Kazna/Penal",   icon: Shield,        color: "text-orange-700",  bg: "bg-orange-50 border-orange-200" },
  loan:    { label: "Pozajmica",     icon: Banknote,      color: "text-purple-700",  bg: "bg-purple-50 border-purple-200" },
  other:   { label: "Ostalo",        icon: HelpCircle,    color: "text-gray-700",    bg: "bg-gray-50 border-gray-200" },
};

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

// ─── DIJALOG ZA NOVU UPLATU ──────────────────────────────────
function PaymentDialog({
  debt,
  open,
  onClose,
}: {
  debt: DriverDebt;
  open: boolean;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [receivedBy, setReceivedBy] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const paid = getPaidForDebt(debt.id);
  const remaining = debt.total_amount - paid;
  const driver = getDriverById(debt.driver_id);

  const reset = () => { setAmount(""); setReceivedBy(""); setNote(""); };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Evidentiraj uplatu</DialogTitle>
          <DialogDescription>
            <span className="font-medium">{driver?.full_name}</span> — {debt.description}
          </DialogDescription>
        </DialogHeader>

        {/* Stanje duga */}
        <div className="rounded-lg bg-muted/40 border p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ukupan dug</span>
            <span className="font-semibold">{fmt(debt.total_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Već plaćeno</span>
            <span className="text-green-600 font-semibold">{fmt(paid)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-sm">
            <span className="font-medium">Ostalo za platiti</span>
            <span className="text-destructive font-bold">{fmt(remaining)}</span>
          </div>
          <Progress value={Math.round((paid / debt.total_amount) * 100)} className="h-1.5" />
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Iznos uplate (RSD)</Label>
            <Input
              type="number"
              placeholder={String(remaining)}
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            {amount && Number(amount) > 0 && (
              <p className={`text-xs ${Number(amount) >= remaining ? "text-green-600" : "text-amber-600"}`}>
                {Number(amount) >= remaining
                  ? "✓ Dug će biti potpuno izmiren"
                  : `Djelimična uplata — ostaje ${fmt(remaining - Number(amount))}`}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Datum uplate</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Primio/la (ime zaposlenog)</Label>
            <Input
              placeholder="npr. Nemanja, Milica..."
              value={receivedBy}
              onChange={e => setReceivedBy(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Napomena (opciono)</Label>
            <Input
              placeholder="Broj priznanice, napomena..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Otkazi</Button>
          <Button
            disabled={!amount || Number(amount) <= 0 || !receivedBy}
            onClick={() => {
              toast.success(`Evidentirano ${fmt(Number(amount))} — primio/la ${receivedBy}`);
              onClose(); reset();
            }}
          >
            Sačuvaj uplatu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── KARTICA JEDNOG DUGA ─────────────────────────────────────
function DebtCard({ debt, onPayment }: { debt: DriverDebt; onPayment: (debt: DriverDebt) => void }) {
  const [expanded, setExpanded] = useState(false);
  const paid = getPaidForDebt(debt.id);
  const remaining = debt.total_amount - paid;
  const progress = Math.round((paid / debt.total_amount) * 100);
  const payments = getPaymentsByDebt(debt.id);
  const cfg = DEBT_TYPE_CFG[debt.type];
  const Icon = cfg.icon;
  const isClosed = debt.status === "closed" || remaining <= 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
      <Card className={`border overflow-hidden transition-shadow hover:shadow-md ${isClosed ? "opacity-70" : ""}`}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border ${cfg.bg}`}>
                <Icon className={`h-4 w-4 ${cfg.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{debt.description}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{debt.date} · kreirao <strong>{debt.created_by}</strong></p>
              </div>
            </div>
            <Badge variant="outline" className={`flex-shrink-0 text-xs ${cfg.color}`}>
              {cfg.label}
            </Badge>
          </div>

          {/* Iznosi */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-muted/40 p-2">
              <p className="text-muted-foreground">Ukupno</p>
              <p className="font-bold mt-0.5">{fmt(debt.total_amount)}</p>
            </div>
            <div className="rounded-md bg-green-50 border border-green-100 p-2">
              <p className="text-muted-foreground">Plaćeno</p>
              <p className="font-bold text-green-700 mt-0.5">{fmt(paid)}</p>
            </div>
            <div className={`rounded-md p-2 border ${isClosed ? "bg-green-50 border-green-100" : "bg-destructive/5 border-destructive/10"}`}>
              <p className="text-muted-foreground">Ostalo</p>
              <p className={`font-bold mt-0.5 ${isClosed ? "text-green-700" : "text-destructive"}`}>
                {isClosed ? "Izmireno ✓" : fmt(remaining)}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <Progress value={progress} className="h-1.5" />
            <p className="text-xs text-muted-foreground text-right">{progress}% plaćeno</p>
          </div>

          {/* Akcije */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {payments.length === 0 ? "Nema uplata" : `${payments.length} uplata`}
            </button>
            {!isClosed && (
              <Button size="sm" className="h-7 text-xs" onClick={() => onPayment(debt)}>
                <Plus className="h-3 w-3 mr-1" />Dodaj uplatu
              </Button>
            )}
            {isClosed && (
              <Badge variant="secondary" className="text-xs text-green-700 bg-green-50">
                <CheckCircle2 className="h-3 w-3 mr-1" />Izmireno
              </Badge>
            )}
          </div>
        </div>

        {/* Historija uplata */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Separator />
              <div className="p-4 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Historija uplata
                </p>
                {payments.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">Nema evidentiranih uplata</p>
                ) : (
                  payments.map(p => (
                    <div key={p.id} className="flex items-center justify-between bg-white rounded-md border px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <div>
                          <span className="text-sm font-semibold">{fmt(p.amount)}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            primio/la <strong>{p.received_by}</strong>
                          </span>
                          {p.notes && <span className="text-xs text-muted-foreground ml-1">— {p.notes}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground flex-shrink-0">{p.payment_date}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── DIJALOG ZA NOVI DUG ─────────────────────────────────────
function NewDebtDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [driverId, setDriverId] = useState("");
  const [type, setType] = useState<DebtType>("damage");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [createdBy, setCreatedBy] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => {
    setDriverId(""); setType("damage"); setDescription("");
    setAmount(""); setCreatedBy(""); setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { onClose(); reset(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novi dug vozača</DialogTitle>
          <DialogDescription>Kreiraj novo dugovanje za vozača</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label>Vozač</Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
              <SelectContent>
                {drivers.filter(d => d.status === "active").map(d => (
                  <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Tip dugovanja</Label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(DEBT_TYPE_CFG) as [DebtType, typeof DEBT_TYPE_CFG[DebtType]][]).map(([key, cfg]) => {
                const Icon = cfg.icon;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all text-left ${
                      type === key ? `${cfg.bg} ${cfg.color} border-current` : "hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Opis</Label>
            <Input
              placeholder={
                type === "damage" ? "npr. Šteta na vozilu — ogrebotina boka" :
                type === "penalty" ? "npr. Saobraćajna kazna 15.03.2025" :
                type === "loan" ? "npr. Pozajmica — lični razlog" :
                type === "pos_fee" ? "npr. POS naknada Mart 2025" :
                "Opis dugovanja..."
              }
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Iznos (RSD)</Label>
              <Input type="number" placeholder="50000" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Kreirao/la</Label>
            <Input placeholder="Vaše ime" value={createdBy} onChange={e => setCreatedBy(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Napomena (opciono)</Label>
            <Textarea
              placeholder="Detalji, dogovor o vraćanju..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="resize-none h-20"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); reset(); }}>Otkazi</Button>
          <Button
            disabled={!driverId || !description || !amount || Number(amount) <= 0 || !createdBy}
            onClick={() => {
              const driver = getDriverById(driverId);
              toast.success(`Dug kreiran za ${driver?.full_name} — ${fmt(Number(amount))}`);
              onClose(); reset();
            }}
          >
            Kreiraj dug
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const DebtsPage = () => {
  const [newDebtOpen, setNewDebtOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DriverDebt | null>(null);
  const [filterDriver, setFilterDriver] = useState("all");
  const [filterType, setFilterType] = useState<DebtType | "all">("all");
  const [activeTab, setActiveTab] = useState("open");

  // Stat kartice
  const totalOpen = driverDebts
    .filter(d => d.status === "open")
    .reduce((s, d) => s + (d.total_amount - getPaidForDebt(d.id)), 0);
  const totalDriversWithDebt = [...new Set(driverDebts.filter(d => d.status === "open").map(d => d.driver_id))].length;
  const closedCount = driverDebts.filter(d => d.status === "closed" || getPaidForDebt(d.id) >= d.total_amount).length;
  const openCount = driverDebts.filter(d => d.status === "open" && getPaidForDebt(d.id) < d.total_amount).length;

  // Filtriranje
  const filtered = driverDebts.filter(d => {
    const matchDriver = filterDriver === "all" || d.driver_id === filterDriver;
    const matchType = filterType === "all" || d.type === filterType;
    const isPaid = getPaidForDebt(d.id) >= d.total_amount;
    const matchTab = activeTab === "open" ? !isPaid && d.status === "open" : isPaid || d.status === "closed";
    return matchDriver && matchType && matchTab;
  });

  // Grupisi po vozacu za open tab
  const byDriver = drivers
    .filter(d => d.status === "active")
    .map(d => ({
      driver: d,
      debts: filtered.filter(debt => debt.driver_id === d.id),
      totalOwed: getTotalDebtByDriver(d.id),
    }))
    .filter(x => x.debts.length > 0);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dugovanja</h1>
          <p className="text-muted-foreground">Evidencija dugova vozača — štete, kazne, POS naknade, pozajmice</p>
        </div>
        <Button onClick={() => setNewDebtOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />Novi dug
        </Button>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ukupno otvorenih dugova" value={fmt(totalOpen)} icon={AlertTriangle} />
        <StatCard title="Vozača sa dugom" value={totalDriversWithDebt} icon={User} />
        <StatCard title="Otvorenih stavki" value={openCount} icon={Clock} />
        <StatCard title="Izmirenih stavki" value={closedCount} icon={CheckCircle2} />
      </div>

      {/* FILTERI */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterDriver} onValueChange={setFilterDriver}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Svi vozači" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi vozači</SelectItem>
            {drivers.filter(d => d.status === "active").map(d => (
              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={v => setFilterType(v as DebtType | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tip dugovanja" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Svi tipovi</SelectItem>
            {(Object.entries(DEBT_TYPE_CFG) as [DebtType, typeof DEBT_TYPE_CFG[DebtType]][]).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* TABOVI */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="open">
            Otvorena dugovanja
            {openCount > 0 && <Badge variant="destructive" className="ml-2 text-xs">{openCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="closed">
            Izmirena
            {closedCount > 0 && <Badge variant="secondary" className="ml-2 text-xs">{closedCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4">
          {byDriver.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-muted-foreground">Nema otvorenih dugova</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {byDriver.map(({ driver, debts, totalOwed }) => (
                <div key={driver.id} className="space-y-3">
                  {/* Vozac header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{driver.full_name}</p>
                        <p className="text-xs text-muted-foreground">{debts.length} otvorenih dugova</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Ukupno duguje</p>
                      <p className="font-bold text-destructive">{fmt(totalOwed)}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {debts.map(d => (
                      <DebtCard key={d.id} debt={d} onPayment={setPaymentDebt} />
                    ))}
                  </div>
                  <Separator />
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(d => (
              <DebtCard key={d.id} debt={d} onPayment={setPaymentDebt} />
            ))}
          </div>
          {filtered.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground text-sm">Nema izmirenih dugova za izabrani filter</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Dijalozi */}
      <NewDebtDialog open={newDebtOpen} onClose={() => setNewDebtOpen(false)} />
      {paymentDebt && (
        <PaymentDialog
          debt={paymentDebt}
          open={!!paymentDebt}
          onClose={() => setPaymentDebt(null)}
        />
      )}
    </div>
  );
};

export default DebtsPage;
