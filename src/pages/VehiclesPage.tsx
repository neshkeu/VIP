import { useState } from "react";
import { useApp } from "@/context/AppContext";
import { useAssignments } from "@/hooks/useAssignments";
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
import { Plus, Search, AlertTriangle, Loader2, Pencil, History, User, X, IdCard } from "lucide-react";
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
}

function VehicleForm({ initial, onSave, onClose, title }: VehicleFormProps) {
  const [brand, setBrand]         = useState(initial?.brand ?? "");
  const [model, setModel]         = useState(initial?.model ?? "");
  const [year, setYear]           = useState(String(initial?.year ?? ""));
  const [plate, setPlate]         = useState(initial?.license_plate ?? "");
  const [taxiNum, setTaxiNum]     = useState(initial?.taxi_license_number ?? "");
  const [vin, setVin]             = useState(initial?.vin ?? "");
  const [posId, setPosId]         = useState(initial?.pos_terminal_id ?? "");
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
        registration_expiry: regExpiry, insurance_expiry: insExpiry,
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
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Podaci o vozilu — lična karta</DialogDescription>
      </DialogHeader>

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

function VehicleHistoryModal({ vehicle, open, onClose }: { vehicle: Vehicle | null; open: boolean; onClose: () => void }) {
  const { drivers } = useApp();
  const { getByVehicle, getActiveDriver, assignVehicle, closeAssignment } = useAssignments();
  useCurrentUser();

  const [assignOpen, setAssignOpen]   = useState(false);
  const [newDriverId, setNewDriverId] = useState("none");
  const [newDateFrom, setNewDateFrom] = useState(new Date().toISOString().split("T")[0]);
  const [newNotes, setNewNotes]       = useState("");
  const [saving, setSaving]           = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [editDateTo, setEditDateTo]   = useState("");

  if (!vehicle) return null;

  const history      = getByVehicle(vehicle.id);
  const activeEntry  = getActiveDriver(vehicle.id);
  const activeDriver = activeEntry ? drivers.find(d => d.id === activeEntry.driver_id) : null;

  const handleAssign = async () => {
    if (newDriverId === "none") { toast.error("Izaberi vozača!"); return; }
    setSaving(true);
    try {
      await assignVehicle(newDriverId, vehicle.id, newDateFrom, newNotes);
      toast.success("Vozač dodijeljen");
      setAssignOpen(false); setNewDriverId("none"); setNewNotes("");
    } catch (e) {
      toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
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
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{vehicle.brand} {vehicle.model} — Istorija vozača</DialogTitle>
          <DialogDescription>{vehicle.taxi_license_number} · {vehicle.license_plate}</DialogDescription>
        </DialogHeader>

        <div className={`rounded-lg border p-3 ${activeDriver ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Trenutno vozi</p>
          {activeDriver ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-full bg-green-500/20 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-green-700" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{activeDriver.full_name}</p>
                  <p className="text-xs text-muted-foreground">od {activeEntry?.date_from}</p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="h-7 text-xs"
                onClick={() => { setEditId(activeEntry!.id); setEditDateTo(new Date().toISOString().split("T")[0]); }}>
                Zatvori period
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nema aktivnog vozača</p>
          )}
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

        <Separator />

        {!assignOpen ? (
          <Button variant="outline" onClick={() => setAssignOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Dodijeli vozača
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border p-3 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Novi period</p>
            <div className="grid gap-1.5">
              <Label className="text-xs">Vozač</Label>
              <Select value={newDriverId} onValueChange={setNewDriverId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Datum od</Label>
              <Input type="date" value={newDateFrom} onChange={e => setNewDateFrom(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Napomena</Label>
              <Input value={newNotes} onChange={e => setNewNotes(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" disabled={saving} onClick={handleAssign}>
                {saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Dodijeli
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setAssignOpen(false)}>Otkazi</Button>
            </div>
          </div>
        )}

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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Zatvori</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const VehiclesPage = () => {
  const { vehicles, drivers, loading, addVehicle, updateVehicle } = useApp();
  const { getActiveDriver } = useAssignments();

  const [search, setSearch]             = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [addOpen, setAddOpen]           = useState(false);
  const [editVehicle, setEditVehicle]   = useState<Vehicle | null>(null);
  const [historyVehicle, setHistoryVehicle] = useState<Vehicle | null>(null);
  const [detailVehicle, setDetailVehicle]   = useState<Vehicle | null>(null);

  const filtered = vehicles.filter(v => {
    const q = search.toLowerCase();
    const matchSearch = [v.brand, v.model, v.taxi_license_number, v.license_plate, v.owner_name, v.udruzenje, v.vin]
      .filter(Boolean).join(" ").toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || v.status === statusFilter);
  });

  const statusColors = { active: "default", maintenance: "secondary", inactive: "outline" } as const;
  const statusLabels = { active: "Aktivno", maintenance: "Servis", inactive: "Neaktivno" };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozila</h1>
          <p className="text-muted-foreground text-sm">{vehicles.filter(v => v.status === "active").length} aktivnih vozila</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Marka, tablice, vlasnik..." value={search} onChange={e => setSearch(e.target.value)} />
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
        <DialogContent className="max-w-2xl">
          {editVehicle && (
            <VehicleForm initial={editVehicle} title="Uredi vozilo"
              onSave={async (data) => { await updateVehicle(editVehicle.id, data); toast.success("Vozilo ažurirano"); setEditVehicle(null); }}
              onClose={() => setEditVehicle(null)} />
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
            <Button onClick={() => { setEditVehicle(detailVehicle); setDetailVehicle(null); }}>
              <Pencil className="mr-2 h-4 w-4" />Uredi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <VehicleHistoryModal vehicle={historyVehicle} open={!!historyVehicle} onClose={() => setHistoryVehicle(null)} />

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Komunalni</TableHead>
                  <TableHead>Vlasnik / Udruženje</TableHead>
                  <TableHead>Trenutni vozač</TableHead>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Dokumenti</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nema vozila</TableCell></TableRow>
                ) : (
                  filtered.map((v, i) => {
                    const activeEntry  = getActiveDriver(v.id);
                    const activeDriver = activeEntry ? drivers.find(d => d.id === activeEntry.driver_id) : drivers.find(d => d.vehicle_id === v.id);
                    return (
                      <motion.tr key={v.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }}
                        className="border-b hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <p className="font-medium">{v.brand} {v.model} {v.year > 0 && <span className="text-muted-foreground text-xs">({v.year})</span>}</p>
                          <p className="text-xs text-muted-foreground font-mono">{v.license_plate}</p>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="font-mono text-xs">{v.taxi_license_number || "—"}</Badge></TableCell>
                        <TableCell>
                          <p className="text-sm">{v.owner_name || "—"}</p>
                          {v.udruzenje && <p className="text-xs text-muted-foreground">{v.udruzenje}</p>}
                        </TableCell>
                        <TableCell>
                          {activeDriver ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-2 w-2 rounded-full bg-green-500" />
                              <span className="text-sm">{activeDriver.full_name}</span>
                            </div>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs">
                            {v.registration_expiry && (isExpired(v.registration_expiry) || isExpiringSoon(v.registration_expiry)) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                            <span className={isExpired(v.registration_expiry) ? "text-red-500" : isExpiringSoon(v.registration_expiry) ? "text-amber-600" : ""}>{v.registration_expiry || "—"}</span>
                          </div>
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
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setHistoryVehicle(v)} title="Istorija vozača">
                              <History className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditVehicle(v)} title="Uredi">
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
