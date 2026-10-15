import { useState } from "react";
import { useDrivers, type Driver, type DriverRole } from "@/hooks/useDrivers";
import { useVehicles, type DocStatus, type Vehicle } from "@/hooks/useVehicles";
import { useDebts } from "@/hooks/useDebts";
import { useDeposits } from "@/hooks/useDeposits";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, User, Car, CarTaxiFront, Wrench, Loader2, Pencil, FileText, Users, ArrowRightLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { DocumentStatusBadge, DocumentStatusSelect } from "@/components/DocumentStatusBadge";
import { useAssignments, type VehicleAssignment, type AssignmentFees } from "@/hooks/useAssignments";
import { useVehicleDrivers } from "@/hooks/useVehicleDrivers";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const TYPE_CFG = {
  renta:           { label: "Renta",           color: "text-blue-700",   bg: "bg-blue-50 border-blue-200",     icon: CarTaxiFront },
  vlastito_vozilo: { label: "Vlastito vozilo", color: "text-purple-700", bg: "bg-purple-50 border-purple-200", icon: Wrench },
};

const ROLE_CFG = {
  operativni:  { label: "Operativni",  color: "text-green-700 bg-green-50 border-green-200",   icon: User },
  papiroloski: { label: "Papirološki", color: "text-orange-700 bg-orange-50 border-orange-200", icon: FileText },
};

interface DriverFormProps {
  initial?: Partial<Driver>;
  vehicles: Vehicle[];
  onSave: (data: Omit<Driver, "id" | "created_at">) => Promise<void>;
  onClose: () => void;
  title: string;
}

