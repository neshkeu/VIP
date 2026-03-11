import { useState } from "react";
import { Link } from "react-router-dom";
import { vehicles } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Eye, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

function isExpiringSoon(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays < 30 && diffDays > 0;
}

function isExpired(date: string) {
  return new Date(date) < new Date();
}

const VehiclesPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = vehicles.filter((v) => {
    const matchesSearch = `${v.brand} ${v.model}`.toLowerCase().includes(search.toLowerCase()) ||
      v.license_plate.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozila</h1>
          <p className="text-muted-foreground">Upravljanje vozilima</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Dodaj vozilo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj novo vozilo</DialogTitle>
              <DialogDescription>Popunite podatke o vozilu.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Marka</Label><Input placeholder="Toyota" /></div>
                <div className="grid gap-2"><Label>Model</Label><Input placeholder="Camry" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Godina</Label><Input type="number" placeholder="2024" /></div>
                <div className="grid gap-2"><Label>Registracija</Label><Input placeholder="BG-1001" /></div>
              </div>
              <div className="grid gap-2"><Label>VIN</Label><Input placeholder="VIN broj" /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkaži</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success("Vozilo uspešno dodato"); }}>Sačuvaj vozilo</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pretraži vozila..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="active">Aktivan</SelectItem>
                <SelectItem value="maintenance">Servis</SelectItem>
                <SelectItem value="inactive">Neaktivan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Godina</TableHead>
                  <TableHead>Tablice</TableHead>
                  <TableHead>Taxi licenca</TableHead>
                  <TableHead>POS terminal</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registracija</TableHead>
                  <TableHead>Osiguranje</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-medium">{v.brand} {v.model}</TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell className="font-mono text-xs">{v.license_plate}</TableCell>
                    <TableCell><Badge variant="secondary" className="font-mono text-xs">{v.taxi_license_number}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-xs">{v.pos_terminal_id}</Badge></TableCell>
                    <TableCell><StatusBadge status={v.status} /></TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {v.registration_expiry}
                        {(isExpired(v.registration_expiry) || isExpiringSoon(v.registration_expiry)) && (
                          <AlertTriangle className={`h-3.5 w-3.5 ${isExpired(v.registration_expiry) ? "text-destructive" : "text-warning"}`} />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        {v.insurance_expiry}
                        {(isExpired(v.insurance_expiry) || isExpiringSoon(v.insurance_expiry)) && (
                          <AlertTriangle className={`h-3.5 w-3.5 ${isExpired(v.insurance_expiry) ? "text-destructive" : "text-warning"}`} />
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" asChild><Link to={`/vehicles/${v.id}`}><Eye className="h-4 w-4" /></Link></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nema pronađenih vozila</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehiclesPage;
