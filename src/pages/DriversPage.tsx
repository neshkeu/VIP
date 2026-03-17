import { useState } from "react";
import { drivers, vehicles, getDriverMonthSummary } from "@/data/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, User, Car, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const today = new Date();
const YEAR  = today.getFullYear();
const MONTH = today.getMonth() + 1;

const DriversPage = () => {
  const [search, setSearch]     = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Forma
  const [newName, setNewName]       = useState("");
  const [newPhone, setNewPhone]     = useState("");
  const [newVehicleId, setNewVehicleId] = useState("none");
  const [newDailyRate, setNewDailyRate] = useState("");
  const [newPosFee, setNewPosFee]   = useState("");

  const filtered = drivers.filter(d =>
    d.full_name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search)
  );

  const reset = () => {
    setNewName(""); setNewPhone(""); setNewVehicleId("none");
    setNewDailyRate(""); setNewPosFee("");
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozači</h1>
          <p className="text-muted-foreground text-sm">{drivers.filter(d => d.status === "active").length} aktivnih vozača</p>
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
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dodaj novog vozača</DialogTitle>
                <DialogDescription>Unesite podatke o vozaču</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-3">
                <div className="grid gap-2">
                  <Label>Ime i prezime</Label>
                  <Input placeholder="Marko Petrović" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Telefon</Label>
                  <Input placeholder="064-111-2233" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-2">
                    <Label>Dnevna renta (RSD)</Label>
                    <Input type="number" placeholder="3500" value={newDailyRate} onChange={e => setNewDailyRate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>POS naknada/mj. (RSD)</Label>
                    <Input type="number" placeholder="800" value={newPosFee} onChange={e => setNewPosFee(e.target.value)} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
                <Button disabled={!newName || !newPhone} onClick={() => {
                  setDialogOpen(false);
                  toast.success(`Vozač ${newName} dodan`);
                  reset();
                }}>Sačuvaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* TABELA */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozač</TableHead>
                <TableHead>Telefon</TableHead>
                <TableHead>Vozilo</TableHead>
                <TableHead>Dnevna renta</TableHead>
                <TableHead>POS naknada</TableHead>
                <TableHead>Plaćeno ovaj mj.</TableHead>
                <TableHead>Duguje</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d, i) => {
                const vehicle  = vehicles.find(v => v.id === d.vehicle_id);
                const summary  = getDriverMonthSummary(d.id, YEAR, MONTH);
                return (
                  <motion.tr key={d.id} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ delay: i*0.04 }}
                    className="border-b hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{d.full_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.phone}</TableCell>
                    <TableCell>
                      {vehicle
                        ? <div className="flex items-center gap-1.5">
                            <Car className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm">{vehicle.brand} {vehicle.model}</span>
                            <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                          </div>
                        : <span className="text-muted-foreground text-sm">—</span>
                      }
                    </TableCell>
                    <TableCell className="font-semibold">{fmt(d.daily_rate)}</TableCell>
                    <TableCell className="text-sm">{fmt(d.pos_monthly_fee)}</TableCell>
                    <TableCell>
                      <span className="text-green-600 font-semibold flex items-center gap-1">
                        <TrendingUp className="h-3.5 w-3.5" />{fmt(summary.paid)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {summary.pending > 0
                        ? <span className="text-destructive font-semibold flex items-center gap-1">
                            <TrendingDown className="h-3.5 w-3.5" />{fmt(summary.pending)}
                          </span>
                        : <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Izmireno</Badge>
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.status === "active" ? "default" : "secondary"}>
                        {d.status === "active" ? "Aktivan" : "Neaktivan"}
                      </Badge>
                    </TableCell>
                  </motion.tr>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriversPage;