function DriverForm({ initial, vehicles, onSave, onClose, title }: DriverFormProps) {
  const [name, setName]           = useState(initial?.full_name ?? "");
  const [phone, setPhone]         = useState(initial?.phone ?? "");
  const [licNum, setLicNum]       = useState(initial?.license_number ?? "");
  const [komBroj, setKomBroj]     = useState(initial?.komunalni_broj ?? "");
  const [vehicleId, setVehicleId] = useState(initial?.vehicle_id ?? "none");
  const [role, setRole]           = useState<DriverRole>(initial?.role ?? "operativni");
  const [type, setType]           = useState<"renta" | "vlastito_vozilo">(initial?.driver_type ?? "renta");
  const [paysSunday, setPaysSunday] = useState<boolean>(initial?.pays_sunday ?? (initial?.driver_type === "vlastito_vozilo"));
  const [dailyRate, setDailyRate] = useState(String(initial?.daily_rate ?? ""));
  const [weekly, setWeekly]       = useState(String(initial?.weekly_membership ?? "2000"));
  const [posFee, setPosFee]       = useState(String(initial?.pos_monthly_fee ?? ""));
  const [komunalni, setKomunalni] = useState(String(initial?.komunalni_monthly ?? ""));
  const [doprinosi, setDoprinosi] = useState(String(initial?.doprinosi_monthly ?? ""));
  const [memberOwn, setMemberOwn] = useState(String(initial?.weekly_membership_own ?? "2000"));

  const [lk, setLk]             = useState<DocStatus>(initial?.lk_status ?? null);
  const [vozacka, setVozacka]   = useState<DocStatus>(initial?.vozacka_status ?? null);
  const [lekarski, setLekarski] = useState<DocStatus>(initial?.lekarski_status ?? null);
  const [ugovor, setUgovor]     = useState<DocStatus>(initial?.ugovor_status ?? null);
  const [ma, setMa]             = useState<DocStatus>(initial?.ma_status ?? null);
  const [legVozaca, setLegVozaca] = useState<DocStatus>(initial?.leg_vozaca_status ?? null);
  const [diploma, setDiploma]   = useState<DocStatus>(initial?.diploma_status ?? null);
  const [cpc, setCpc]           = useState<DocStatus>(initial?.cpc_status ?? null);
  const [uverenje, setUverenje] = useState<DocStatus>(initial?.uverenje_grad_status ?? null);
  const [sst, setSst]           = useState<"IMA" | "NEMA" | null>(initial?.sst_status ?? null);
  const [dcs, setDcs]           = useState(initial?.dipl_cpc_sst ?? "");

  const [notes, setNotes]   = useState(initial?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        full_name: name, phone, license_number: licNum, komunalni_broj: komBroj.trim() || null, status: "active",
        role, driver_type: type, pays_sunday: paysSunday,
        vehicle_id: vehicleId === "none" ? null : vehicleId,
        daily_rate: Number(dailyRate) || 0,
        weekly_membership: Number(weekly) || 0,
        pos_monthly_fee: Number(posFee) || 0,
        komunalni_monthly: Number(komunalni) || 0,
        doprinosi_monthly: Number(doprinosi) || 0,
        weekly_membership_own: Number(memberOwn) || 0,
        lk_status: lk, vozacka_status: vozacka, lekarski_status: lekarski,
        ugovor_status: ugovor, ma_status: ma, leg_vozaca_status: legVozaca,
        diploma_status: diploma, cpc_status: cpc, uverenje_grad_status: uverenje,
        sst_status: sst, dipl_cpc_sst: dcs || null,
        notes,
      });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/23505|duplicate|unique/i.test(msg) && /komunalni/i.test(msg)) {
        toast.error("Već postoji vozač sa tim komunalnim brojem — proveri da nije duplikat.");
      } else {
        toast.error("Greška: " + msg);
      }
    } finally { setSaving(false); }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>Podaci vozača — lična karta</DialogDescription>
      </DialogHeader>

      <Tabs defaultValue="basic" className="mt-2">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="basic">Osnovno</TabsTrigger>
          <TabsTrigger value="fees">Naknade</TabsTrigger>
          <TabsTrigger value="docs">Dokumenti</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-3 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label className="text-xs">Ime i prezime</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Telefon</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2"><Label className="text-xs">Broj vozačke</Label><Input value={licNum} onChange={e => setLicNum(e.target.value)} /></div>
            <div className="grid gap-2"><Label className="text-xs">Komunalni broj</Label><Input value={komBroj} onChange={e => setKomBroj(e.target.value)} placeholder="jedinstven" /><p className="text-xs text-muted-foreground">Jedinstven — sprečava duplikat</p></div>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Vozilo</Label>
            <Select value={vehicleId ?? "none"} onValueChange={setVehicleId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Bez vozila —</SelectItem>
                {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Uloga vozača</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["operativni", "papiroloski"] as const).map(r => {
                const cfg = ROLE_CFG[r]; const Icon = cfg.icon;
                return (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${role === r ? `${cfg.color} border-current` : "hover:bg-muted border-border"}`}>
                    <Icon className="h-4 w-4" />{cfg.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {role === "operativni" ? "Vozi vozilo — plaća rentu/članarinu" : "Pokriva vozilo papirološki (dokumenti)"}
            </p>
          </div>
          {role === "operativni" && (
            <div className="grid gap-2">
              <Label className="text-xs">Tip vozača (način obračuna)</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["renta", "vlastito_vozilo"] as const).map(t => {
                  const cfg = TYPE_CFG[t]; const Icon = cfg.icon;
                  return (
                    <button key={t} type="button" onClick={() => setType(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-all ${type === t ? `${cfg.bg} ${cfg.color} border-current` : "hover:bg-muted border-border"}`}>
                      <Icon className="h-4 w-4" />{cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer hover:bg-muted/40">
            <input type="checkbox" checked={paysSunday} onChange={e => setPaysSunday(e.target.checked)} className="h-4 w-4" />
            <div>
              <span className="text-sm font-medium">Plaća nedelju</span>
              <p className="text-xs text-muted-foreground">Uključi ako radi na svom vozilu — tada se i nedelja naplaćuje (inače je nedelja besplatna po defaultu)</p>
            </div>
          </label>
          <div className="grid gap-2"><Label className="text-xs">Napomena</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </TabsContent>

        <TabsContent value="fees" className="space-y-3 pt-3">
          {role === "papiroloski" ? (
            <p className="text-sm text-muted-foreground italic">Papirološki vozač nema naknade (samo pokriva vozilo).</p>
          ) : (
            <AnimatePresence mode="wait">
              {type === "renta" ? (
                <motion.div key="renta" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Dnevna renta</Label><Input type="number" value={dailyRate} onChange={e => setDailyRate(e.target.value)} /><p className="text-xs text-muted-foreground">Dnevno</p></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Članarina</Label><Input type="number" value={weekly} onChange={e => setWeekly(e.target.value)} /><p className="text-xs text-muted-foreground">Sedmično</p></div>
                  <div className="grid gap-1.5"><Label className="text-xs">POS naknada</Label><Input type="number" value={posFee} onChange={e => setPosFee(e.target.value)} /><p className="text-xs text-muted-foreground">Mjesečno</p></div>
                </motion.div>
              ) : (
                <motion.div key="vlastito" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Komunalni</Label><Input type="number" value={komunalni} onChange={e => setKomunalni(e.target.value)} /><p className="text-xs text-muted-foreground">Mjesečno</p></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Članarina</Label><Input type="number" value={memberOwn} onChange={e => setMemberOwn(e.target.value)} /><p className="text-xs text-muted-foreground">Sedmično</p></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Doprinosi</Label><Input type="number" value={doprinosi} onChange={e => setDoprinosi(e.target.value)} /><p className="text-xs text-muted-foreground">Mjesečno</p></div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </TabsContent>

        <TabsContent value="docs" className="space-y-4 pt-3">
          <div className="grid gap-1.5"><Label className="text-xs">Lična karta (LK)</Label><DocumentStatusSelect value={lk} onChange={setLk} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Vozačka dozvola</Label><DocumentStatusSelect value={vozacka} onChange={setVozacka} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Lekarsko uverenje</Label><DocumentStatusSelect value={lekarski} onChange={setLekarski} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Ugovor</Label><DocumentStatusSelect value={ugovor} onChange={setUgovor} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">MA</Label><DocumentStatusSelect value={ma} onChange={setMa} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Legitimacija vozača</Label><DocumentStatusSelect value={legVozaca} onChange={setLegVozaca} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Diploma</Label><DocumentStatusSelect value={diploma} onChange={setDiploma} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">CPC</Label><DocumentStatusSelect value={cpc} onChange={setCpc} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Uverenje grada</Label><DocumentStatusSelect value={uverenje} onChange={setUverenje} /></div>
          <Separator />
          <div className="grid gap-1.5">
            <Label className="text-xs">Status starog taksiste</Label>
            <div className="flex gap-1">
              {[null, "IMA", "NEMA"].map(v => (
                <button key={String(v)} type="button" onClick={() => setSst(v as "IMA" | "NEMA" | null)}
                  className={`px-3 py-1 text-xs rounded border transition-colors ${sst === v ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-accent border-input"}`}>
                  {v ?? "—"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">DIPL/CPC/SST</Label>
            <Select value={dcs || "none"} onValueChange={v => setDcs(v === "none" ? "" : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="DIPLOMA">DIPLOMA</SelectItem>
                <SelectItem value="CPC">CPC</SelectItem>
                <SelectItem value="SST">SST</SelectItem>
                <SelectItem value="DIPLOMA/CPC">DIPLOMA/CPC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </TabsContent>
      </Tabs>

      <DialogFooter className="mt-4">
        <Button variant="outline" onClick={onClose}>Otkazi</Button>
        <Button disabled={!name || !phone || saving} onClick={handleSave}>
          {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sačuvaj
        </Button>
      </DialogFooter>
    </>
  );
}

function DriversTable({ list, vehicles, vdLinks, onEdit, onChangeVehicle, onDelete, debtByDriver, depositByDriver }: {
  list: Driver[];
  vehicles: Vehicle[];
  vdLinks: { driver_id: string; vehicle_id: string; role: string }[];
  onEdit: (d: Driver) => void;
  onChangeVehicle: (d: Driver) => void;
  onDelete: (d: Driver) => void;
  debtByDriver: Record<string, number>;
  depositByDriver: (id: string) => number;
}) {
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vozač</TableHead>
              <TableHead>Uloga</TableHead>
              <TableHead>Komunalni</TableHead>
              <TableHead>Vozilo</TableHead>
              <TableHead>Naknade</TableHead>
              <TableHead>Dokumenti</TableHead>
              <TableHead>Dug</TableHead>
              <TableHead>Depozit</TableHead>
              <TableHead className="text-right">Akcije</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nema vozača</TableCell></TableRow>
            ) : list.map((d, i) => {
              // Vozila iz nove veze vozač–vozilo (fallback na legacy vehicle_id)
              let vehiclesForDriver = vdLinks.filter(l => l.driver_id === d.id)
                .map(l => vehicles.find(v => v.id === l.vehicle_id)).filter(Boolean) as Vehicle[];
              if (vehiclesForDriver.length === 0 && d.vehicle_id) {
                const v = vehicles.find(v => v.id === d.vehicle_id); if (v) vehiclesForDriver = [v];
              }
              const roleCfg  = ROLE_CFG[d.role];
              const RoleIcon = roleCfg.icon;
              return (
                <motion.tr key={d.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.015, 0.4) }}
                  className="border-b hover:bg-muted/30 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{d.full_name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone || "—"}{d.komunalni_broj ? ` · kom. ${d.komunalni_broj}` : ""}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-xs gap-1 ${roleCfg.color}`}>
                      <RoleIcon className="h-3 w-3" />{roleCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vehiclesForDriver.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {vehiclesForDriver.map(v => <Badge key={v.id} variant="secondary" className="font-mono text-xs">{v.taxi_license_number || "—"}</Badge>)}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </TableCell>
                  <TableCell>
                    {vehiclesForDriver.length > 0 ? (
                      <div className="space-y-0.5">
                        {vehiclesForDriver.map(v => (
                          <div key={v.id} className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{v.brand} {v.model}</span>
                          </div>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {d.role === "papiroloski" ? (
                      <span className="text-xs text-muted-foreground italic">—</span>
                    ) : d.driver_type === "renta" ? (
                      <div className="text-xs space-y-0.5">
                        <p>{fmt(d.daily_rate)}<span className="text-muted-foreground">/dan</span></p>
                        <p>{fmt(d.weekly_membership)}<span className="text-muted-foreground">/sed.</span></p>
                      </div>
                    ) : (
                      <div className="text-xs space-y-0.5">
                        {d.komunalni_monthly > 0 && <p>{fmt(d.komunalni_monthly)}<span className="text-muted-foreground">/mj.</span></p>}
                        <p>{fmt(d.weekly_membership_own)}<span className="text-muted-foreground">/sed.</span></p>
                        {d.doprinosi_monthly > 0 && <p>{fmt(d.doprinosi_monthly)}<span className="text-muted-foreground"> doprinosi</span></p>}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap max-w-[220px]">
                      <DocumentStatusBadge status={d.lk_status} label="LK" />
                      <DocumentStatusBadge status={d.vozacka_status} label="VZ" />
                      <DocumentStatusBadge status={d.lekarski_status} label="LEK" />
                      <DocumentStatusBadge status={d.ugovor_status} label="UG" />
                      <DocumentStatusBadge status={d.leg_vozaca_status} label="LV" />
                    </div>
                  </TableCell>
                  <TableCell>
                    {(debtByDriver[d.id] ?? 0) > 0 ? (
                      <span className="text-sm font-bold text-red-600">{fmt(debtByDriver[d.id])}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {depositByDriver(d.id) > 0 ? (
                      <span className="text-sm font-bold text-blue-600">{fmt(depositByDriver(d.id))}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Promeni vozilo" onClick={() => onChangeVehicle(d)}>
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" title="Uredi" onClick={() => onEdit(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" title="Obriši" onClick={() => onDelete(d)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ─── PROMENI VOZILO ───────────────────────────────────────────
function ChangeVehicleDialog({ driver, vehicles, history, onConfirm, onUpdateAssignment, onClose }: {
  driver: Driver;
  vehicles: Vehicle[];
  history: VehicleAssignment[];
  onConfirm: (vehicleId: string, dateFrom: string, fees: AssignmentFees, notes: string) => Promise<void>;
  onUpdateAssignment: (id: string, updates: Partial<VehicleAssignment>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
  onClose: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [vehicleId, setVehicleId] = useState<string>("");
  const [dateFrom, setDateFrom]   = useState(today);
  const [notes, setNotes]         = useState("");
  const [saving, setSaving]       = useState(false);
  const [editAsgId, setEditAsgId] = useState<string | null>(null);
  const [delAsgId, setDelAsgId]   = useState<string | null>(null);
  const [eFrom, setEFrom] = useState("");
  const [eTo, setETo]     = useState("");

  const vehLabel = (id: string | null) => {
    const v = vehicles.find(x => x.id === id);
    return v ? `${v.brand} ${v.model}${v.taxi_license_number ? ` (${v.taxi_license_number})` : ""}` : "—";
  };

  const chosenVeh = vehicles.find(v => v.id === vehicleId);

  const save = async () => {
    if (!vehicleId) { toast.error("Izaberi novo vozilo"); return; }
    if (!dateFrom)  { toast.error("Unesi datum prelaska"); return; }
    setSaving(true);
    try {
      // Renta se vuče sa izabranog vozila; ostale naknade ostaju vozačeve trenutne
      await onConfirm(vehicleId, dateFrom, {
        daily_rate: chosenVeh?.daily_rate ?? 0,
        weekly_membership: driver.weekly_membership ?? 0,
        weekly_membership_own: driver.weekly_membership_own ?? 0,
        pos_monthly_fee: driver.pos_monthly_fee ?? 0,
        komunalni_monthly: driver.komunalni_monthly ?? 0,
        doprinosi_monthly: driver.doprinosi_monthly ?? 0,
      }, notes);
      onClose();
    } catch (e) {
      toast.error("Greška: " + (e instanceof Error ? e.message : String(e)));
    } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Promeni vozilo — {driver.full_name}</DialogTitle>
          <DialogDescription>
            Trenutno: <strong>{vehLabel(driver.vehicle_id)}</strong>. Stari period ostaje po staroj ceni; od datuma prelaska važi nova.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Novo vozilo</Label>
              <Select value={vehicleId} onValueChange={setVehicleId}>
                <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                <SelectContent>
                  {vehicles.filter(v => v.id !== driver.vehicle_id).map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Datum prelaska</Label><Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></div>
          </div>
          <div className="rounded-lg border p-3 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Renta se vuče sa izabranog vozila: <strong className="text-foreground">{chosenVeh ? fmt(chosenVeh.daily_rate || 0) + "/dan" : "— izaberi vozilo"}</strong>.
              Stari period ostaje po staroj ceni (do datuma prelaska), od datuma prelaska važi ova.
            </p>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Napomena (opciono)</Label><Input value={notes} onChange={e => setNotes(e.target.value)} /></div>

          {history.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Istorija vozila (klik ✏️ za ispravku cene/datuma)</p>
              {history.map(a => {
                const vRate = vehicles.find(v => v.id === a.vehicle_id)?.daily_rate ?? a.daily_rate ?? 0;
                return (
                <div key={a.id} className="text-xs rounded border px-2 py-1 bg-background">
                  {editAsgId === a.id ? (
                    <div className="space-y-1.5 py-1">
                      <div className="font-medium">{vehLabel(a.vehicle_id)} · renta {fmt(vRate)}/dan <span className="text-muted-foreground">(sa vozila)</span></div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="grid gap-0.5"><Label className="text-[10px]">Od</Label><Input type="date" className="h-7" value={eFrom} onChange={e => setEFrom(e.target.value)} /></div>
                        <div className="grid gap-0.5"><Label className="text-[10px]">Do (prazno = sada)</Label><Input type="date" className="h-7" value={eTo} onChange={e => setETo(e.target.value)} /></div>
                      </div>
                      <div className="flex gap-1.5">
                        <Button size="sm" className="h-7 text-xs" disabled={saving} onClick={async () => {
                          setSaving(true);
                          try {
                            await onUpdateAssignment(a.id, { date_from: eFrom, date_to: eTo || null });
                            toast.success("Datumi ažurirani");
                            setEditAsgId(null);
                          } catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
                          finally { setSaving(false); }
                        }}>{saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Sačuvaj</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditAsgId(null)}>Otkazi</Button>
                      </div>
                    </div>
                  ) : delAsgId === a.id ? (
                    <div className="flex items-center justify-between py-0.5">
                      <span className="text-destructive">Obrisati ovaj period?</span>
                      <div className="flex items-center gap-1.5">
                        <Button size="sm" variant="destructive" className="h-7 text-xs" disabled={saving} onClick={async () => {
                          setSaving(true);
                          try { await onDeleteAssignment(a.id); toast.success("Period obrisan"); setDelAsgId(null); }
                          catch (e) { toast.error("Greška: " + (e instanceof Error ? e.message : String(e))); }
                          finally { setSaving(false); }
                        }}>{saving && <Loader2 className="h-3 w-3 animate-spin mr-1" />}Obriši</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDelAsgId(null)}>Otkazi</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span>{vehLabel(a.vehicle_id)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{a.date_from}{a.date_to ? ` → ${a.date_to}` : " → sada"} · renta {fmt(vRate)}</span>
                        <button type="button" className="text-muted-foreground hover:text-primary" title="Ispravi datume" onClick={() => { setEditAsgId(a.id); setEFrom(a.date_from); setETo(a.date_to || ""); }}><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" className="text-muted-foreground hover:text-destructive" title="Obriši period" onClick={() => setDelAsgId(a.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Otkazi</Button>
          <Button disabled={!vehicleId || saving} onClick={save}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Prebaci</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DriversPage = () => {
  const { drivers, loading, addDriver, updateDriver, deleteDriver } = useDrivers();
  const { vehicles } = useVehicles();
  const { assignVehicle, getByDriver, updateAssignment, deleteAssignment } = useAssignments();
  const { links: vdLinks } = useVehicleDrivers();
  const { debts } = useDebts();
  const { balanceFor } = useDeposits();
  const [search, setSearch]         = useState("");
  const [addOpen, setAddOpen]       = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [changeVehicleDriver, setChangeVehicleDriver] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDriver(deleteTarget.id);
      toast.success("Vozač obrisan");
      setDeleteTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/23503|foreign key|violates/i.test(msg)) {
        toast.error("Vozač ima vezane zapise (obračuni/dugovanja) — ne može da se obriše. Spoji ga sa pravim vozačem umesto brisanja.");
      } else {
        toast.error("Greška: " + msg);
      }
    } finally { setDeleting(false); }
  };

  const debtByDriver: Record<string, number> = {};
  debts.forEach(d => {
    if (d.status === "closed") return;
    const remaining = d.amount - d.paid_amount;
    debtByDriver[d.driver_id] = (debtByDriver[d.driver_id] ?? 0) + remaining;
  });

  const filtered = drivers.filter(d => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const veh = vehicles.find(v => v.id === d.vehicle_id);
    const haystack = [
      d.full_name, d.phone, d.komunalni_broj, d.license_number,
      d.role === "operativni" ? "operativni" : "papiroloski",
      d.driver_type === "renta" ? "renta" : "vlastito vozilo svoje",
      d.status === "active" ? "aktivan" : "neaktivan",
      veh?.brand, veh?.model, veh?.license_plate, veh?.taxi_license_number,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(q);
  });

  const operativni = filtered.filter(d => d.role === "operativni");
  const papiroloski = filtered.filter(d => d.role === "papiroloski");

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozači</h1>
          <p className="text-muted-foreground text-sm">
            <span className="text-green-700 font-medium">{operativni.length}</span> operativnih
            {" · "}
            <span className="text-orange-700 font-medium">{papiroloski.length}</span> papiroloških
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8 w-56" placeholder="Ime, tel, vozilo, komunalni..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novi vozač</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DriverForm
                vehicles={vehicles} title="Dodaj novog vozača"
                onSave={async (data) => { await addDriver(data); toast.success("Vozač dodan"); }}
                onClose={() => setAddOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Dialog open={!!editDriver} onOpenChange={v => { if (!v) setEditDriver(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

      {changeVehicleDriver && (
        <ChangeVehicleDialog
          driver={changeVehicleDriver}
          vehicles={vehicles}
          history={getByDriver(changeVehicleDriver.id)}
          onUpdateAssignment={updateAssignment}
          onDeleteAssignment={deleteAssignment}
          onConfirm={async (vehicleId, dateFrom, fees, notes) => {
            const prevFees = {
              daily_rate: changeVehicleDriver.daily_rate, weekly_membership: changeVehicleDriver.weekly_membership,
              weekly_membership_own: changeVehicleDriver.weekly_membership_own, pos_monthly_fee: changeVehicleDriver.pos_monthly_fee,
              komunalni_monthly: changeVehicleDriver.komunalni_monthly, doprinosi_monthly: changeVehicleDriver.doprinosi_monthly,
            };
            await assignVehicle(changeVehicleDriver.id, vehicleId, dateFrom, fees, notes, prevFees);
            await updateDriver(changeVehicleDriver.id, {
              vehicle_id: vehicleId,
              daily_rate: fees.daily_rate, weekly_membership: fees.weekly_membership,
              weekly_membership_own: fees.weekly_membership_own, pos_monthly_fee: fees.pos_monthly_fee,
              komunalni_monthly: fees.komunalni_monthly, doprinosi_monthly: fees.doprinosi_monthly,
            });
            toast.success("Vozilo promenjeno — stari period ostaje po staroj ceni");
          }}
          onClose={() => setChangeVehicleDriver(null)}
        />
      )}

      <Dialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Obriši vozača</DialogTitle>
            <DialogDescription>
              Obrisati <strong>{deleteTarget?.full_name?.trim() || "(bez naziva)"}</strong>
              {deleteTarget?.komunalni_broj ? ` — kom. ${deleteTarget.komunalni_broj}` : ""}?
            </DialogDescription>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            Ako vozač ima vezane obračune/dugovanja, brisanje neće proći — tada ga spoji umesto brisanja.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Otkazi</Button>
            <Button variant="destructive" disabled={deleting} onClick={confirmDelete}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Obriši
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="operativni">
          <TabsList>
            <TabsTrigger value="operativni" className="gap-2">
              <User className="h-3.5 w-3.5" />
              Operativni <Badge variant="secondary" className="ml-1 text-xs">{operativni.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="papiroloski" className="gap-2">
              <FileText className="h-3.5 w-3.5" />
              Papirološki <Badge variant="secondary" className="ml-1 text-xs">{papiroloski.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-3.5 w-3.5" />
              Svi <Badge variant="secondary" className="ml-1 text-xs">{filtered.length}</Badge>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="operativni" className="mt-4">
            <DriversTable list={operativni} vehicles={vehicles} vdLinks={vdLinks} onEdit={setEditDriver} onChangeVehicle={setChangeVehicleDriver} onDelete={setDeleteTarget} debtByDriver={debtByDriver} depositByDriver={balanceFor} />
          </TabsContent>
          <TabsContent value="papiroloski" className="mt-4">
            <DriversTable list={papiroloski} vehicles={vehicles} vdLinks={vdLinks} onEdit={setEditDriver} onChangeVehicle={setChangeVehicleDriver} onDelete={setDeleteTarget} debtByDriver={debtByDriver} depositByDriver={balanceFor} />
          </TabsContent>
          <TabsContent value="all" className="mt-4">
            <DriversTable list={filtered} vehicles={vehicles} vdLinks={vdLinks} onEdit={setEditDriver} onChangeVehicle={setChangeVehicleDriver} onDelete={setDeleteTarget} debtByDriver={debtByDriver} depositByDriver={balanceFor} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default DriversPage;
