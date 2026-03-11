import { useState } from "react";
import { Link } from "react-router-dom";
import { drivers, getActiveAssignmentForDriver, getVehicleById } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const DriversPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = drivers.filter((d) => {
    const matchesSearch = d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) || d.license_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozači</h1>
          <p className="text-muted-foreground">Upravljanje vozačima</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Dodaj vozača</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj novog vozača</DialogTitle>
              <DialogDescription>Popunite podatke o vozaču.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Ime i prezime</Label>
                <Input placeholder="Marko Marković" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input placeholder="+381 64 123-4567" />
                </div>
                <div className="grid gap-2">
                  <Label>Broj dozvole</Label>
                  <Input placeholder="DL-2024-XXX" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Adresa</Label>
                <Input placeholder="Kneza Miloša 10" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkaži</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success("Vozač uspešno dodat"); }}>Sačuvaj vozača</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pretraži vozače..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi statusi</SelectItem>
                <SelectItem value="active">Aktivan</SelectItem>
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
                  <TableHead>Ime</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Dozvola</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Zaduženje</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((driver) => {
                  const assignment = getActiveAssignmentForDriver(driver.id);
                  const vehicle = assignment ? getVehicleById(assignment.vehicle_id) : null;
                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.full_name}</TableCell>
                      <TableCell>{driver.phone}</TableCell>
                      <TableCell className="font-mono text-xs">{driver.license_number}</TableCell>
                      <TableCell>{vehicle ? `${vehicle.brand} ${vehicle.model}` : <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>{assignment ? `$${assignment.rent_amount}/${assignment.rent_type === "monthly" ? "mo" : assignment.rent_type === "weekly" ? "wk" : "day"}` : "—"}</TableCell>
                      <TableCell><StatusBadge status={driver.status} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild><Link to={`/drivers/${driver.id}`}><Eye className="h-4 w-4" /></Link></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nema pronađenih vozača</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriversPage;
