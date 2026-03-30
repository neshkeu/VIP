import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { useCards, CARD_DEDUCTIONS, CardType } from "@/hooks/useCards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, CheckCircle2, Clock, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const CARD_LABELS: Record<CardType, string> = {
  visa: "Visa", mastercard: "Mastercard", dina: "Dina", amex: "Amex", ostalo: "Ostalo"
};

const CardsPage = () => {
  const { drivers, vehicles, displayName } = useApp();
  const { reports, loading, addReport, markPaidOut } = useCards();
  
  

  const [addOpen, setAddOpen]       = useState(false);
  const [driverId, setDriverId]     = useState("none");
  const [vehicleId, setVehicleId]   = useState("none");
  const [cardType, setCardType]     = useState<CardType>("visa");
  const [gross, setGross]           = useState("");
  const [customPct, setCustomPct]   = useState("");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo]     = useState("");
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [payId, setPayId]           = useState("");
  const [payBy, setPayBy]           = useState("");
  const [payOpen, setPayOpen]       = useState(false);

  const reset = () => { setDriverId("none"); setVehicleId("none"); setCardType("visa"); setGross(""); setCustomPct(""); setPeriodFrom(""); setPeriodTo(""); setNotes(""); setDate(new Date().toISOString().split("T")[0]); };

  const pct        = Number(customPct) || CARD_DEDUCTIONS[cardType];
  const grossNum   = Number(gross) || 0;
  const deductNum  = grossNum * (pct / 100);
  const netNum     = grossNum - deductNum;

  const unpaid = reports.filter(r => !r.paid_out);
  const paid   = reports.filter(r => r.paid_out);
  const totalNet = unpaid.reduce((s,r) => s + r.net_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kartice</h1>
          <p className="text-muted-foreground text-sm">POS izvodi — procenat po tipu kartice</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Novi izvod</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Unesi kartica izvod</DialogTitle><DialogDescription>Procenat odbitka zavisi od tipa kartice</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Vozač</Label>
                  <Select value={driverId} onValueChange={v => { setDriverId(v); const d = drivers.find(dr => dr.id === v); const veh = vehicles.find(ve => ve.id === d?.vehicle_id); if (veh) setVehicleId(veh.id); }}>
                    <SelectTrigger><SelectValue placeholder="Izaberi"/></SelectTrigger>
                    <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5"><Label>Tip kartice</Label>
                  <Select value={cardType} onValueChange={v => { setCardType(v as CardType); setCustomPct(""); }}>
                    <SelectTrigger><SelectValue/></SelectTrigger>
                    <SelectContent>{(Object.keys(CARD_LABELS) as CardType[]).map(t => <SelectItem key={t} value={t}>{CARD_LABELS[t]} ({CARD_DEDUCTIONS[t]}%)</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Bruto iznos (RSD)</Label><Input type="number" placeholder="3000" value={gross} onChange={e => setGross(e.target.value)}/></div>
                <div className="grid gap-1.5">
                  <Label>Procenat odbitka</Label>
                  <Input type="number" placeholder={String(CARD_DEDUCTIONS[cardType])} value={customPct} onChange={e => setCustomPct(e.target.value)}/>
                  <p className="text-xs text-muted-foreground">Default: {CARD_DEDUCTIONS[cardType]}%</p>
                </div>
              </div>
              {grossNum > 0 && (
                <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-xs text-muted-foreground">Bruto</p><p className="font-semibold">{fmt(grossNum)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Odbitak</p><p className="font-semibold text-red-500">−{fmt(deductNum)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Neto vozaču</p><p className="font-bold text-green-600">{fmt(netNum)}</p></div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Period od</Label><Input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)}/></div>
                <div className="grid gap-1.5"><Label>Period do</Label><Input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)}/></div>
              </div>
              <div className="grid gap-1.5"><Label>Datum izvoda</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
              <div className="grid gap-1.5"><Label>Napomena</Label><Input placeholder="Opciono..." value={notes} onChange={e => setNotes(e.target.value)}/></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Otkazi</Button>
              <Button disabled={driverId==="none"||!gross||saving} onClick={async () => {
                setSaving(true);
                try {
                  await addReport({ driver_id: driverId, vehicle_id: vehicleId==="none"?null:vehicleId, card_type: cardType, gross_amount: grossNum, deduction_pct: pct, deduction_amount: deductNum, net_amount: netNum, date, period_from: periodFrom, period_to: periodTo, paid_out: false, received_by: "", notes });
                  toast.success("Kartica izvod unesen");
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
        <StatCard title="Za isplatu" value={fmt(totalNet)} icon={CreditCard}/>
        <StatCard title="Neisplaćenih" value={unpaid.length} icon={Clock}/>
        <StatCard title="Isplaćenih" value={paid.length} icon={CheckCircle2}/>
      </div>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Isplati vozaču</DialogTitle></DialogHeader>
          <div className="py-3"><Label>Ko isplaćuje</Label><Input className="mt-2" placeholder="Nemanja, Milica..." value={payBy} onChange={e => setPayBy(e.target.value)}/></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Otkazi</Button>
            <Button disabled={!payBy||saving} onClick={async () => {
              setSaving(true);
              try { await markPaidOut(payId, payBy); toast.success("Isplaćeno — " + payBy); setPayOpen(false); setPayBy(""); }
              catch(e: any) { toast.error("Greška: " + e.message); }
              finally { setSaving(false); }
            }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Isplati
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div> : (
        <Tabs defaultValue="unpaid">
          <TabsList>
            <TabsTrigger value="unpaid">Za isplatu <Badge variant="destructive" className="ml-2 text-xs">{unpaid.length}</Badge></TabsTrigger>
            <TabsTrigger value="paid">Isplaćeno</TabsTrigger>
          </TabsList>
          {["unpaid","paid"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Vozač</TableHead><TableHead>Kartica</TableHead><TableHead>Period</TableHead><TableHead>Bruto</TableHead><TableHead>Odbitak</TableHead><TableHead>Neto</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(tab==="unpaid"?unpaid:paid).length===0
                      ? <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nema podataka</TableCell></TableRow>
                      : (tab==="unpaid"?unpaid:paid).map(r => {
                          const driver = drivers.find(d => d.id === r.driver_id);
                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{driver?.full_name??"—"}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{CARD_LABELS[r.card_type]}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.period_from} — {r.period_to}</TableCell>
                              <TableCell>{fmt(r.gross_amount)}</TableCell>
                              <TableCell className="text-red-500">−{fmt(r.deduction_amount)} ({r.deduction_pct}%)</TableCell>
                              <TableCell className="font-bold text-green-600">{fmt(r.net_amount)}</TableCell>
                              <TableCell>
                                {r.paid_out
                                  ? <Badge variant="default" className="text-xs">Isplaćeno — {r.received_by}</Badge>
                                  : <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setPayId(r.id); setPayOpen(true); }}>Isplati</Button>
                                }
                              </TableCell>
                            </TableRow>
                          );
                        })
                    }
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};
export default CardsPage;
