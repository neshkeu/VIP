import { useState } from "react";
import {
  cashEntries, CashEntry, CashFlowType,
  drivers, getDriverById, getCashSummary, CASH_TYPE_CONFIG,
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, TrendingDown, Wallet, Plus, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";

// ─── HELPERS ─────────────────────────────────────────────────
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}. ${MONTHS_SR[dt.getMonth()]} ${dt.getFullYear()}`;
}

const CASH_TYPES_IN: CashFlowType[]  = ["rent_payment", "pos_fee_payment", "debt_payment", "other_income"];
const CASH_TYPES_OUT: CashFlowType[] = ["fuel_vat_payout", "other_expense"];

// ─── FORMA ZA NOVI UNOS ──────────────────────────────────────
function NewEntryDialog() {
  const [open, setOpen]           = useState(false);
  const [direction, setDirection] = useState<"in"|"out">("in");
  const [type, setType]           = useState<CashFlowType>("rent_payment");
  const [driverId, setDriverId]   = useState("");
  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [date, setDate]           = useState(new Date().toISOString().split("T")[0]);
  const [by, setBy]               = useState("");

  const types = direction === "in" ? CASH_TYPES_IN : CASH_TYPES_OUT;

  const reset = () => {
    setDirection("in"); setType("rent_payment"); setDriverId("");
    setAmount(""); setDesc(""); setBy(""); setDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4"/>Novi unos</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novi kasa unos</DialogTitle>
          <DialogDescription>Evidentirajte prihod ili rashod</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-3">
          {/* Prihod / Rashod toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => { setDirection("in"); setType("rent_payment"); }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                direction === "in" ? "bg-green-50 border-green-400 text-green-700" : "hover:bg-muted"}`}>
              <ArrowDownLeft className="h-4 w-4"/>Prihod
            </button>
            <button type="button"
              onClick={() => { setDirection("out"); setType("fuel_vat_payout"); }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 text-sm font-medium transition-all ${
                direction === "out" ? "bg-red-50 border-red-400 text-red-700" : "hover:bg-muted"}`}>
              <ArrowUpRight className="h-4 w-4"/>Rashod
            </button>
          </div>

          {/* Tip */}
          <div className="grid gap-2">
            <Label>Tip</Label>
            <Select value={type} onValueChange={v => setType(v as CashFlowType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t} value={t}>{CASH_TYPE_CONFIG[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vozac (opciono) */}
          <div className="grid gap-2">
            <Label>Vozač <span className="text-muted-foreground font-normal">(opciono)</span></Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Nije vezano za vozača" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— Nije vezano za vozača —</SelectItem>
                {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Iznos (RSD)</Label>
              <Input type="number" placeholder="3500" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Datum</Label>
              <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Opis</Label>
            <Input placeholder="Renta, napomena..." value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Evidentirao/la</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Otkazi</Button>
          <Button
            disabled={!amount || !by}
            onClick={() => {
              setOpen(false);
              const dir = direction === "in" ? "prihod" : "rashod";
              toast.success(`Evidentiran ${dir}: ${fmt(Number(amount))} — ${by}`);
              reset();
            }}>
            Sačuvaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── RED TABELE ───────────────────────────────────────────────
function EntryRow({ entry }: { entry: CashEntry }) {
  const driver = entry.driver_id ? getDriverById(entry.driver_id) : null;
  const isIn   = entry.direction === "in";

  return (
    <TableRow>
      <TableCell className="text-xs text-muted-foreground">{fmtDate(entry.date)}</TableCell>
      <TableCell>
        <Badge variant="outline" className={`text-xs ${isIn ? "text-green-700 border-green-300" : "text-red-700 border-red-300"}`}>
          {isIn ? <ArrowDownLeft className="h-3 w-3 mr-1 inline"/> : <ArrowUpRight className="h-3 w-3 mr-1 inline"/>}
          {CASH_TYPE_CONFIG[entry.type].label}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{driver?.full_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{entry.description}</TableCell>
      <TableCell>
        <span className={`font-bold text-sm ${isIn ? "text-green-600" : "text-red-500"}`}>
          {isIn ? "+" : "−"}{fmt(entry.amount)}
        </span>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{entry.received_by}</TableCell>
    </TableRow>
  );
}

// ─── DNEVNI PREGLED ───────────────────────────────────────────
function DailyView({ entries }: { entries: CashEntry[] }) {
  // Grupiši po datumu
  const byDate = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {} as Record<string, CashEntry[]>);

  const sortedDates = Object.keys(byDate).sort().reverse();

  if (sortedDates.length === 0) return (
    <p className="text-center text-muted-foreground py-10">Nema unosa za ovaj period</p>
  );

  return (
    <div className="space-y-4">
      {sortedDates.map(date => {
        const dayEntries = byDate[date];
        const dayIn  = dayEntries.filter(e => e.direction === "in").reduce((s,e) => s+e.amount, 0);
        const dayOut = dayEntries.filter(e => e.direction === "out").reduce((s,e) => s+e.amount, 0);
        return (
          <motion.div key={date} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
            <Card>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">{fmtDate(date)}</CardTitle>
                  <div className="flex gap-4 text-xs">
                    {dayIn  > 0 && <span className="text-green-600 font-semibold">+{fmt(dayIn)}</span>}
                    {dayOut > 0 && <span className="text-red-500 font-semibold">−{fmt(dayOut)}</span>}
                    <span className={`font-bold ${dayIn-dayOut >= 0 ? "text-green-600" : "text-red-500"}`}>
                      = {fmt(dayIn - dayOut)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    {dayEntries.map(e => <EntryRow key={e.id} entry={e} />)}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const CashPage = () => {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [filterDriver, setFilterDriver] = useState("");
  const [filterType, setFilterType]     = useState<"all"|"in"|"out">("all");

  const summary = getCashSummary(year, month);

  // Filter
  const filtered = summary.entries.filter(e => {
    const matchDriver = !filterDriver || e.driver_id === filterDriver;
    const matchType   = filterType === "all" || e.direction === filterType;
    return matchDriver && matchType;
  });

  const prevMonth = () => { if (month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if (month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kasa</h1>
          <p className="text-muted-foreground text-sm">Sve uplate i isplate</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}><TrendingDown className="h-3.5 w-3.5 rotate-90"/></Button>
            <span className="font-semibold min-w-[150px] text-center text-sm">{MONTHS_SR[month-1]} {year}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}><TrendingUp className="h-3.5 w-3.5 rotate-90"/></Button>
          </div>
          <NewEntryDialog />
        </div>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ukupno prihod" value={fmt(summary.income)}  icon={ArrowDownLeft} trend={`${summary.entries.filter(e=>e.direction==="in").length} unosa`} />
        <StatCard title="Ukupno rashod" value={fmt(summary.expense)} icon={ArrowUpRight}  trend={`${summary.entries.filter(e=>e.direction==="out").length} unosa`} />
        <div className={`rounded-xl border p-4 ${summary.balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className={`h-4 w-4 ${summary.balance >= 0 ? "text-green-600" : "text-red-500"}`} />
            <p className="text-sm text-muted-foreground">Bilans</p>
          </div>
          <p className={`text-2xl font-bold font-display ${summary.balance >= 0 ? "text-green-600" : "text-red-500"}`}>
            {summary.balance >= 0 ? "+" : ""}{fmt(summary.balance)}
          </p>
        </div>
      </div>

      {/* FILTERI */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterDriver} onValueChange={setFilterDriver}>
          <SelectTrigger className="w-48 h-8 text-sm"><SelectValue placeholder="Svi vozači" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Svi vozači</SelectItem>
            {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex rounded-lg border overflow-hidden h-8">
          {(["all","in","out"] as const).map(t => (
            <button key={t} type="button"
              onClick={() => setFilterType(t)}
              className={`px-3 text-xs font-medium transition-colors ${filterType === t ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              {t === "all" ? "Sve" : t === "in" ? "Prihodi" : "Rashodi"}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground self-center">{filtered.length} unosa</span>
      </div>

      <Separator />

      {/* TABS — dnevni / tabela */}
      <Tabs defaultValue="daily">
        <TabsList>
          <TabsTrigger value="daily">Po danima</TabsTrigger>
          <TabsTrigger value="table">Tabela</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4">
          <DailyView entries={filtered} />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Vozač</TableHead>
                    <TableHead>Opis</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Evidentirao</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].sort((a,b) => b.date.localeCompare(a.date)).map(e => (
                    <EntryRow key={e.id} entry={e} />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CashPage;
