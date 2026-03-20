import { useState } from "react";
import { useVehicles } from "@/hooks/useVehicles";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, AlertTriangle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

function isExpiringSoon(date: string) {
  const d = new Date(date);
  const diffDays = (d.getTime() - Date.now()) / (1000*60*60*24);
  return diffDays < 30 && diffDays > 0;
}
function isExpired(date: string) { return new Date(date) < new Date(); }

const VehiclesPage = () => {
  const { vehicles, loading, addVehicle } = useVehicles();
  const [search, setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  const [brand, setBrand]                 = useState("");
  const [model, setModel]                 = useState("");
  const [year, setYear]                   = useState("");
  const [plate, setPlate]                 = useState("");
  const [taxiNum, setTaxiNum]             = useState("");
  const [posId, setPosId]                 = useState("");
  const [regExpiry, setRegExpiry]         = useState("");
  const [insExpiry, setInsExpiry]         = useState("");

  const filtered = vehicles.filter(v => {
    const matchSearch = v.brand.toLowerCase().includes(search.toLowerCase()) ||
      v.model.toLowerCase().includes(search.toLowerCase()) ||
      v.taxi_license_number?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const reset = () => {
    setBrand(""); setModel(""); setYear(""); setPlate("");
    setTaxiNum(""); setPosId(""); setRegExpiry(""); setInsExpiry("");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await addVehicle({
        brand, model, year: Number(year), license_plate: plate,
        taxi_license_number: taxiNum, pos_terminal_id: posId,
        registration_expiry: regExpiry, insurance_expiry: insExpiry,
        status: "active", notes: "",
      });
      toast.success(`Vozilo ${brand} ${model} dodano`);
      setDialogOpen(false); reset();
    } catch (e: any) {
      toast.error("Greška: " + e.message);
    } finally {
      setSaving(false);
    }
  };

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
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input className="pl-8 w-48" placeholder="Pretraži..." value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="active">Aktivna</SelectItem>
              <SelectItem value="maintenance">Servis</SelectItem>
              <SelectItem value="inactive">Neaktivna</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={v => { setDialogOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4"/>Novo vozilo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Dodaj novo vozilo</DialogTitle>
                <DialogDescription>Unesite podatke o vozilu</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Marka</Label><Input placeholder="Toyota" value={brand} onChange={e => setBrand(e.target.value)}/></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Model</Label><Input placeholder="Camry" value={model} onChange={e => setModel(e.target.value)}/></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Godina</Label><Input type="number" placeholder="2024" value={year} onChange={e => setYear(e.target.value)}/></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Tablice</Label><Input placeholder="NS-001-AB" value={plate} onChange={e => setPlate(e.target.value)}/></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Komunalni broj</Label><Input placeholder="TAXI-0101" value={taxiNum} onChange={e => setTaxiNum(e.target.value)}/></div>
                </div>
                <div className="grid gap-1.5"><Label className="text-xs">POS terminal ID</Label><Input placeholder="POS-A01" value={posId} onChange={e => setPosId(e.target.value)}/></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5"><Label className="text-xs">Registracija istječe</Label><Input type="date" value={regExpiry} onChange={e => setRegExpiry(e.target.value)}/></div>
                  <div className="grid gap-1.5"><Label className="text-xs">Osiguranje istječe</Label><Input type="date" value={insExpiry} onChange={e => setInsExpiry(e.target.value)}/></div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
                <Button disabled={!brand || !model || saving} onClick={handleSave}>
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
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Komunalni</TableHead>
                  <TableHead>POS terminal</TableHead>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Osiguranje</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nema vozila</TableCell></TableRow>
                ) : (
                  filtered.map((v, i) => (
                    <motion.tr key={v.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                      className="border-b hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{v.brand} {v.model} <span className="text-muted-foreground text-xs">({v.year})</span></TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-xs">{v.taxi_license_number}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className="font-mono text-xs">{v.pos_terminal_id}</Badge></TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          {(isExpired(v.registration_expiry) || isExpiringSoon(v.registration_expiry)) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>}
                          <span className={isExpired(v.registration_expiry) ? "text-red-500" : isExpiringSoon(v.registration_expiry) ? "text-amber-600" : ""}>{v.registration_expiry}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          {(isExpired(v.insurance_expiry) || isExpiringSoon(v.insurance_expiry)) && <AlertTriangle className="h-3.5 w-3.5 text-amber-500"/>}
                          <span className={isExpired(v.insurance_expiry) ? "text-red-500" : isExpiringSoon(v.insurance_expiry) ? "text-amber-600" : ""}>{v.insurance_expiry}</span>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={statusColors[v.status]}>{statusLabels[v.status]}</Badge></TableCell>
                    </motion.tr>
                  ))
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
