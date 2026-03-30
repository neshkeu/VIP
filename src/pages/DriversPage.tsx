import { useState } from "react";
import { useDrivers, Driver } from "@/hooks/useDrivers";
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
import { Search, Plus, User, Car, CarTaxiFront, Wrench, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const TYPE_CFG = {
  renta:           { label: "Renta",          color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",   icon: CarTaxiFront },
  vlastito_vozilo: { label: "Vlastito vozilo", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Wrench },
};

interface DriverFormProps {
  initial?: Partial<Driver>;
  vehicles: any[];
  onSave: (data: Omit<Driver, "id"|"created_at">) => Promise<void>;
  onClose: () => void;
  title: string;
}

function DriverForm({ initial, vehicles, onSave, onClose, title }: DriverFormProps) {
  const [name, setName]           = useState(initial?.full_name ?? "");
  const [phone, setPhone]         = useState(initial?.phone ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicle_id ?? "none");
  const [type, setType]           = useState<"renta"|"vlastito_vozilo">(initial?.driver_type ?? "renta");
  const [dailyRate, setDailyRate] = useState(String(initial?.daily_rate ?? ""));
  const [weekly, setWeekly]       = useState(String(initial?.weekly_membership ?? ""));
  const [posFee, setPosFee]       = useState(String(initial?.pos_monthly_fee ?? ""));
  const [komunalni, setKomunalni] = useState(String(initial?.komunalni_monthly ?? ""));
  const [doprinosi, setDoprinosi] = useState(String(initial?.doprinosi_monthly ?? ""));
  const [memberOwn, setMemberOwn] = useState(String(initial?.weekly_membership_own ?? ""));
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        full_name: name, phone, license_number: "", status: "active",
        driver_type: type,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        daily_rate: Number(dailyRate) || 0,
        weekly_membership: Number(weekly) || 0,
        pos_monthly_fee: Number(posFee) || 0,
        komunalni_monthly: Number(komunalni) || 0,
        doprinosi_monthly: Number(doprinosi) || 0,
        weekly_membership_own: Number(memberOwn) || 0,
        notes: "",
      });
      onClose();
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally { setSaving(false); }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Unesite podatke vozača</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-2"><Label>Ime i prezime</Label><Input value={name} onChange={e => setName(e.target.value)}/></div>
          <div className="grid gap-2"><Label>Telefon</Label><Input value={phone} onChange={e => setPhone(e.target.value)}/></div>
        </div>
        <div className="grid gap-2">
          <Label>Vozilo</Label>
          <Select value={vehicleId ?? "none"} onValueChange={setVehicleId}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Bez vozila —</SelectItem>
              {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Tip vozača</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["renta", "vlastito_vozilo"] as const).map(t => {
              const cfg = TYPE_CFG[t]; const Icon = cfg.icon;
              return (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${type === t ? `${cfg.bg} ${cfg.color} border-current` : "hover:bg-muted border-border"}`}>
                  <Icon className="h-4 w-4"/>{cfg.label}
                </button>
              );
            })}
          </div>
        </div>
        <Separator />
        <AnimatePresence mode="wait">
          {type === "renta" ? (
            <motion.div key="renta" initial={{ opacity:0 }} animate={{ opacity:1 }} className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Dnevna renta</Label><Input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)}/><p className="text-xs text-muted-foreground">Dnevno</p></div>
              <div className="grid gap-1.5"><Label className="text-xs">Članarina</Label><Input type="number" value={weekly} onChange={e => setWeekly(e.target.value)}/><p className="text-xs text-muted-foreground">Sedmično</p></div>
              <div className="grid gap-1.5"><Label className="text-xs">POS naknada</Label><Input type="number" value={posFee} onChange={e => setPosFee(e.target.value)}/><p className="text-xs text-muted-foreground">Mjesečno</p></div>
            </motion.div>
          ) : (
            <motion.div key="vlastito" initial={{ opacity:0 }} animate={{ opacity:1 }} className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5"><Label className="text-xs">Komunalni</Label><Input type="number" value={komunalni} onChange={e => setKomunalni(e.target.value)}/><p className="text-xs text-muted-foreground">Mjesečno</p></div>
              <div className="grid gap-1.5"><Label className="text-xs">Članarina</Label><Input type="number" value={memberOwn} onChange={e => setMemberOwn(e.target.value)}/><p className="text-xs text-muted-foreground">Sedmično</p></div>
              <div className="grid gap-1.5"><Label className="text-xs">Doprinosi</Label><Input type="number" value={doprinosi} onChange={e => setDoprinosi(e.target.value)}/><p className="text-xs text-muted-foreground">Mjesečno</p></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Otkazi</Button>
        <Button disabled={!name || !phone || saving} onClick={handleSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2"/>}Sačuvaj
        </Button>
      </DialogFooter>
    </>
  );
}

const DriversPage = () => {
  const { drivers, loading, addDriver, updateDriver } = useDrivers();
  const { vehicles } = useVehicles();
  const [search, setSearch]       = useState("");
  const [addOpen, setAddOpen]     = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);

  const filtered = drivers.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) || d.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozači</h1>
          <p className="text-muted-foreground text-sm">
            {drivers.filter(d => d.driver_type === "renta").length} renta ·{" "}
            {drivers.filter(d => d.driver_type === "vlastito_vozilo").length} vlastito vozilo
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input className="pl-8 w-56" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4"/>Novi vozač</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DriverForm
                vehicles={vehicles} title="Dodaj novog vozača"
                onSave={async (data) => { await addDriver(data); toast.success(`Vozač dodan`); }}
                onClose={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editDriver} onOpenChange={v => { if (!v) setEditDriver(null); }}>
        <DialogContent className="max-w-lg">
          {editDriver && (
            <DriverForm
              initial={editDriver} vehicles={vehicles} title="Uredi vozača"
              onSave={async (data) => {
                await updateDriver(editDriver.id, data);
                toast.success("Vozač ažuriran");
                setEditDriver(null);
              }}
              onClose={() => setEditDriver(null)}
            />
          )}
        </DialogContent>
      </Dialog>

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
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema vozača</TableCell></TableRow>
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
                              <User className="h-4 w-4 text-primary"/>
                            </div>
                            <div>
                              <p className="font-medium text-sm">{d.full_name}</p>
                              <p className="text-xs text-muted-foreground">{d.phone}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs gap-1 ${typeCfg.color} ${typeCfg.bg}`}>
                            <TypeIcon className="h-3 w-3"/>{typeCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle ? (
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 text-muted-foreground"/>
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
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditDriver(d)}>
                            <Pencil className="h-4 w-4"/>
                          </Button>
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
