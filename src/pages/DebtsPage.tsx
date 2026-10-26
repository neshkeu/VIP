import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { useDebts } from "@/hooks/useDebts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, ChevronDown, ChevronUp, Loader2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { DriverCombobox } from "@/components/DriverCombobox";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { fmtD } from "@/lib/date";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const MONTH_NAMES = ["januar", "februar", "mart", "april", "maj", "jun", "jul", "avgust", "septembar", "oktobar", "novembar", "decembar"];

const DEBT_TYPES = [
  { value: "steta",     label: "Šteta",     color: "text-red-700",    bg: "bg-red-50 border-red-200"    },
  { value: "kazna",     label: "Kazna",     color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  { value: "pozajmica", label: "Pozajmica", color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"  },
  { value: "doprinosi", label: "Doprinosi", color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  { value: "ostalo",    label: "Ostalo",    color: "text-gray-700",   bg: "bg-gray-50 border-gray-200"  },
];

const STATUS_CFG = {
  open:    { label: "Otvoreno",    color: "text-red-700",    variant: "destructive" as const },
  partial: { label: "Djelimično",  color: "text-amber-700",  variant: "secondary"   as const },
  closed:  { label: "Zatvoreno",   color: "text-green-700",  variant: "default"     as const },
};

function DebtCard({ debt }: { debt: any }) {
  const [expanded, setExpanded]   = useState(false);
  const [payOpen, setPayOpen]     = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payBy, setPayBy]         = useState("");
  const [payNote, setPayNote]     = useState("");
  const [saving, setSaving]       = useState(false);

  const { drivers } = useApp();
  const { addPayment, getPaymentsForDebt } = useDebts();

  const driver   = drivers.find(d => d.id === debt.driver_id);
  const payments = getPaymentsForDebt(debt.id);
  const remaining = debt.amount - debt.paid_amount;
  const progress  = Math.round((debt.paid_amount / debt.amount) * 100);
  const typeCfg   = DEBT_TYPES.find(t => t.value === debt.type)!;
  const statusCfg = STATUS_CFG[debt.status as keyof typeof STATUS_CFG];

  return (
    <motion.div layout initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}>
      <Card className={`overflow-hidden border-l-4 ${debt.status === "closed" ? "border-l-green-500" : debt.status === "partial" ? "border-l-amber-400" : "border-l-red-500"}`}>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm">{driver?.full_name ?? "—"}</p>
                <Badge variant="outline" className={`text-xs ${typeCfg.color} ${typeCfg.bg}`}>{typeCfg.label}</Badge>
                <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{debt.description}</p>
              <p className="text-xs text-muted-foreground">{fmtD(debt.date)} · kreirao: {debt.created_by}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-bold text-base">{fmt(debt.amount)}</p>
              {remaining > 0 && <p className="text-xs text-destructive font-medium">Ostalo: {fmt(remaining)}</p>}
            </div>
          </div>

          {/* Progress */}
          {debt.status !== "open" && (
            <div className="mt-3">
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }}/>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Plaćeno: {fmt(debt.paid_amount)} ({progress}%)</p>
            </div>
          )}

          <div className="flex items-center justify-between mt-3">
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              {expanded ? <ChevronUp className="h-3 w-3"/> : <ChevronDown className="h-3 w-3"/>}
              {payments.length} uplata
            </button>
            {debt.status !== "closed" && (
              <Dialog open={payOpen} onOpenChange={setPayOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 text-xs"><Plus className="h-3 w-3 mr-1"/>Uplata</Button>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Evidentiraj uplatu</DialogTitle>
                    <DialogDescription>{driver?.full_name} — ostalo: {fmt(remaining)}</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-3 py-3">
                    <div className="grid gap-1.5">
                      <Label>Iznos (RSD)</Label>
                      <Input type="number" placeholder={String(remaining)} value={payAmount} onChange={e => setPayAmount(e.target.value)}/>
                      {payAmount && Number(payAmount) >= remaining && <p className="text-xs text-green-600">✓ Dug će biti potpuno izmiren</p>}
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Primio/la</Label>
                      <Input value={payBy} onChange={e => setPayBy(e.target.value)}/>
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Napomena</Label>
                      <Input value={payNote} onChange={e => setPayNote(e.target.value)}/>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPayOpen(false)}>Otkazi</Button>
                    <Button disabled={!payAmount || !payBy || saving} onClick={async () => {
                      setSaving(true);
                      try {
                        await addPayment({ debt_id: debt.id, driver_id: debt.driver_id, amount: Number(payAmount), date: new Date().toISOString().split("T")[0], received_by: payBy, notes: payNote });
                        toast.success(`Uplata evidentirana — ${payBy}`);
                        setPayOpen(false); setPayAmount(""); setPayBy(""); setPayNote("");
                      } catch(e: any) { toast.error("Greška: " + e.message); }
                      finally { setSaving(false); }
                    }}>
                      {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        <AnimatePresence>
          {expanded && payments.length > 0 && (
            <motion.div initial={{ height:0, opacity:0 }} animate={{ height:"auto", opacity:1 }} exit={{ height:0, opacity:0 }} className="overflow-hidden">
              <Separator/>
              <div className="px-4 py-3 space-y-2 bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Istorija uplata</p>
                {payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500"/>
                      <span className="font-medium">{fmt(p.amount)}</span>
                      <span className="text-muted-foreground text-xs">primio/la <strong>{p.received_by}</strong></span>
                      {p.notes && <span className="text-muted-foreground text-xs">· {p.notes}</span>}
                    </div>
                    <span className="text-xs text-muted-foreground">{fmtD(p.date)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

const DebtsPage = () => {
  const { drivers, displayName } = useApp();
  const { debts, loading, addDebt } = useDebts();
  
  const [addOpen, setAddOpen]     = useState(false);
  const [driverId, setDriverId]   = useState("none");
  const [type, setType]           = useState("steta");
  const [amount, setAmount]       = useState("");
  const [desc, setDesc]           = useState("");
  const [date, setDate]           = useState(new Date().toISOString().split("T")[0]);
  const [createdBy, setCreatedBy] = useState("");
  const [saving, setSaving]       = useState(false);
  // Doprinosi se vode po mesecima: od–do meseca, po jedno dugovanje za svaki mesec
  const curYM = new Date().toISOString().slice(0, 7);
  const [monthFrom, setMonthFrom] = useState(curYM);
  const [monthTo, setMonthTo]     = useState(curYM);
  const isDopr = type === "doprinosi";

  const reset = () => { setDriverId("none"); setType("steta"); setAmount(""); setDesc(""); setCreatedBy(""); setDate(new Date().toISOString().split("T")[0]); setMonthFrom(curYM); setMonthTo(curYM); };

  // Lista meseci "YYYY-MM" od–do (max 24)
  const monthsInRange = (from: string, to: string): string[] => {
    if (!from) return [];
    const end = to && to >= from ? to : from;
    const out: string[] = [];
    let [y, m] = from.split("-").map(Number);
    while (out.length < 24) {
      const ym = `${y}-${String(m).padStart(2, "0")}`;
      out.push(ym);
      if (ym >= end) break;
      m++; if (m > 12) { m = 1; y++; }
    }
    return out;
  };
  const doprLabel = (ym: string) => `Doprinosi za ${MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
  const doprMonths = isDopr ? monthsInRange(monthFrom, monthTo) : [];
  // Meseci za koje vozač već ima dugovanje za doprinose (da nema duplih)
  const doprExisting = new Set(
    debts.filter(d => d.driver_id === driverId && d.type === "doprinosi")
      .flatMap(d => doprMonths.filter(ym => d.description?.startsWith(doprLabel(ym))))
  );

  // Predlog iznosa iz vozačevih mesečnih doprinosa
  const prefillDopr = (drvId: string, t: string) => {
    if (t !== "doprinosi") return;
    const drv = drivers.find(d => d.id === drvId);
    if (drv && (drv.doprinosi_monthly ?? 0) > 0) setAmount(String(drv.doprinosi_monthly));
  };

  const openDebts   = debts.filter(d => d.status !== "closed");
  const closedDebts = debts.filter(d => d.status === "closed");
  const totalOpen   = openDebts.reduce((s,d) => s + (d.amount - d.paid_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Dugovanja</h1>
          <p className="text-muted-foreground text-sm">Štete, kazne, pozajmice, doprinosi</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Novo dugovanje</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Evidentiraj dugovanje</DialogTitle><DialogDescription>Unesi podatke o dugu vozača</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1.5"><Label>Vozač</Label>
                <DriverCombobox
                  value={driverId === "none" ? "" : driverId}
                  onChange={v => { setDriverId(v); prefillDopr(v, type); }}
                  options={drivers
                    // Doprinose mogu imati i papirološki vozači
                    .filter(d => d.status === "active" && (isDopr || d.role === "operativni"))
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map(d => ({ value: d.id, label: d.full_name }))}
                />
              </div>
              <div className="grid gap-1.5"><Label>Tip</Label>
                <Select value={type} onValueChange={v => { setType(v); prefillDopr(driverId, v); }}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{DEBT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {isDopr ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label>Za mesec od</Label><Input type="month" value={monthFrom} onChange={e => { setMonthFrom(e.target.value); if (!monthTo || monthTo < e.target.value) setMonthTo(e.target.value); }}/></div>
                    <div className="grid gap-1.5"><Label>do meseca</Label><Input type="month" value={monthTo} min={monthFrom} onChange={e => setMonthTo(e.target.value)}/></div>
                  </div>
                  <div className="grid gap-1.5"><Label>Iznos po mesecu (RSD)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)}/></div>
                  {doprMonths.length > 0 && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-2.5 text-xs space-y-1">
                      <p className="font-medium text-purple-800">Biće evidentirano {doprMonths.length - doprExisting.size} {doprMonths.length - doprExisting.size === 1 ? "dugovanje" : "dugovanja"}{Number(amount) > 0 && ` · ukupno ${fmt(Number(amount) * (doprMonths.length - doprExisting.size))}`}:</p>
                      <div className="flex flex-wrap gap-1">
                        {doprMonths.map(ym => (
                          <span key={ym} className={`rounded px-1.5 py-0.5 border ${doprExisting.has(ym) ? "line-through text-muted-foreground bg-white" : "bg-white text-purple-800 border-purple-200"}`}>
                            {MONTH_NAMES[Number(ym.slice(5, 7)) - 1]} {ym.slice(0, 4)}
                          </span>
                        ))}
                      </div>
                      {doprExisting.size > 0 && <p className="text-muted-foreground">Precrtani meseci već postoje za ovog vozača — preskaču se.</p>}
                    </div>
                  )}
                  <div className="grid gap-1.5"><Label>Napomena (opciono)</Label><Input value={desc} onChange={e => setDesc(e.target.value)}/></div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label>Iznos (RSD)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)}/></div>
                    <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
                  </div>
                  <div className="grid gap-1.5"><Label>Opis</Label><Input value={desc} onChange={e => setDesc(e.target.value)}/></div>
                </>
              )}
              <div className="grid gap-1.5"><Label>Kreirao/la</Label><Input value={createdBy} onChange={e => setCreatedBy(e.target.value)}/></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Otkazi</Button>
              <Button disabled={driverId==="none"||!amount||(!isDopr && !desc)||(isDopr && doprMonths.length - doprExisting.size === 0)||!createdBy||saving} onClick={async () => {
                setSaving(true);
                try {
                  if (isDopr) {
                    // Po jedno dugovanje za svaki mesec (datum = 1. u mesecu), bez duplih
                    const toCreate = doprMonths.filter(ym => !doprExisting.has(ym));
                    for (const ym of toCreate) {
                      await addDebt({
                        driver_id: driverId, type: "doprinosi", amount: Number(amount), date: `${ym}-01`,
                        description: doprLabel(ym) + (desc.trim() ? ` — ${desc.trim()}` : ""),
                        created_by: createdBy,
                      });
                    }
                    toast.success(`Doprinosi evidentirani za ${toCreate.length} ${toCreate.length === 1 ? "mesec" : "meseci"}`);
                  } else {
                    await addDebt({ driver_id: driverId, type: type as any, amount: Number(amount), date, description: desc, created_by: createdBy });
                    toast.success("Dugovanje evidentirano");
                  }
                  setAddOpen(false); reset();
                } catch(e: any) { toast.error("Greška: " + e.message); }
                finally { setSaving(false); }
              }}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ukupno duguju" value={fmt(totalOpen)} icon={AlertCircle}/>
        <StatCard title="Otvorenih" value={openDebts.length} icon={Clock}/>
        <StatCard title="Zatvorenih" value={closedDebts.length} icon={CheckCircle2}/>
      </div>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Otvorena <Badge variant="destructive" className="ml-2 text-xs">{openDebts.length}</Badge></TabsTrigger>
            <TabsTrigger value="closed">Zatvorena</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="mt-4 space-y-3">
            {openDebts.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">Nema otvorenih dugovanja 🎉</CardContent></Card>
              : openDebts.map(d => <DebtCard key={d.id} debt={d}/>)}
          </TabsContent>
          <TabsContent value="closed" className="mt-4 space-y-3">
            {closedDebts.length === 0 ? <Card><CardContent className="py-10 text-center text-muted-foreground">Nema zatvorenih dugovanja</CardContent></Card>
              : closedDebts.map(d => <DebtCard key={d.id} debt={d}/>)}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
export default DebtsPage;
