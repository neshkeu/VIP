import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useKazne, type Penalty } from "@/hooks/useKazne";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Loader2, Search, Trash2, Gavel, Car, User } from "lucide-react";
import { toast } from "sonner";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const KaznePage = () => {
  const { vehicles, drivers } = useApp();
  const { penalties, loading, addPenalty, deletePenalty } = useKazne();
  const { displayName } = useCurrentUser();

  const [search, setSearch]           = useState("");
  const [addOpen, setAddOpen]         = useState(false);
  const [vehicleId, setVehicleId]     = useState("none");
  const [driverId, setDriverId]       = useState("none");
  const [penaltyNumber, setPenaltyNumber] = useState("");
  const [violationDate, setViolationDate] = useState("");
  const [amount, setAmount]           = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving]           = useState(false);

  const reset = () => {
    setVehicleId("none"); setDriverId("none"); setPenaltyNumber("");
    setViolationDate(""); setAmount(""); setDescription("");
  };

  // Kad se izabere vozilo, predloži trenutnog operativnog vozača tog vozila
  const onVehicleChange = (v: string) => {
    setVehicleId(v);
    const op = drivers.find(d => d.vehicle_id === v && d.role === "operativni");
    if (op) setDriverId(op.id);
  };

  const filtered = penalties.filter(p => {
    const veh = vehicles.find(v => v.id === p.vehicle_id);
    const drv = drivers.find(d => d.id === p.driver_id);
    const q = search.toLowerCase();
    return [p.penalty_number, p.description, veh?.license_plate, veh?.taxi_license_number, drv?.full_name]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
  });

  const totalOpen = penalties.filter(p => p.status !== "closed").reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Kazne</h1>
          <p className="text-muted-foreground text-sm">Saobraćajne kazne — vezuju se za vozilo, plaća vozač koji je vozio</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Broj, vozilo, vozač..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={addOpen} onOpenChange={v => { setAddOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Nova kazna</Button></DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Evidentiraj kaznu</DialogTitle>
                <DialogDescription>Vozilo → izabere se vozač koji je vozio na datum prekršaja</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-3">
                <div className="grid gap-1.5">
                  <Label>Vozilo</Label>
                  <Select value={vehicleId} onValueChange={onVehicleChange}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles
                        .slice()
                        .sort((a, b) => (a.taxi_license_number || "").localeCompare(b.taxi_license_number || ""))
                        .map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.brand} {v.model} — {v.license_plate} ({v.taxi_license_number || "?"})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Vozač koji je vozio</Label>
                  <Select value={driverId} onValueChange={setDriverId}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
                    <SelectContent>
                      {drivers
                        .filter(d => d.role === "operativni")
                        .sort((a, b) => a.full_name.localeCompare(b.full_name))
                        .map(d => {
                          const veh = vehicles.find(v => v.id === d.vehicle_id);
                          return (
                            <SelectItem key={d.id} value={d.id}>
                              {d.full_name}{veh ? ` (${veh.taxi_license_number})` : ""}
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Predložen trenutni vozač vozila — promeni ako je na datum prekršaja vozio neko drugi</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label>Broj kazne</Label><Input value={penaltyNumber} onChange={e => setPenaltyNumber(e.target.value)} /></div>
                  <div className="grid gap-1.5"><Label>Datum prekršaja</Label><Input type="date" value={violationDate} onChange={e => setViolationDate(e.target.value)} /></div>
                </div>
                <div className="grid gap-1.5"><Label>Iznos (RSD)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label>Opis</Label><Input placeholder="npr. prekoračenje brzine" value={description} onChange={e => setDescription(e.target.value)} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>Otkazi</Button>
                <Button
                  disabled={vehicleId === "none" || driverId === "none" || !amount || saving}
                  onClick={async () => {
                    setSaving(true);
                    try {
                      await addPenalty({
                        vehicle_id: vehicleId === "none" ? null : vehicleId,
                        driver_id: driverId === "none" ? null : driverId,
                        penalty_number: penaltyNumber,
                        violation_date: violationDate || null,
                        amount: Number(amount),
                        description,
                        created_by: displayName,
                      });
                      toast.success("Kazna evidentirana — dodata kao dug vozaču");
                      setAddOpen(false); reset();
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Ukupno otvorenih kazni" value={fmt(totalOpen)} icon={Gavel} />
        <StatCard title="Broj kazni" value={penalties.length} icon={Gavel} />
        <StatCard title="Neplaćenih" value={penalties.filter(p => p.status !== "closed").length} icon={Gavel} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Broj</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Vozač (plaća)</TableHead>
                  <TableHead>Datum prekršaja</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead>Iznos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema kazni</TableCell></TableRow>
                ) : filtered.map((p, i) => {
                  const veh = vehicles.find(v => v.id === p.vehicle_id);
                  const drv = drivers.find(d => d.id === p.driver_id);
                  return (
                    <motion.tr key={p.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs">{p.penalty_number || "—"}</TableCell>
                      <TableCell>
                        {veh ? (
                          <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{veh.brand} {veh.model}</span>
                            <Badge variant="secondary" className="font-mono text-xs">{veh.taxi_license_number}</Badge>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell>
                        {drv ? (
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium">{drv.full_name}</span>
                          </div>
                        ) : <span className="text-muted-foreground text-xs">—</span>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.violation_date || "—"}</TableCell>
                      <TableCell className="text-sm">{p.description || "—"}</TableCell>
                      <TableCell className="font-bold text-red-600">{fmt(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "closed" ? "default" : p.status === "partial" ? "secondary" : "destructive"} className="text-xs">
                          {p.status === "closed" ? "Plaćeno" : p.status === "partial" ? "Djelimično" : "Otvoreno"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Obriši"
                          onClick={async () => {
                            if (!confirm(`Obrisati kaznu ${p.penalty_number || ""} (${fmt(p.amount)})? Vezani dug će takođe biti obrisan ako nije plaćen.`)) return;
                            try {
                              await deletePenalty(p);
                              toast.success("Obrisano");
                            } catch (e) {
                              toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
                            }
                          }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default KaznePage;
