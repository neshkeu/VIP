import { useApp } from "@/context/AppContext";
import { supabase } from "@/lib/supabase";
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
import { Plus, Loader2, CheckCircle2, Clock, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { TrendingUp } from "lucide-react";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Jun","Jul","Avgust","Septembar","Oktobar","Novembar","Decembar"];

// ─── 3% ZA PRETHODNI MJESEC ─────────────────────────────────
function ThreePercentTab() {
  const { drivers, vehicles, displayName } = useApp();
  const today = new Date();
  const prev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const [ym, setYm] = useState(`${prev.getFullYear()}-${String(prev.getMonth()+1).padStart(2,"0")}`);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const ops = drivers
    .filter(d => d.role === "operativni" && d.status === "active")
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  const [y, m] = ym.split("-").map(Number);
  const monthLabel = `${MONTHS_SR[m-1]} ${y}`;
  const entered = ops.filter(d => Number(amounts[d.id]) > 0);
  const total = entered.reduce((s, d) => s + Number(amounts[d.id]), 0);

  const saveAll = async () => {
    if (entered.length === 0) { toast.error("Unesi bar jedan iznos"); return; }
    setSaving(true);
    try {
      const dateStr = `${ym}-01`;
      for (const d of entered) {
        const amt = Number(amounts[d.id]);
        // 3% provizija je ODBITAK — vozač to duguje (skida se u kasi)
        await supabase.from("driver_debts").insert({
          driver_id: d.id,
          type: "ostalo",
          amount: amt,
          paid_amount: 0,
          status: "open",
          date: dateStr,
          description: `3% provizija — ${monthLabel}`,
          created_by: displayName,
        });
      }
      toast.success(`Uneseno ${entered.length} stavki (dugovanja) za ${monthLabel}`);
      setAmounts({});
    } catch (e) {
      toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">3% za prethodni mjesec</p>
          <p className="text-xs text-muted-foreground">Unesi 3% odbitak po vozačima — kreira se kao dugovanje (skida se u kasi)</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={ym} onChange={e => setYm(e.target.value)} className="w-40 h-9" />
          <Button disabled={entered.length === 0 || saving} onClick={saveAll}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj ({entered.length})
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozač</TableHead>
                <TableHead>Vozilo</TableHead>
                <TableHead className="w-48">3% odbitak (RSD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ops.map(d => {
                const veh = vehicles.find(v => v.id === d.vehicle_id);
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium text-sm">{d.full_name}</TableCell>
                    <TableCell>
                      {veh ? <Badge variant="secondary" className="font-mono text-xs">{veh.taxi_license_number}</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell>
                      <Input type="number" placeholder="0" className="h-8 max-w-[160px]"
                        value={amounts[d.id] ?? ""}
                        onChange={e => setAmounts(prev => ({ ...prev, [d.id]: e.target.value }))} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex justify-end text-sm">
          <span className="font-semibold">Ukupno: {fmt(total)} · {entered.length} vozača</span>
        </div>
      )}
    </div>
  );
}

const YandexPage = () => {
  const { drivers, vehicles, displayName } = useApp();
  const { yandexReports: reports, addYandex: addReport, markYandexPaid: markPaidOut, updateYandex, deleteYandex, loading } = useApp();
  
  

  const [addOpen, setAddOpen]       = useState(false);
  const [driverId, setDriverId]     = useState("none");
  const [vehicleId, setVehicleId]   = useState("none");
  const [gross, setGross]           = useState("");
  const [deductPct, setDeductPct]   = useState("10");
  const [periodFrom, setPeriodFrom] = useState("");
  const [periodTo, setPeriodTo]     = useState("");
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);

  const [payId, setPayId]   = useState("");
  const [payBy, setPayBy]   = useState("");
  const [payOpen, setPayOpen] = useState(false);

  // Edit state
  const [editId, setEditId]           = useState<string | null>(null);
  const [editGross, setEditGross]     = useState("");
  const [editPct, setEditPct]         = useState("");
  const [editFrom, setEditFrom]       = useState("");
  const [editTo, setEditTo]           = useState("");
  const [editDate, setEditDate]       = useState("");
  const [editNotes, setEditNotes]     = useState("");

  const reset = () => { setDriverId("none"); setVehicleId("none"); setGross(""); setDeductPct("10"); setPeriodFrom(""); setPeriodTo(""); setNotes(""); setDate(new Date().toISOString().split("T")[0]); };

  const grossNum    = Number(gross) || 0;
  const totalPct    = Number(deductPct);
  const deductNum   = grossNum * (totalPct / 100);
  const netNum      = grossNum - deductNum;

  const unpaid = reports.filter(r => !r.paid_out);
  const paid   = reports.filter(r => r.paid_out);
  const totalNet = unpaid.reduce((s,r) => s + r.net_amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Yandex</h1>
        <p className="text-muted-foreground text-sm">Sedmični izvodi i 3% za prethodni mjesec</p>
      </div>

      <Tabs defaultValue="izvodi">
        <TabsList>
          <TabsTrigger value="izvodi">Yandex izvodi</TabsTrigger>
          <TabsTrigger value="tri">3% za prethodni mjesec</TabsTrigger>
        </TabsList>

        <TabsContent value="tri" className="mt-4">
          <ThreePercentTab />
        </TabsContent>

        <TabsContent value="izvodi" className="mt-4 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Sedmični izvodi — odbitak 10%</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Novi izvod</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Unesi Yandex izvod</DialogTitle><DialogDescription>Utorkom — bruto iznos, odbitak 10%</DialogDescription></DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Vozač</Label>
                  <Select value={driverId} onValueChange={v => { setDriverId(v); const d = drivers.find(dr => dr.id === v); const veh = vehicles.find(ve => ve.id === d?.vehicle_id); if (veh) setVehicleId(veh.id); }}>
                    <SelectTrigger><SelectValue placeholder="Izaberi"/></SelectTrigger>
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
                <div className="grid gap-1.5"><Label>Vozilo</Label>
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Izaberi"/></SelectTrigger>
                    <SelectContent><SelectItem value="none">— Bez vozila —</SelectItem>{vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Bruto iznos (RSD)</Label><Input type="number" placeholder="5000" value={gross} onChange={e => setGross(e.target.value)}/></div>
                <div className="grid gap-1.5"><Label>Odbitak %</Label><Input type="number" placeholder="10" value={deductPct} onChange={e => setDeductPct(e.target.value)}/></div>
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
                  await addReport({ driver_id: driverId, vehicle_id: vehicleId === "none" ? null : vehicleId, gross_amount: grossNum, deduction_pct: totalPct, deduction_amount: deductNum, net_amount: netNum, date, period_from: periodFrom, period_to: periodTo, paid_out: false, received_by: "", notes });
                  toast.success("Yandex izvod unesen");
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
        <StatCard title="Za isplatu" value={fmt(totalNet)} icon={TrendingUp}/>
        <StatCard title="Neisplaćenih" value={unpaid.length} icon={Clock}/>
        <StatCard title="Isplaćenih" value={paid.length} icon={CheckCircle2}/>
      </div>

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={v => { if (!v) setEditId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi Yandex izvod</DialogTitle>
            <DialogDescription>Ispravi bruto iznos, procenat, period ili datum</DialogDescription>
          </DialogHeader>
          {(() => {
            const g = Number(editGross) || 0;
            const p = Number(editPct) || 0;
            const d = g * (p / 100);
            const n = g - d;
            return (
              <>
                <div className="grid gap-3 py-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label>Bruto iznos (RSD)</Label><Input type="number" value={editGross} onChange={e => setEditGross(e.target.value)} /></div>
                    <div className="grid gap-1.5"><Label>Odbitak %</Label><Input type="number" step="0.1" value={editPct} onChange={e => setEditPct(e.target.value)} /></div>
                  </div>
                  {g > 0 && (
                    <div className="rounded-lg bg-muted/40 p-3 grid grid-cols-3 gap-2 text-center text-sm">
                      <div><p className="text-xs text-muted-foreground">Bruto</p><p className="font-semibold">{fmt(g)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Odbitak</p><p className="font-semibold text-red-500">−{fmt(d)}</p></div>
                      <div><p className="text-xs text-muted-foreground">Neto</p><p className="font-bold text-green-600">{fmt(n)}</p></div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5"><Label>Period od</Label><Input type="date" value={editFrom} onChange={e => setEditFrom(e.target.value)} /></div>
                    <div className="grid gap-1.5"><Label>Period do</Label><Input type="date" value={editTo} onChange={e => setEditTo(e.target.value)} /></div>
                  </div>
                  <div className="grid gap-1.5"><Label>Datum izvoda</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Napomena</Label><Input value={editNotes} onChange={e => setEditNotes(e.target.value)} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditId(null)}>Otkazi</Button>
                  <Button
                    disabled={!editGross || !editPct || saving}
                    onClick={async () => {
                      if (!editId) return;
                      setSaving(true);
                      try {
                        await updateYandex(editId, {
                          gross_amount: g,
                          deduction_pct: p,
                          deduction_amount: d,
                          net_amount: n,
                          period_from: editFrom,
                          period_to: editTo,
                          date: editDate,
                          notes: editNotes,
                        });
                        toast.success("Yandex izvod ažuriran");
                        setEditId(null);
                      } catch (e) {
                        toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                      } finally { setSaving(false); }
                    }}
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Isplati dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Isplati vozaču</DialogTitle></DialogHeader>
          <div className="py-3"><Label>Ko isplaćuje</Label><Input className="mt-2" placeholder="Nemanja, Milica..." value={payBy} onChange={e => setPayBy(e.target.value)}/></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Otkazi</Button>
            <Button disabled={!payBy || saving} onClick={async () => {
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
          {["unpaid", "paid"].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-4">
              <Card><CardContent className="p-0">
                <Table>
                  <TableHeader><TableRow><TableHead>Vozač</TableHead><TableHead>Period</TableHead><TableHead>Bruto</TableHead><TableHead>Odbitak</TableHead><TableHead>Neto vozaču</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Akcije</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {(tab === "unpaid" ? unpaid : paid).length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nema podataka</TableCell></TableRow>
                    ) : (tab === "unpaid" ? unpaid : paid).map(r => {
                      const driver = drivers.find(d => d.id === r.driver_id);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
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
                                  setEditPct(String(r.deduction_pct));
                                  setEditFrom(r.period_from);
                                  setEditTo(r.period_to);
                                  setEditDate(r.date);
                                  setEditNotes(r.notes ?? "");
                                }}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Obriši"
                                onClick={async () => {
                                  if (!confirm(`Obrisati Yandex izvod od ${fmt(r.gross_amount)} (${r.period_from} — ${r.period_to})?`)) return;
                                  try {
                                    await deleteYandex(r.id);
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
                    })}
                  </TableBody>
                </Table>
              </CardContent></Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
export default YandexPage;
