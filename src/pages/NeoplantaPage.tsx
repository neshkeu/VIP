import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Loader2, CheckCircle2, Clock, Truck, Pencil, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { DriverCombobox } from "@/components/DriverCombobox";
import { fmtD } from "@/lib/date";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

// ─── UNPAID GROUPED BY DRIVER ───────────────────────────────
function NeoplantaUnpaidGrouped({ unpaid, drivers, onEdit, onDelete }: {
  unpaid: any[]; drivers: any[];
  onEdit: (r: any) => void;
  onDelete: (r: any) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const byDriver: Record<string, any[]> = {};
  for (const r of unpaid) {
    const k = r.driver_id ?? "none";
    (byDriver[k] ||= []).push(r);
  }
  const groups = Object.entries(byDriver)
    .map(([driverId, ents]) => {
      const driver = drivers.find(d => d.id === driverId);
      const sortedEnts = [...ents].sort((a, b) => (a.date ?? "").localeCompare(b.date ?? ""));
      const available = sortedEnts.reduce((s, e) => s + (e.amount - (e.paid_amount || 0)), 0);
      return { driverId, driver, ents: sortedEnts, available, count: sortedEnts.length };
    })
    .sort((a, b) => (a.driver?.full_name ?? "—").localeCompare(b.driver?.full_name ?? "—"));

  if (groups.length === 0)
    return <Card><CardContent className="py-10 text-center text-muted-foreground">Nema neisplaćenih vožnji</CardContent></Card>;

  return (
    <div className="space-y-2">
      {groups.map(g => {
        const isOpen = expanded[g.driverId] ?? false;
        return (
          <Card key={g.driverId} className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 hover:bg-muted/30 cursor-pointer border-l-4 border-l-emerald-500"
              onClick={() => setExpanded(prev => ({...prev, [g.driverId]: !isOpen}))}>
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground"/> : <ChevronRight className="h-4 w-4 text-muted-foreground"/>}
                <span className="font-semibold text-sm">{g.driver?.full_name ?? "— (bez vozača)"}</span>
                <Badge variant="secondary" className="text-xs">{g.count} {g.count === 1 ? "vožnja" : "vožnji"}</Badge>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Raspoloživo</p>
                <p className="font-bold text-sm text-emerald-600">{fmt(g.available)}</p>
              </div>
            </div>
            {isOpen && (
              <div className="border-t overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Datum</TableHead>
                    <TableHead>Ruta</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Raspoloživo</TableHead>
                    <TableHead className="text-right">Akcije</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {g.ents.map(r => {
                      const paid = r.paid_amount || 0;
                      const remaining = r.amount - paid;
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{fmtD(r.date)}</TableCell>
                          <TableCell className="text-xs">{r.route}</TableCell>
                          <TableCell className="font-bold text-muted-foreground">{fmt(r.amount)}</TableCell>
                          <TableCell className={`font-bold ${remaining <= 0 ? "text-gray-400" : "text-emerald-600"}`}>
                            {fmt(remaining)}
                            {paid > 0 && <span className="text-[10px] text-blue-600 ml-1">(isplaćeno {fmt(paid)})</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <Button size="icon" variant="ghost" className="h-8 w-8" title="Uredi" onClick={() => onEdit(r)}><Pencil className="h-4 w-4"/></Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Obriši" onClick={() => onDelete(r)}><Trash2 className="h-4 w-4"/></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

const NeoplantaPage = () => {
  const { drivers, vehicles, displayName, neoplantaRides: rides, addNeoplanta, updateNeoplanta, deleteNeoplanta, loading } = useApp();

  const [addOpen, setAddOpen]       = useState(false);
  const [driverId, setDriverId]     = useState("none");
  const [vehicleId, setVehicleId]   = useState<string | null>(null);
  const [date, setDate]             = useState(new Date().toISOString().split("T")[0]);
  const [route, setRoute]           = useState("");
  const [amount, setAmount]         = useState("");
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);

  // Edit state
  const [editId, setEditId]         = useState<string | null>(null);
  const [editDate, setEditDate]     = useState("");
  const [editRoute, setEditRoute]   = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes]   = useState("");

  const reset = () => {
    setDriverId("none"); setVehicleId(null); setDate(new Date().toISOString().split("T")[0]);
    setRoute(""); setAmount(""); setNotes("");
  };

  const unpaid = rides.filter(r => !r.paid_out);
  const paid   = rides.filter(r => r.paid_out);
  const totalAvailable = unpaid.reduce((s, r) => s + (r.amount - (r.paid_amount || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Neoplanta</h1>
          <p className="text-muted-foreground text-sm">Dnevne vožnje za Neoplantu — isplata kroz Kasu</p>
        </div>
        <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4"/>Nova vožnja</Button></DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Unesi Neoplanta vožnju</DialogTitle>
              <DialogDescription>Datum, ruta i iznos — 100% ide vozaču</DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-3">
              <div className="grid gap-1.5">
                <Label>Vozač</Label>
                <DriverCombobox
                  value={driverId === "none" ? "" : driverId}
                  onChange={v => {
                    setDriverId(v);
                    const d = drivers.find(dr => dr.id === v);
                    const veh = vehicles.find(ve => ve.id === d?.vehicle_id);
                    if (veh) setVehicleId(veh.id);
                  }}
                  options={drivers
                    .filter(d => d.role === "operativni" && d.status === "active")
                    .sort((a, b) => a.full_name.localeCompare(b.full_name))
                    .map(d => {
                      const veh = vehicles.find(v => v.id === d.vehicle_id);
                      return { value: d.id, label: d.full_name, sublabel: veh ? `${veh.brand} ${veh.model} (${veh.taxi_license_number || "?"})` : "bez vozila" };
                    })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)}/></div>
                <div className="grid gap-1.5"><Label>Iznos (RSD)</Label><Input type="number" placeholder="4200" value={amount} onChange={e => setAmount(e.target.value)}/></div>
              </div>
              <div className="grid gap-1.5">
                <Label>Ruta / opis</Label>
                <Input placeholder="npr. B jarak neop 1.809 · Adice buk do neop 2.400" value={route} onChange={e => setRoute(e.target.value)}/>
              </div>
              <div className="grid gap-1.5"><Label>Napomena (opciono)</Label><Input value={notes} onChange={e => setNotes(e.target.value)}/></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>Otkazi</Button>
              <Button
                disabled={driverId === "none" || !route || !(Number(amount) > 0) || saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await addNeoplanta({
                      driver_id: driverId, vehicle_id: vehicleId,
                      date, route, amount: Number(amount),
                      paid_out: false, paid_amount: 0, payment_basis: null,
                      received_by: "", notes, evidenced_by: displayName || "",
                    });
                    toast.success("Vožnja uneta");
                    setAddOpen(false); reset();
                  } catch (e) {
                    toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                  } finally { setSaving(false); }
                }}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Raspoloživo" value={fmt(totalAvailable)} icon={Truck}/>
        <StatCard title="Neisplaćenih" value={unpaid.length} icon={Clock}/>
        <StatCard title="Isplaćenih" value={paid.length} icon={CheckCircle2}/>
      </div>

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={v => { if (!v) setEditId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Uredi vožnju</DialogTitle>
            <DialogDescription>Ispravi datum, rutu ili iznos</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5"><Label>Datum</Label><Input type="date" value={editDate} onChange={e => setEditDate(e.target.value)}/></div>
              <div className="grid gap-1.5"><Label>Iznos (RSD)</Label><Input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)}/></div>
            </div>
            <div className="grid gap-1.5"><Label>Ruta / opis</Label><Input value={editRoute} onChange={e => setEditRoute(e.target.value)}/></div>
            <div className="grid gap-1.5"><Label>Napomena</Label><Input value={editNotes} onChange={e => setEditNotes(e.target.value)}/></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>Otkazi</Button>
            <Button
              disabled={!editRoute || !(Number(editAmount) > 0) || saving}
              onClick={async () => {
                if (!editId) return;
                setSaving(true);
                try {
                  await updateNeoplanta(editId, {
                    date: editDate, route: editRoute, amount: Number(editAmount), notes: editNotes,
                  });
                  toast.success("Vožnja ažurirana");
                  setEditId(null);
                } catch (e) {
                  toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                } finally { setSaving(false); }
              }}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
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

          <TabsContent value="unpaid" className="mt-4">
            <NeoplantaUnpaidGrouped
              unpaid={unpaid}
              drivers={drivers}
              onEdit={(r) => {
                setEditId(r.id); setEditDate(r.date); setEditRoute(r.route);
                setEditAmount(String(r.amount)); setEditNotes(r.notes ?? "");
              }}
              onDelete={async (r) => {
                if (!confirm(`Obrisati vožnju od ${fmt(r.amount)} (${fmtD(r.date)})?`)) return;
                try { await deleteNeoplanta(r.id); toast.success("Obrisano"); }
                catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
              }}
            />
          </TabsContent>

          <TabsContent value="paid" className="mt-4">
            <Card><CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Datum</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Iznos</TableHead>
                  <TableHead>Osnov</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {paid.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema podataka</TableCell></TableRow>
                  ) : paid.map(r => {
                    const driver = drivers.find(d => d.id === r.driver_id);
                    const basis = r.payment_basis;
                    const basisStyle = basis === "u kešu" ? "bg-orange-50 text-orange-700 border-orange-200"
                                     : basis === "kroz obračun" ? "bg-blue-50 text-blue-700 border-blue-200"
                                     : basis === "kombinovano" ? "bg-purple-50 text-purple-700 border-purple-200"
                                     : "bg-gray-50 text-gray-500 border-gray-200";
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{fmtD(r.date)}</TableCell>
                        <TableCell className="text-xs">{r.route}</TableCell>
                        <TableCell className="font-bold text-emerald-600">{fmt(r.amount)}</TableCell>
                        <TableCell><Badge variant="outline" className={`text-xs ${basisStyle}`}>{basis ?? "—"}</Badge></TableCell>
                        <TableCell><Badge variant="default" className="text-xs">Isplaćeno — {r.received_by}</Badge></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default NeoplantaPage;
