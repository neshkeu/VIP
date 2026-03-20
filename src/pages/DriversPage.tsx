import { useState } from "react";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicles } from "@/hooks/useVehicles";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Search, Plus, User, Car, TrendingDown, TrendingUp, CarTaxiFront, Wrench, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const TYPE_CFG = {
  renta:           { label: "Renta",          color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: CarTaxiFront },
  vlastito_vozilo: { label: "Vlastito vozilo", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Wrench },
};

const DriversPage = () => {
  const { drivers, loading, addDriver } = useDrivers();
  const { vehicles } = useVehicles();

  const [search, setSearch]         = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]         = useState(false);

  const [newName, setNewName]               = useState("");
  const [newPhone, setNewPhone]             = useState("");
  const [newVehicleId, setNewVehicleId]     = useState("none");
  const [newType, setNewType]               = useState<"renta"|"vlastito_vozilo">("renta");
  const [newDailyRate, setNewDailyRate]     = useState("");
  const [newWeekly, setNewWeekly]           = useState("");
  const [newPosFee, setNewPosFee]           = useState("");
  const [newKomunalni, setNewKomunalni]     = useState("");
  const [newDoprinosi, setNewDoprinosi]     = useState("");
  const [newMemberOwn, setNewMemberOwn]     = useState("");

  const filtered = drivers.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search)
  );

  const reset = () => {
    setNewName(""); setNewPhone(""); setNewVehicleId("none"); setNewType("renta");
    setNewDailyRate(""); setNewWeekly(""); setNewPosFee("");
    setNewKomunalni(""); setNewDoprinosi(""); setNewMemberOwn("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addDriver({
        full_name: newName, phone: newPhone,
        license_number: "", status: "active",
        driver_type: newType,
        vehicle_id: newVehicleId === "none" ? null : newVehicleId,
        daily_rate: Number(newDailyRate) || 0,
        weekly_membership: Number(newWeekly) || 0,
        pos_monthly_fee: Number(newPosFee) || 0,
        komunalni_monthly: Number(newKomunalni) || 0,
        doprinosi_monthly: Number(newDoprinosi) || 0,
        weekly_membership_own: Number(newMemberOwn) || 0,
        notes: "",
      });
      toast.success(`Vozač ${newName} dodan`);
      setDialogOpen(false); reset();
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozači</h1>
          <p className="text-muted-foreground text-sm">
            {drivers.filter(d => d.status === "active" && d.driver_type === "renta").length} renta ·{" "}
            {drivers.filter(d => d.status === "active" && d.driver_type === "vlastito_vozilo").length} vlastito vozilo
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Pretraži..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4"/>Novi vozač</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Dodaj novog vozača</DialogTitle>
                <DialogDescription>Unesite podatke i tip vozača</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Ime i prezime</Label>
                    <Input placeholder="Marko Petrović" value={newName} onChange={e => setNewName(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Telefon</Label>
                    <Input placeholder="064-111-2233" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Vozilo</Label>
                  <Select value={newVehicleId} onValueChange={setNewVehicleId}>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Bez vozila —</SelectItem>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Tip vozača</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["renta", "vlastito_vozilo"] as const).map(t => {
                      const cfg = TYPE_CFG[t];
                      const Icon = cfg.icon;
                      return (
                        <button key={t} type="button" onClick={() => setNewType(t)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${
                            newType === t ? `${cfg.bg} ${cfg.color} border-current` : "hover:bg-muted border-border"
                          }`}>
                          <Icon className="h-4 w-4" />{cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Separator />
                <AnimatePresence mode="wait">
                  {newType === "renta" ? (
                    <motion.div key="renta" initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Dnevna renta</Label>
                        <Input type="number" placeholder="3500" value={newDailyRate} onChange={e => setNewDailyRate(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Dnevno</p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Članarina</Label>
                        <Input type="number" placeholder="1000" value={newWeekly} onChange={e => setNewWeekly(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Sedmično</p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">POS naknada</Label>
                        <Input type="number" placeholder="800" value={newPosFee} onChange={e => setNewPosFee(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Mjesečno</p>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div key="vlastito" initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} className="grid grid-cols-3 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Komunalni</Label>
                        <Input type="number" placeholder="5000" value={newKomunalni} onChange={e => setNewKomunalni(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Mjesečno</p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Članarina</Label>
                        <Input type="number" placeholder="800" value={newMemberOwn} onChange={e => setNewMemberOwn(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Sedmično</p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label className="text-xs">Doprinosi</Label>
                        <Input type="number" placeholder="3000" value={newDoprinosi} onChange={e => setNewDoprinosi(e.target.value)} />
                        <p className="text-xs text-muted-foreground">Mjesečno</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
                <Button disabled={!newName || !newPhone || saving} onClick={handleSave}>
                  {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Naknade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nema vozača</TableCell></TableRow>
                ) : (
                  filtered.map((d, i) => {
                    const vehicle  = vehicles.find(v => v.id === d.vehicle_id);
                    const typeCfg  = TYPE_CFG[d.driver_type];
                    const TypeIcon = typeCfg.icon;
                    return (
                      <motion.tr key={d.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                        className="border-b hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{d.full_name}</p>
                              <p className="text-xs text-muted-foreground">{d.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs gap-1 ${typeCfg.color} ${typeCfg.bg}`}>
                            <TypeIcon className="h-3 w-3" />{typeCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle ? (
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="text-sm">{vehicle.brand} {vehicle.model}</span>
                              <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {d.driver_type === "renta" ? (
                            <div className="text-xs space-y-0.5">
                              <p>{fmt(d.daily_rate)}<span className="text-muted-foreground">/dan</span></p>
                              <p>{fmt(d.weekly_membership)}<span className="text-muted-foreground">/sed.</span></p>
                              <p>{fmt(d.pos_monthly_fee)}<span className="text-muted-foreground">/mj.</span></p>
                            </div>
                          ) : (
                            <div className="text-xs space-y-0.5">
                              <p>{fmt(d.komunalni_monthly)}<span className="text-muted-foreground">/mj.</span></p>
                              <p>{fmt(d.weekly_membership_own)}<span className="text-muted-foreground">/sed.</span></p>
                              <p>{fmt(d.doprinosi_monthly)}<span className="text-muted-foreground"> doprinosi/mj.</span></p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={d.status === "active" ? "default" : "secondary"}>
                            {d.status === "active" ? "Aktivan" : "Neaktivan"}
                          </Badge>
                        </TableCell>
                      </motion.tr>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DriversPage;
