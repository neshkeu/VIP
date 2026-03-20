import { useState } from "react";
import {
  cashEntries, obracunDays, CashType, CashEntry,
  drivers, CASH_TYPE_CONFIG, getDriverById,
  getCashForPeriod, getCashBalance,
} from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownLeft, ArrowUpRight, Wallet, Plus,
  CheckCircle2, Clock, ChevronDown, ChevronUp, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/StatCard";

// ─── HELPERS ─────────────────────────────────────────────────
const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function fmtDate(d: string) {
  const dt  = new Date(d + "T00:00:00");
  const dow = DAYS_SR[dt.getDay()];
  return `${dow}, ${dt.getDate()}. ${MONTHS_SR[dt.getMonth()]}`;
}
function isObracunDay(date: string) {
  const dow = new Date(date + "T00:00:00").getDay();
  return dow === 1 || dow === 3 || dow === 5; // pon, sri, pet
}

const ULAZ_TYPES:  CashType[] = ["renta","clanarina","pos_naknada","komunalni","doprinosi","dugovanje","likvidnost_in"];
const IZLAZ_TYPES: CashType[] = ["yandex","kartica","vaučer","pdv_gorivo","likvidnost_out"];

// ─── NOVI UNOS DIALOG ────────────────────────────────────────
function NewEntryDialog() {
  const [open, setOpen]         = useState(false);
  const [dir, setDir]           = useState<"in"|"out">("in");
  const [type, setType]         = useState<CashType>("renta");
  const [driverId, setDriverId] = useState("none");
  const [amount, setAmount]     = useState("");
  const [desc, setDesc]         = useState("");
  const [date, setDate]         = useState(new Date().toISOString().split("T")[0]);
  const [by, setBy]             = useState("");

  const types = dir === "in" ? ULAZ_TYPES : IZLAZ_TYPES;

  const reset = () => {
    setDir("in"); setType("renta"); setDriverId("none");
    setAmount(""); setDesc(""); setBy("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4"/>Novi unos</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novi kasa unos</DialogTitle>
          <DialogDescription>Evidentirajte uplatu ili isplatu</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* ULAZ / IZLAZ toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button type="button"
              onClick={() => { setDir("in");  setType("renta"); }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${
                dir === "in" ? "bg-green-50 border-green-500 text-green-700" : "hover:bg-muted border-border"}`}>
              <ArrowDownLeft className="h-4 w-4"/>Ulaz (+)
            </button>
            <button type="button"
              onClick={() => { setDir("out"); setType("yandex"); }}
              className={`flex items-center justify-center gap-2 rounded-lg border py-3 text-sm font-semibold transition-all ${
                dir === "out" ? "bg-red-50 border-red-500 text-red-700" : "hover:bg-muted border-border"}`}>
              <ArrowUpRight className="h-4 w-4"/>Izlaz (−)
            </button>
          </div>

          {/* Tip */}
          <div className="grid gap-2">
            <Label>Tip</Label>
            <Select value={type} onValueChange={v => setType(v as CashType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {types.map(t => (
                  <SelectItem key={t} value={t}>{CASH_TYPE_CONFIG[t].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Vozač */}
          <div className="grid gap-2">
            <Label>Vozač <span className="text-muted-foreground font-normal text-xs">(opciono)</span></Label>
            <Select value={driverId} onValueChange={setDriverId}>
              <SelectTrigger><SelectValue placeholder="Bez vozača" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Bez vozača —</SelectItem>
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

          {isObracunDay(date) && (
            <div className="flex items-center gap-2 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5"/>
              Obračunski dan — unos će biti vezan za obračun
            </div>
          )}

          <div className="grid gap-2">
            <Label>Opis</Label>
            <Input placeholder="Napomena..." value={desc} onChange={e => setDesc(e.target.value)} />
          </div>

          <div className="grid gap-2">
            <Label>Evidentirao/la</Label>
            <Input placeholder="Nemanja, Milica..." value={by} onChange={e => setBy(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Otkazi</Button>
          <Button disabled={!amount || !by || Number(amount) <= 0}
            onClick={() => {
              setOpen(false);
              toast.success(`Evidentirano: ${dir === "in" ? "+" : "−"}${fmt(Number(amount))} — ${by}`);
              reset();
            }}>
            Sačuvaj
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── OBRACUNSKI DAN KARTICA ──────────────────────────────────
function ObracunCard({ date, entries }: { date: string; entries: CashEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const obracun = obracunDays.find(o => o.date === date);
  const total_in  = entries.filter(e => e.direction === "in").reduce((s,e) => s+e.amount, 0);
  const total_out = entries.filter(e => e.direction === "out").reduce((s,e) => s+e.amount, 0);
  const balance   = total_in - total_out;
  const closingBalance = (obracun?.opening_balance ?? 0) + balance;

  return (
    <motion.div layout initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
      <Card className={`overflow-hidden border-l-4 ${obracun?.confirmed ? "border-l-green-500" : "border-l-amber-400"}`}>
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {obracun?.confirmed
                ? <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0"/>
                : <Clock className="h-5 w-5 text-amber-500 flex-shrink-0"/>
              }
              <div>
                <p className="font-semibold text-sm">{fmtDate(date)}</p>
                <p className="text-xs text-muted-foreground">
                  {obracun?.confirmed ? `Zatvoren — ${obracun.confirmed_by}` : "Nije zatvoren"}
                </p>
              </div>
            </div>

            {/* Sumarno */}
            <div className="flex items-center gap-4 text-sm">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Ulaz</p>
                <p className="font-semibold text-green-600">+{fmt(total_in)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Izlaz</p>
                <p className="font-semibold text-red-500">−{fmt(total_out)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Stanje kase</p>
                <p className="font-bold text-base">{fmt(closingBalance)}</p>
              </div>
              <button onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground hover:text-foreground transition-colors ml-2">
                {expanded ? <ChevronUp className="h-4 w-4"/> : <ChevronDown className="h-4 w-4"/>}
              </button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
              <Separator />
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tip</TableHead>
                      <TableHead>Vozač</TableHead>
                      <TableHead>Opis</TableHead>
                      <TableHead>Iznos</TableHead>
                      <TableHead>Evidentirao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(e => {
                      const cfg    = CASH_TYPE_CONFIG[e.type];
                      const driver = e.driver_id ? getDriverById(e.driver_id) : null;
                      return (
                        <TableRow key={e.id}>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{driver?.full_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                          <TableCell>
                            <span className={`font-bold text-sm ${e.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                              {e.direction === "in" ? "+" : "−"}{fmt(e.amount)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Zatvori obracun dugme */}
                {!obracun?.confirmed && (
                  <div className="p-3 border-t bg-amber-50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <AlertCircle className="h-4 w-4"/>
                      Obračun nije zatvoren — ukupno u kasi: <strong>{fmt(closingBalance)}</strong>
                    </div>
                    <Button size="sm" onClick={() => toast.success(`Obračun za ${fmtDate(date)} zatvoren`)}>
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5"/>Zatvori obračun
                    </Button>
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

// ─── GLAVNA STRANICA ─────────────────────────────────────────
const CashPage = () => {
  const [filterMonth, setFilterMonth] = useState("2026-03");

  const { entries, total_in, total_out, balance } = getCashForPeriod(
    filterMonth + "-01",
    filterMonth + "-31"
  );

  const currentBalance = getCashBalance("2026-03-17");

  // Grupiši unose po datumu
  const byDate = entries.reduce((acc, e) => {
    if (!acc[e.date]) acc[e.date] = [];
    acc[e.date].push(e);
    return acc;
  }, {} as Record<string, CashEntry[]>);

  // Generiši SVE pon/sri/pet u izabranom mjesecu — bez obzira ima li unosa
  const [year, month] = filterMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const obracunDates: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dow  = date.getDay();
    if (dow === 1 || dow === 3 || dow === 5) {
      obracunDates.push(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
  }
  // Sortiraj od najnovijeg
  const sortedObracunDates = obracunDates.sort().reverse();

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kasa</h1>
          <p className="text-muted-foreground text-sm">Evidencija svih uplata i isplata · Obračun: pon/sri/pet</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="w-40 h-9" />
          <NewEntryDialog />
        </div>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Trenutno u kasi"  value={fmt(currentBalance)} icon={Wallet} />
        <StatCard title="Ulaz ovaj mj."    value={fmt(total_in)}        icon={ArrowDownLeft} />
        <StatCard title="Izlaz ovaj mj."   value={fmt(total_out)}       icon={ArrowUpRight}  />
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-sm text-muted-foreground">Bilans ovaj mj.</p>
          <p className={`text-2xl font-bold font-display ${balance >= 0 ? "text-green-600" : "text-red-500"}`}>
            {balance >= 0 ? "+" : ""}{fmt(balance)}
          </p>
        </div>
      </div>

      <Tabs defaultValue="obracun">
        <TabsList>
          <TabsTrigger value="obracun">Po obračunima</TabsTrigger>
          <TabsTrigger value="sve">Svi unosi</TabsTrigger>
        </TabsList>

        {/* PO OBRACUNIMA */}
        <TabsContent value="obracun" className="mt-4 space-y-3">
          {sortedObracunDates.map(date => (
            <ObracunCard key={date} date={date} entries={byDate[date] ?? []} />
          ))}
        </TabsContent>

        {/* SVI UNOSI */}
        <TabsContent value="sve" className="mt-4">
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
                  {[...entries].sort((a,b) => b.date.localeCompare(a.date)).map(e => {
                    const cfg    = CASH_TYPE_CONFIG[e.type];
                    const driver = e.driver_id ? getDriverById(e.driver_id) : null;
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(e.date)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${cfg.color}`}>{cfg.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.description}</TableCell>
                        <TableCell>
                          <span className={`font-bold text-sm ${e.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                            {e.direction === "in" ? "+" : "−"}{fmt(e.amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{e.received_by}</TableCell>
                      </TableRow>
                    );
                  })}
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
