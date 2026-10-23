import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAssignments } from "@/hooks/useAssignments";
import { useVehicleDrivers } from "@/hooks/useVehicleDrivers";
import { DriverCombobox } from "@/components/DriverCombobox";
import { useVehicleDriverLog } from "@/hooks/useVehicleDriverLog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { Vehicle, DocStatus } from "@/hooks/useVehicles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, AlertTriangle, Loader2, Pencil, User, X, IdCard, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { DocumentStatusBadge, DocumentStatusSelect } from "@/components/DocumentStatusBadge";
import { VehicleDetailsCard } from "@/components/VehicleDetailsCard";

function isExpiringSoon(date: string) {
  if (!date) return false;
  const diffDays = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diffDays < 30 && diffDays > 0;
}
function isExpired(date: string) { return date ? new Date(date) < new Date() : false; }

interface VehicleFormProps {
  initial?: Partial<Vehicle>;
  onSave: (data: Omit<Vehicle, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
  title: string;
  embedded?: boolean;
}

function VehicleForm({ initial, onSave, onClose, title, embedded }: VehicleFormProps) {
  const [brand, setBrand]         = useState(initial?.brand ?? "");
  const [model, setModel]         = useState(initial?.model ?? "");
  const [year, setYear]           = useState(String(initial?.year ?? ""));
  const [plate, setPlate]         = useState(initial?.license_plate ?? "");
  const [taxiNum, setTaxiNum]     = useState(initial?.taxi_license_number ?? "");
  const [vin, setVin]             = useState(initial?.vin ?? "");
  const [posId, setPosId]         = useState(initial?.pos_terminal_id ?? "");
  const [dailyRate, setDailyRate] = useState(String(initial?.daily_rate ?? ""));
  const [regExpiry, setRegExpiry] = useState(initial?.registration_expiry ?? "");
  const [insExpiry, setInsExpiry] = useState(initial?.insurance_expiry ?? "");
  const [taxiExpiry, setTaxiExpiry] = useState(initial?.taxi_license_expiry ?? "");
  const [udruzenje, setUdruzenje] = useState(initial?.udruzenje ?? "");
  const [ownerName, setOwnerName] = useState(initial?.owner_name ?? "");
  const [ownerPhone, setOwnerPhone] = useState(initial?.owner_phone ?? "");
  const [legVozila, setLegVozila] = useState<DocStatus>(initial?.leg_vozila_status ?? null);
  const [inspekcijski, setInspekcijski] = useState<DocStatus>(initial?.inspekcijski_status ?? null);
  const [saobracajna, setSaobracajna]   = useState<DocStatus>(initial?.saobracajna_status ?? null);
  const [status, setStatus]       = useState(initial?.status ?? "active");
  const [notes, setNotes]         = useState(initial?.notes ?? "");
  const [saving, setSaving]       = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        brand, model, year: Number(year) || 0,
        license_plate: plate, taxi_license_number: taxiNum, vin: vin || null,
        pos_terminal_id: posId,
        daily_rate: Number(dailyRate) || 0,
        registration_expiry: regExpiry || null, insurance_expiry: insExpiry || null,
        taxi_license_expiry: taxiExpiry || null,
        udruzenje: udruzenje || null,
        owner_name: ownerName || null,
        owner_phone: ownerPhone || null,
        leg_vozila_status: legVozila,
        inspekcijski_status: inspekcijski,
        saobracajna_status: saobracajna,
        status: status as Vehicle["status"], notes,
      });
      onClose();
    } catch (e) {
      toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  };

  return (
    <>
      {!embedded && (
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Podaci o vozilu — lična karta</DialogDescription>
        </DialogHeader>
      )}

      <Tabs defaultValue="basic" className="mt-2">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="basic">Osnovno</TabsTrigger>
          <TabsTrigger value="owner">Vlasnik</TabsTrigger>
          <TabsTrigger value="expiry">Rokovi</TabsTrigger>
          <TabsTrigger value="docs">Dokumenti</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3 pt-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Marka</Label><Input value={brand} onChange={e => setBrand(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Model</Label><Input value={model} onChange={e => setModel(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Godina</Label><Input type="number" value={year} onChange={e => setYear(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">Tablice</Label><Input value={plate} onChange={e => setPlate(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Komunalni broj (krovna oznaka)</Label><Input value={taxiNum} onChange={e => setTaxiNum(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label className="text-xs">VIN (broj šasije)</Label><Input value={vin} onChange={e => setVin(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">POS terminal ID</Label><Input value={posId} onChange={e => setPosId(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Dnevna renta (RSD)</Label>
            <Input type="number" placeholder="npr. 3900" value={dailyRate} onChange={e => setDailyRate(e.target.value)} />
            <p className="text-xs text-muted-foreground">Vozač vuče ovu rentu dok vozi ovo vozilo</p>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Status</Label>
            <Select value={status} onValueChange={v => setStatus(v as Vehicle["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktivno</SelectItem>
                <SelectItem value="maintenance">Servis</SelectItem>
                <SelectItem value="inactive">Neaktivno</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Napomena</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </TabsContent>

        <TabsContent value="owner" className="space-y-3 pt-3">
          <div className="grid gap-1.5"><Label className="text-xs">Vlasnik vozila (VOZAČ AUTOMOBILA)</Label><Input value={ownerName} onChange={e => setOwnerName(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Telefon vlasnika</Label><Input value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Udruženje (gazda)</Label><Input value={udruzenje} onChange={e => setUdruzenje(e.target.value)} /></div>
        </TabsContent>

        <TabsContent value="expiry" className="space-y-3 pt-3">
          <div className="grid gap-1.5"><Label className="text-xs">Taksi legitimacija ističe</Label><Input type="date" value={taxiExpiry} onChange={e => setTaxiExpiry(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Registracija ističe</Label><Input type="date" value={regExpiry} onChange={e => setRegExpiry(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Osiguranje ističe</Label><Input type="date" value={insExpiry} onChange={e => setInsExpiry(e.target.value)} /></div>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4 pt-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Legitimacija vozila (LEG. VOZILA)</Label>
            <DocumentStatusSelect value={legVozila} onChange={setLegVozila} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Inspekcijski</Label>
            <DocumentStatusSelect value={inspekcijski} onChange={setInspekcijski} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Saobraćajna</Label>
            <DocumentStatusSelect value={saobracajna} onChange={setSaobracajna} />
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>Otkazi</Button>
        <Button disabled={!brand || !model || saving} onClick={handleSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj
        </Button>
      </DialogFooter>
    </>
  );
}

// Zameni vozilo: komunalni broj + vozači ostaju; staro vozilo ide u trag/istoriju.
function ReplaceVehicleDialog({ vehicle }: { vehicle: Vehicle }) {
  const { updateVehicle } = useApp();
  const { addLog } = useVehicleDriverLog();
  const { displayName } = useCurrentUser();
  const today = new Date().toISOString().split("T")[0];
  const [open, setOpen]   = useState(false);
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear]   = useState("");
  const [plate, setPlate] = useState("");
  const [vin, setVin]     = useState("");
  const [reg, setReg]     = useState("");
  const [ins, setIns]     = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => { setBrand(""); setModel(""); setYear(""); setPlate(""); setVin(""); setReg(""); setIns(""); };

  const confirm = async () => {
    setSaving(true);
    try {
      const oldDesc = `${vehicle.brand} ${vehicle.model}${vehicle.year ? " " + vehicle.year : ""} · ${vehicle.license_plate || "—"}`;
      const newDesc = `${brand} ${model}${year ? " " + year : ""} · ${plate || "—"}`;
      await updateVehicle(vehicle.id, {
        brand, model, year: Number(year) || 0,
        license_plate: plate, vin: vin || null,
        registration_expiry: reg || null, insurance_expiry: ins || null,
      });
      await addLog({ vehicle_id: vehicle.id, driver_id: null, role: null, action: "vehicle_swapped", date: today, performed_by: displayName, note: `Staro: ${oldDesc} → Novo: ${newDesc}` });
      toast.success("Vozilo zamenjeno — komunalni broj i vozači ostaju");
      setOpen(false); reset();
    } catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full"><RefreshCw className="h-4 w-4 mr-1.5" />Zameni vozilo (zadrži komunalni broj i vozače)</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Zameni vozilo</DialogTitle>
          <DialogDescription>Komunalni broj {vehicle.taxi_license_number || "—"} ostaje. Staro vozilo ide u trag, vozači ostaju.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">Staro vozilo: {vehicle.brand} {vehicle.model} · {vehicle.license_plate || "—"}</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Marka</Label><Input value={brand} onChange={e=>setBrand(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Model</Label><Input value={model} onChange={e=>setModel(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Godina</Label><Input type="number" value={year} onChange={e=>setYear(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Tablice</Label><Input value={plate} onChange={e=>setPlate(e.target.value)} /></div>
          </div>
          <div className="grid gap-1.5"><Label>VIN (opciono)</Label><Input value={vin} onChange={e=>setVin(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label>Registracija do</Label><Input type="date" value={reg} onChange={e=>setReg(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Osiguranje do</Label><Input type="date" value={ins} onChange={e=>setIns(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={()=>setOpen(false)}>Otkaži</Button>
          <Button disabled={!brand || !plate || saving} onClick={confirm}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Zameni</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VehicleDriversPanel({ vehicle }: { vehicle: Vehicle }) {
  const { drivers, vehicles, updateDriver, displayName } = useApp();
  const { getByVehicle, getByDriver, closeAssignment, assignVehicle } = useAssignments();
  const { forVehicle, forDriver: forDriverLinks, addLink, removeLink } = useVehicleDrivers();
  const { addLog, forVehicle: logsForVehicle } = useVehicleDriverLog();
  useCurrentUser();
  const today = new Date().toISOString().split("T")[0];

  const [saving, setSaving]           = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editDateTo, setEditDateTo]   = useState("");
  const [addDrvId, setAddDrvId]       = useState("none");
  const [addRole, setAddRole]         = useState<"operativni" | "papiroloski">("operativni");
  // Potvrda sklanjanja vozača (samo sa ovog vozila ILI potpuna deaktivacija)
  const [removeTarget, setRemoveTarget] = useState<{ linkId: string | null; driver: typeof drivers[number]; role: string } | null>(null);

  const history = getByVehicle(vehicle.id);
  // Vozači na vozilu iz join tabele (+ legacy vehicle_id fallback)
  const linkRows = forVehicle(vehicle.id)
    .map(l => ({ linkId: l.id, driver: drivers.find(d => d.id === l.driver_id), role: l.role }))
    .filter(x => x.driver) as { linkId: string; driver: typeof drivers[number]; role: string }[];
  const legacyRows = drivers
    .filter(d => d.vehicle_id === vehicle.id && !linkRows.some(r => r.driver.id === d.id))
    .map(d => ({ linkId: null as string | null, driver: d, role: d.role }));
  const vehicleDriverRows = [...linkRows, ...legacyRows];
  const onVehicleIds = new Set(vehicleDriverRows.map(r => r.driver.id));
  // Svi vozači koji NISU na ovom vozilu (uklj. neaktivne — da se mogu naći i ponovo dodati).
  // Aktivni prvo, pa po imenu.
  const addOptions = drivers
    .filter(d => !onVehicleIds.has(d.id))
    .sort((a, b) => (a.status === b.status ? a.full_name.localeCompare(b.full_name) : a.status === "active" ? -1 : 1));

  const addDriverToVehicle = async () => {
    if (addDrvId === "none") { toast.error("Izaberi vozača"); return; }
    const drv = drivers.find(d => d.id === addDrvId);
    setSaving(true);
    try {
      await addLink(vehicle.id, addDrvId, addRole);
      // Ako je vozač bio neaktivan, dodavanje na vozilo ga ponovo aktivira.
      if (drv?.status === "inactive") await updateDriver(addDrvId, { status: "active" });
      if (addRole === "operativni") {
        // ZAŠTITA: ako vozač ima staru 'legacy' papirološku vezu preko polja vehicle_id
        // (na drugom vozilu) koja NIJE prava veza, sačuvaj je kao pravu vezu PRE nego što
        // prepišemo vehicle_id — da se papirološko vozilo ne izgubi.
        if (drv?.vehicle_id && drv.vehicle_id !== vehicle.id && drv.role === "papiroloski"
            && !forDriverLinks(drv.id).some(l => l.vehicle_id === drv.vehicle_id)) {
          await addLink(drv.vehicle_id, drv.id, "papiroloski");
        }
        // Operativni vozač stvarno vozi auto → otvori period dodele (snapshot rente) i sinhronizuj staro polje.
        const snapRate = (drv?.daily_rate ?? 0) > 0 ? drv!.daily_rate : (vehicle.daily_rate || 0);
        await assignVehicle(addDrvId, vehicle.id, today, {
          daily_rate: snapRate,
          weekly_membership: drv?.weekly_membership ?? 0,
          weekly_membership_own: drv?.weekly_membership_own ?? 0,
          pos_monthly_fee: drv?.pos_monthly_fee ?? 0,
          komunalni_monthly: drv?.komunalni_monthly ?? 0,
          doprinosi_monthly: drv?.doprinosi_monthly ?? 0,
        }, "Dodeljeno na vozilu");
        await updateDriver(addDrvId, { vehicle_id: vehicle.id });
      }
      await addLog({ vehicle_id: vehicle.id, driver_id: addDrvId, role: addRole, action: "added", date: today, performed_by: displayName, note: null });
      toast.success("Vozač dodat na vozilo");
      setAddDrvId("none");
    } catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  // Skloni vozača SAMO sa ovog vozila (ostaje aktivan — npr. prelazi na drugo vozilo)
  const removeFromThisVehicle = async (row: { linkId: string | null; driver: typeof drivers[number]; role: string }) => {
    setSaving(true);
    try {
      if (row.linkId) await removeLink(row.linkId);
      if (row.driver.vehicle_id === vehicle.id) await updateDriver(row.driver.id, { vehicle_id: null });
      // Zatvori otvoreni period dodele ovog vozača na ovom vozilu
      const openA = getByDriver(row.driver.id).find(a => a.vehicle_id === vehicle.id && !a.date_to);
      if (openA) await closeAssignment(openA.id, today);
      await addLog({ vehicle_id: vehicle.id, driver_id: row.driver.id, role: row.role, action: "removed", date: today, performed_by: displayName, note: null });
      toast.success("Vozač uklonjen sa vozila");
      setRemoveTarget(null);
    } catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  // Vozač više ne radi → skini sa SVIH vozila, zatvori sve periode, status neaktivan.
  // Dugovi ostaju vidljivi dok se ne izmire.
  const deactivateDriver = async (row: { driver: typeof drivers[number] }) => {
    setSaving(true);
    try {
      // skini sve veze vozač–vozilo
      for (const l of forDriverLinks(row.driver.id)) await removeLink(l.id);
      // zatvori sve otvorene periode
      for (const a of getByDriver(row.driver.id).filter(a => !a.date_to)) await closeAssignment(a.id, today);
      await updateDriver(row.driver.id, { status: "inactive", vehicle_id: null });
      await addLog({ vehicle_id: vehicle.id, driver_id: row.driver.id, role: row.driver.role, action: "deactivated", date: today, performed_by: displayName, note: "Vozač više ne radi" });
      toast.success("Vozač deaktiviran i sklonjen sa svih vozila");
      setRemoveTarget(null);
    } catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
    finally { setSaving(false); }
  };

  const handleClose = async (id: string) => {
    if (!editDateTo) { toast.error("Unesi datum do!"); return; }
    setSaving(true);
    try {
      await closeAssignment(id, editDateTo);
      toast.success("Period zatvoren");
      setEditId(null); setEditDateTo("");
    } catch (e) {
      toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-3">
        {/* VOZAČI NA VOZILU — operativni + papirološki, dodavanje/uklanjanje */}
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase">Vozači na vozilu</p>
          {vehicleDriverRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nijedan vozač nije vezan za ovo vozilo</p>
          ) : (
            <div className="space-y-1">
              {vehicleDriverRows.map(row => (
                <div key={row.driver.id} className="flex items-center justify-between rounded border px-2 py-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${row.role === "operativni" ? "bg-green-500" : "bg-orange-500"}`} />
                    <span className="text-sm font-medium">{row.driver.full_name}</span>
                    <Badge variant="outline" className="text-[10px]">{row.role === "operativni" ? "operativni" : "papirološki"}</Badge>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" disabled={saving} title="Ukloni sa vozila" onClick={() => setRemoveTarget(row)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 pt-1">
            <div className="grid gap-1 flex-1">
              <Label className="text-[11px]">Dodaj vozača</Label>
              <DriverCombobox
                value={addDrvId === "none" ? "" : addDrvId}
                onChange={v => setAddDrvId(v || "none")}
                placeholder="pretraži vozača..."
                options={addOptions.map(d => {
                  const veh = vehicles.find(ve => ve.id === d.vehicle_id);
                  const base = veh ? `${veh.brand} ${veh.model} (${veh.taxi_license_number || "?"})` : (d.phone || "bez vozila");
                  return {
                    value: d.id,
                    label: d.full_name,
                    sublabel: d.status === "inactive" ? `⚠ neaktivan · ${base}` : base,
                  };
                })}
              />
            </div>
            <Select value={addRole} onValueChange={v => setAddRole(v as "operativni" | "papiroloski")}>
              <SelectTrigger className="h-8 text-sm w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="operativni">operativni</SelectItem>
                <SelectItem value="papiroloski">papirološki</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-8" disabled={saving || addDrvId === "none"} onClick={addDriverToVehicle}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {editId && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="flex items-center gap-2 rounded-lg border p-3 bg-amber-50 border-amber-200">
                <div className="flex-1">
                  <Label className="text-xs">Datum do</Label>
                  <Input type="date" className="mt-1 h-8" value={editDateTo} onChange={e => setEditDateTo(e.target.value)} />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" disabled={saving} onClick={() => handleClose(editId)}>
                    {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Sačuvaj
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditId(null); setEditDateTo(""); }}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {history.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Istorija</p>
              {history.map(a => {
                const driver = drivers.find(d => d.id === a.driver_id);
                return (
                  <div key={a.id} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${!a.date_to ? "bg-green-500" : "bg-gray-300"}`} />
                      <span className="font-medium">{driver?.full_name ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{a.date_from}</span>
                      <span>→</span>
                      <span>{a.date_to ?? <span className="text-green-600 font-medium">aktivno</span>}</span>
                      {a.date_to && (
                        <button onClick={() => { setEditId(a.id); setEditDateTo(a.date_to!); }}
                          className="text-muted-foreground hover:text-foreground ml-1">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* TRAG PROMENA — ko/kada/koja uloga (dodat/sklonjen/deaktiviran) */}
        {logsForVehicle(vehicle.id).length > 0 && (
          <>
            <Separator />
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Trag promena</p>
              {logsForVehicle(vehicle.id).map(l => {
                const drv = drivers.find(d => d.id === l.driver_id);
                const isSwap = l.action === "vehicle_swapped";
                const actLabel = isSwap ? "vozilo zamenjeno" : l.action === "added" ? "dodat" : l.action === "removed" ? "sklonjen" : "deaktiviran";
                const actColor = isSwap ? "text-blue-600" : l.action === "added" ? "text-green-600" : l.action === "removed" ? "text-orange-600" : "text-red-600";
                return (
                  <div key={l.id} className="flex items-center justify-between rounded-md bg-muted/20 px-3 py-1.5 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`font-medium ${actColor} flex-shrink-0`}>{actLabel}</span>
                      <span className="truncate text-muted-foreground">{isSwap ? (l.note ?? "") : (drv?.full_name ?? "—")}</span>
                      {!isSwap && l.role && <Badge variant="outline" className="text-[10px]">{l.role === "operativni" ? "operativni" : "papirološki"}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground flex-shrink-0">
                      <span>{l.date}</span>
                      {l.performed_by && <span>· {l.performed_by}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

      {/* Potvrda sklanjanja vozača — izbor: samo sa ovog vozila ILI potpuna deaktivacija */}
      <Dialog open={!!removeTarget} onOpenChange={v => { if (!v) setRemoveTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ukloni vozača</DialogTitle>
            <DialogDescription>
              {removeTarget?.driver.full_name} — {vehicle.brand} {vehicle.model} ({vehicle.taxi_license_number})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-1">
            <button
              className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors"
              disabled={saving}
              onClick={() => removeTarget && removeFromThisVehicle(removeTarget)}>
              <p className="text-sm font-medium">Skloni samo sa ovog vozila</p>
              <p className="text-xs text-muted-foreground">Vozač ostaje aktivan (npr. prelazi na drugo vozilo). Period na ovom vozilu se zatvara.</p>
            </button>
            <button
              className="w-full text-left rounded-lg border border-red-200 bg-red-50/40 p-3 hover:bg-red-50 transition-colors"
              disabled={saving}
              onClick={() => removeTarget && deactivateDriver(removeTarget)}>
              <p className="text-sm font-medium text-red-700">Vozač više ne radi — deaktiviraj</p>
              <p className="text-xs text-muted-foreground">Skida se sa svih vozila, svi periodi se zatvaraju, status → neaktivan. Dugovi ostaju vidljivi dok se ne izmire.</p>
            </button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={saving}>Otkaži</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const VehiclesPage = () => {
  const { vehicles, drivers, loading, addVehicle, updateVehicle, updateDriver } = useApp();
  const { links: vdLinks } = useVehicleDrivers();
  const { getActiveDriver } = useAssignments();

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleTab, setRoleTab]           = useState<"sva" | "operativni" | "papiroloski">("sva");
  const [addOpen, setAddOpen]           = useState(false);
  const [editVehicle, setEditVehicle]   = useState<Vehicle | null>(null);
  const [editTab, setEditTab]           = useState<"vozilo" | "vozaci">("vozilo");
  const [detailVehicle, setDetailVehicle]   = useState<Vehicle | null>(null);

  const statusColors = { active: "default", maintenance: "secondary", inactive: "outline" } as const;
  const statusLabels = { active: "Aktivno", maintenance: "Servis", inactive: "Neaktivno" };

  const filtered = vehicles.filter(v => {
    const q = search.trim().toLowerCase();
    if (q) {
      // Vozači vezani za ovo vozilo (nova veza + staro polje) — da se traži i po imenu/broju vozača
      const vehDrivers = drivers.filter(d =>
        vdLinks.some(l => l.vehicle_id === v.id && l.driver_id === d.id) || d.vehicle_id === v.id
      );
      const driverBits = vehDrivers.flatMap(d => [d.full_name, d.phone, d.komunalni_broj, d.license_number]);
      const haystack = [
        v.brand, v.model, v.year, v.license_plate, v.taxi_license_number, v.vin,
        v.pos_terminal_id, v.owner_name, v.owner_phone, v.udruzenje,
        v.komunalni_amount, v.komunalni_currency, v.daily_rate, v.notes,
        statusLabels[v.status],
        ...driverBits,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return statusFilter === "all" || v.status === statusFilter;
  });

  // Da li vozilo (komunalni broj) ima vozača date uloge (nova veza + staro polje)
  const vehicleHasRole = (v: Vehicle, role: string) =>
    vdLinks.some(l => l.vehicle_id === v.id && l.role === role) ||
    drivers.some(d => d.vehicle_id === v.id && d.role === role && !vdLinks.some(l => l.vehicle_id === v.id && l.driver_id === d.id));

  const opsCount  = filtered.filter(v => vehicleHasRole(v, "operativni")).length;
  const papsCount = filtered.filter(v => vehicleHasRole(v, "papiroloski")).length;
  const roleFiltered = filtered.filter(v =>
    roleTab === "operativni" ? vehicleHasRole(v, "operativni")
    : roleTab === "papiroloski" ? vehicleHasRole(v, "papiroloski")
    : true
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Komunalni broj</h1>
          <p className="text-muted-foreground text-sm">{vehicles.filter(v => v.status === "active").length} aktivnih · vozilo, vozači i istorija na jednom mestu</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Marka, tablice, vozač, udruženje, broj..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="active">Aktivna</SelectItem>
              <SelectItem value="maintenance">Servis</SelectItem>
              <SelectItem value="inactive">Neaktivna</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Novo vozilo</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <VehicleForm title="Dodaj novo vozilo"
                onSave={async (data) => { await addVehicle(data); toast.success("Vozilo dodano"); }}
                onClose={() => setAddOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editVehicle} onOpenChange={v => { if (!v) setEditVehicle(null); }}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          {editVehicle && (
            <>
              <DialogHeader>
                <DialogTitle>Komunalni {editVehicle.taxi_license_number || "—"} — {editVehicle.brand} {editVehicle.model}</DialogTitle>
                <DialogDescription>Vozilo, vozači i istorija — sve na jednom mestu</DialogDescription>
              </DialogHeader>
              <Tabs value={editTab} onValueChange={v => setEditTab(v as "vozilo" | "vozaci")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="vozilo">Vozilo</TabsTrigger>
                  <TabsTrigger value="vozaci">Vozači i istorija</TabsTrigger>
                </TabsList>
                <TabsContent value="vozilo" className="mt-3 space-y-3">
                  <ReplaceVehicleDialog vehicle={editVehicle} />
                  <VehicleForm embedded initial={editVehicle} title="Uredi vozilo"
                    onSave={async (data) => {
                      const oldRate = editVehicle.daily_rate || 0;
                      const newRate = data.daily_rate || 0;
                      await updateVehicle(editVehicle.id, data);
                      // Nova renta vozila se primenjuje i na vozače koji su trenutno na tom
                      // vozilu i voze po STANDARDNOJ ceni (renta == stara renta vozila).
                      // Vozača sa posebnom/popust cenom NE diramo.
                      let applied = 0;
                      if (newRate !== oldRate) {
                        const affected = drivers.filter(d =>
                          d.vehicle_id === editVehicle.id &&
                          d.driver_type === "renta" &&
                          (d.daily_rate || 0) === oldRate
                        );
                        for (const d of affected) {
                          await updateDriver(d.id, { daily_rate: newRate });
                        }
                        applied = affected.length;
                      }
                      toast.success(applied > 0
                        ? `Vozilo ažurirano — renta primenjena i na ${applied} vozača`
                        : "Vozilo ažurirano");
                      setEditVehicle(null);
                    }}
                    onClose={() => setEditVehicle(null)} />
                </TabsContent>
                <TabsContent value="vozaci" className="mt-3">
                  <VehicleDriversPanel vehicle={editVehicle} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!detailVehicle} onOpenChange={v => { if (!v) setDetailVehicle(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lična karta vozila</DialogTitle>
            <DialogDescription>Pregled svih podataka</DialogDescription>
          </DialogHeader>
          {detailVehicle && <VehicleDetailsCard vehicle={detailVehicle} drivers={drivers} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailVehicle(null)}>Zatvori</Button>
            <Button onClick={() => { setEditTab("vozilo"); setEditVehicle(detailVehicle); setDetailVehicle(null); }}>
              <Pencil className="mr-2 h-4 w-4" />Uredi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Tabs value={roleTab} onValueChange={v => setRoleTab(v as "sva" | "operativni" | "papiroloski")}>
        <TabsList>
          <TabsTrigger value="sva">Sva <Badge variant="secondary" className="ml-2 text-xs">{filtered.length}</Badge></TabsTrigger>
          <TabsTrigger value="operativni">Operativni <Badge variant="secondary" className="ml-2 text-xs">{opsCount}</Badge></TabsTrigger>
          <TabsTrigger value="papiroloski">Papirološki <Badge variant="secondary" className="ml-2 text-xs">{papsCount}</Badge></TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Komunalni broj</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Udruženje</TableHead>
                  <TableHead>Operativni</TableHead>
                  <TableHead>Papirološki</TableHead>
                  <TableHead>Dokumenti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema vozila</TableCell></TableRow>
                ) : (
                  roleFiltered.map((v, i) => {
                    // Vozači na vozilu = iz join tabele (vozač–vozilo+uloga); fallback na legacy vehicle_id+role
                    const linkRows = vdLinks.filter(l => l.vehicle_id === v.id)
                      .map(l => ({ driver: drivers.find(d => d.id === l.driver_id), role: l.role }))
                      .filter(x => x.driver) as { driver: typeof drivers[number]; role: string }[];
                    const legacy = drivers.filter(d => d.vehicle_id === v.id && !vdLinks.some(l => l.vehicle_id === v.id && l.driver_id === d.id))
                      .map(d => ({ driver: d, role: d.role }));
                    const all = [...linkRows, ...legacy];
                    const ops = all.filter(x => x.role === "operativni").map(x => x.driver);
                    const paps = all.filter(x => x.role === "papiroloski").map(x => x.driver);
                    return (
                      <motion.tr key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="border-b hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <Badge className="font-mono text-sm font-bold px-2.5 py-1 bg-primary/10 text-primary border border-primary/30 hover:bg-primary/10">
                            {v.taxi_license_number || "—"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{v.brand} {v.model} {v.year > 0 && <span className="text-muted-foreground text-xs">({v.year})</span>}</p>
                          <p className="text-xs text-muted-foreground font-mono">{v.license_plate}</p>
                          {v.daily_rate > 0 && (
                            <p className="text-xs mt-0.5 font-medium text-green-700">Renta: {v.daily_rate.toLocaleString("sr-RS")} RSD/dan</p>
                          )}
                          {v.komunalni_amount > 0 && (
                            <p className="text-xs text-blue-600 mt-0.5">💰 {v.komunalni_amount} {v.komunalni_currency}/mj.</p>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.udruzenje ? (
                            <p className="text-sm">{v.udruzenje}</p>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {ops.length > 0 ? (
                            <div className="space-y-0.5">
                              {ops.map(d => (
                                <div key={d.id} className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                  <span className="text-sm font-medium">{d.full_name}</span>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          {paps.length > 0 ? (
                            <div className="space-y-0.5">
                              {paps.map(d => (
                                <div key={d.id} className="flex items-center gap-1.5">
                                  <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0" />
                                  <span className="text-sm">{d.full_name}</span>
                                </div>
                              ))}
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <DocumentStatusBadge status={v.leg_vozila_status} label="LV" />
                            <DocumentStatusBadge status={v.inspekcijski_status} label="IN" />
                            <DocumentStatusBadge status={v.saobracajna_status} label="SB" />
                          </div>
                        </TableCell>
                        <TableCell><Badge variant={statusColors[v.status]}>{statusLabels[v.status]}</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setDetailVehicle(v)} title="Lična karta">
                              <IdCard className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditTab("vozilo"); setEditVehicle(v); }} title="Uredi">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
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

export default VehiclesPage;
