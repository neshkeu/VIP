import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, CheckCircle2, Clock, CreditCard, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const CardsPage = () => {
  const { drivers, vehicles, displayName } = useApp();
  const { cardReports: reports, addCard: addReport, markCardPaid: markPaidOut, updateCard, deleteCard, loading } = useApp();

  const PAYMENT_METHODS = [
    { value: "kartica",    label: "Kartica" },
    { value: "terminal1",  label: "Terminal 1" },
    { value: "terminal2",  label: "Terminal 2" },
    { value: "aplikacija", label: "Aplikacija" },
  ];

  const [addOpen, setAddOpen]     = useState(false);
  const [driverId, setDriverId]   = useState("none");
  const [vehicleId, setVehicleId] = useState("none");
  const [cardType, setCardType]   = useState("");
  const [paymentMethod, setPaymentMethod] = useState("kartica");
  const [gross, setGross]         = useState("");
  const [provizija, setProvizija] = useState("");
  const [date, setDate]           = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [payId, setPayId]         = useState("");
  const [payBy, setPayBy]         = useState("");
  const [payOpen, setPayOpen]     = useState(false);

  // Edit state
  const [editId, setEditId]       = useState<string | null>(null);
  const [editGross, setEditGross] = useState("");
  const [editProv, setEditProv]   = useState("");
  const [editDate, setEditDate]   = useState("");
  const [editNotes, setEditNotes] = useState("");

  const reset = () => {
    setDriverId("none"); setVehicleId("none"); setCardType(""); setPaymentMethod("kartica");
    setGross(""); setProvizija(""); setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
  };

  const grossNum     = Number(gross)     || 0;
  const provizijaNum = Number(provizija) || 0;
  const netNum       = grossNum - provizijaNum;
  const pctCalc      = grossNum > 0 ? (provizijaNum / grossNum) * 100 : 0;

  const unpaid = reports.filter(r => !r.paid_out);
  const paid   = reports.filter(r => r.paid_out);
  const totalNet = unpaid.reduce((s, r) => s + r.net_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kartice</h1>
          <p className="text-muted-foreground text-sm">POS izvodi — unesi iznos transakcije i proviziju</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novi izvod</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Unesi kartica izvod</DialogTitle>
              <DialogDescription>Unesi iznos transakcije i proviziju — za uplatu se računa automatski</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1.5">
                <Label>Vozač</Label>
                <Select
                  value={driverId}
                  onValueChange={v => {
                    setDriverId(v);
                    const d = drivers.find(dr => dr.id === v);
                    const veh = vehicles.find(ve => ve.id === d?.vehicle_id);
                    if (veh) setVehicleId(veh.id);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Izaberi" /></SelectTrigger>
                  <SelectContent>
                    {drivers
                      .filter(d => d.role === "operativni" && d.status === "active")
                      .sort((a, b) => a.full_name.localeCompare(b.full_name))
                      .map(d => {
                        const veh = vehicles.find(v => v.id === d.vehicle_id);
                        return (
                          <SelectItem key={d.id} value={d.id}>
                            {d.full_name}{veh ? ` — ${veh.brand} ${veh.model} (${veh.taxi_license_number || "?"})` : " — bez vozila"}
                          </SelectItem>
                        );
                      })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Iznos transakcije (RSD)</Label>
                  <Input type="number" placeholder="3000" value={gross} onChange={e => setGross(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label>Provizija (RSD)</Label>
                  <Input type="number" step="0.01" placeholder="45" value={provizija} onChange={e => setProvizija(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Način plaćanja</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Tip kartice (opciono)</Label>
                  <Input placeholder="Visa, Master..." value={cardType} onChange={e => setCardType(e.target.value)} />
                </div>
              </div>
              {grossNum > 0 && (
                <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-xs text-muted-foreground">Iznos transakcije</p><p className="font-semibold">{fmt(grossNum)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Provizija ({pctCalc.toFixed(2)}%)</p><p className="font-semibold text-red-500">−{fmt(provizijaNum)}</p></div>
                  <div><p className="text-xs text-muted-foreground">Za uplatu</p><p className="font-bold text-green-600">{fmt(netNum)}</p></div>
                </div>
              )}
              <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
              <div className="grid gap-1.5"><Label>Napomena</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Otkazi</Button>
              <Button
                disabled={driverId === "none" || !gross || !provizija || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const paymentLabel = PAYMENT_METHODS.find(m => m.value === paymentMethod)?.label ?? paymentMethod;
                    const combinedType = cardType ? `${paymentLabel} · ${cardType}` : paymentLabel;
                    await addReport({
                      driver_id: driverId,
                      vehicle_id: vehicleId === "none" ? null : vehicleId,
                      card_type: combinedType,
                      gross_amount: grossNum,
                      deduction_pct: Number(pctCalc.toFixed(2)),
                      deduction_amount: provizijaNum,
                      net_amount: netNum,
                      date,
                      period_from: date,
                      period_to: date,
                      paid_out: false,
                      received_by: "",
                      notes,
                    });
                    toast.success("Kartica izvod unesen");
                    setAddOpen(false);
                    reset();
                  } catch (e) {
                    toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Za isplatu" value={fmt(totalNet)} icon={CreditCard} />
        <StatCard title="Neisplaćenih" value={unpaid.length} icon={Clock} />
        <StatCard title="Isplaćenih" value={paid.length} icon={CheckCircle2} />
      </div>

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={v => { if (!v) setEditId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi izvod</DialogTitle>
            <DialogDescription>Ispravi iznos, proviziju ili datum</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Iznos transakcije (RSD)</Label>
                <Input type="number" value={editGross} onChange={e => setEditGross(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label>Provizija (RSD)</Label>
                <Input type="number" step="0.01" value={editProv} onChange={e => setEditProv(e.target.value)} />
              </div>
            </div>
            {Number(editGross) > 0 && (
              <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-3 gap-2 text-center text-sm">
                <div><p className="text-xs text-muted-foreground">Iznos</p><p className="font-semibold">{fmt(Number(editGross))}</p></div>
                <div><p className="text-xs text-muted-foreground">Provizija</p><p className="font-semibold text-red-500">−{fmt(Number(editProv) || 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">Za uplatu</p><p className="font-bold text-green-600">{fmt(Number(editGross) - (Number(editProv) || 0))}</p></div>
              </div>
            )}
            <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Napomena</Label><Input value={editNotes} onChange={e => setEditNotes(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Otkazi</Button>
            <Button
              disabled={!editGross || !editProv || saving}
              onClick={async () => {
                if (!editId) return;
                setSaving(true);
                try {
                  const g = Number(editGross);
                  const p = Number(editProv);
                  const pct = g > 0 ? Number(((p / g) * 100).toFixed(2)) : 0;
                  await updateCard(editId, {
                    gross_amount: g,
                    deduction_amount: p,
                    deduction_pct: pct,
                    net_amount: g - p,
                    date: editDate,
                    period_from: editDate,
                    period_to: editDate,
                    notes: editNotes,
                  });
                  toast.success("Izvod ažuriran");
                  setEditId(null);
                } catch (e) {
                  toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                } finally { setSaving(false); }
              }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Isplati vozaču</DialogTitle></DialogHeader>
          <div className="py-3">
            <Label>Ko isplaćuje</Label>
            <Input className="mt-2" placeholder={displayName || "Nemanja, Milica..."} value={payBy} onChange={e => setPayBy(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Otkazi</Button>
            <Button
              disabled={!payBy || saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await markPaidOut(payId, payBy);
                  toast.success("Isplaćeno — " + payBy);
                  setPayOpen(false);
                  setPayBy("");
                } catch (e) {
                  toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Isplati
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="unpaid">
          <TabsList>
            <TabsTrigger value="unpaid">Za isplatu <Badge variant="destructive" className="ml-2 text-xs">{unpaid.length}</Badge></TabsTrigger>
            <TabsTrigger value="paid">Isplaćeno</TabsTrigger>
          </TabsList>
          {["unpaid", "paid"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vozač</TableHead>
                        <TableHead>Kartica</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Iznos</TableHead>
                        <TableHead>Provizija</TableHead>
                        <TableHead>Za uplatu</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Akcije</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(tab === "unpaid" ? unpaid : paid).length === 0
                        ? <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema podataka</TableCell></TableRow>
                        : (tab === "unpaid" ? unpaid : paid).map(r => {
                            const driver = drivers.find(d => d.id === r.driver_id);
                            return (
                              <TableRow key={r.id}>
                                <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                                <TableCell>
                                  {r.card_type && r.card_type !== "—"
                                    ? <Badge variant="outline" className="text-xs">{r.card_type}</Badge>
                                    : <span className="text-muted-foreground text-xs">—</span>}
                                </TableCell>
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
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-0.5">
                                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Uredi"
                                      onClick={() => {
                                        setEditId(r.id);
                                        setEditGross(String(r.gross_amount));
                                        setEditProv(String(r.deduction_amount));
                                        setEditDate(r.date);
                                        setEditNotes(r.notes ?? "");
                                      }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Obriši"
                                      onClick={async () => {
                                        if (!confirm(`Obrisati izvod od ${fmt(r.gross_amount)} (${r.date})?`)) return;
                                        try {
                                          await deleteCard(r.id);
                                          toast.success("Obrisano");
                                        } catch (e) {
                                          toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                                        }
                                      }}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                      }
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default CardsPage;
