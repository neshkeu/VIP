import { useState } from "react";
import { Link } from "react-router-dom";
import { drivers, vehicles, getRentChargesByDriver, getPaidAmount, getRemainingAmount, getYandexTotalByDriver, getVoucherTotalByDriver } from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Eye, TrendingDown, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const VOUCHER_VALUE = 400;

const DriversPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Forma za novog vozaca
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVehicleId, setNewVehicleId] = useState("");
  const [newDailyRate, setNewDailyRate] = useState("");
  const [newTaxiLicense, setNewTaxiLicense] = useState("");

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search) ||
      d.license_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Racuna ukupan otvoreni dug vozaca
  const getDriverDebt = (driverId: string) => {
    const charges = getRentChargesByDriver(driverId);
    const totalDebt = charges.reduce((sum, c) => sum + getRemainingAmount(c.id, c.total_amount), 0);
    const yandex = getYandexTotalByDriver(driverId);
    const vouchers = getVoucherTotalByDriver(driverId);
    const net = totalDebt - yandex - vouchers;
    return Math.max(0, net);
  };

  const resetForm = () => {
    setNewName(""); setNewPhone(""); setNewVehicleId("");
    setNewDailyRate(""); setNewTaxiLicense("");
  };

  // Automatski popuni licencu kad se izabere vozilo
  const handleVehicleSelect = (vid: string) => {
    setNewVehicleId(vid);
    const v = vehicles.find(x => x.id === vid);
    if (v) setNewTaxiLicense(v.taxi_license_number);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozaci</h1>
          <p className="text-muted-foreground">Upravljanje vozacima i njihovim dugovima</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Dodaj vozaca</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dodaj novog vozaca</DialogTitle>
              <DialogDescription>Unesite osnovne podatke i iznos dnevne rente.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Ime i prezime</Label>
                <Input
                  placeholder="Nemanja Nikolic"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Kontakt telefon</Label>
                <Input
                  placeholder="+381 64 123-4567"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Vozilo (komunalni broj)</Label>
                <Select value={newVehicleId} onValueChange={handleVehicleSelect}>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status === "active").map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.brand} {v.model} — {v.taxi_license_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newVehicleId && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Komunalni broj:</span>
                    <Badge variant="secondary" className="font-mono">{newTaxiLicense}</Badge>
                  </div>
                </motion.div>
              )}
              <div className="grid gap-2">
                <Label>Dnevna cijena rente (RSD)</Label>
                <Input
                  type="number"
                  placeholder="3500"
                  value={newDailyRate}
                  onChange={e => setNewDailyRate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Ova cijena ce se automatski povlaciti kada se kreira zaduzenje za ovog vozaca.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
              <Button
                disabled={!newName || !newPhone || !newDailyRate}
                onClick={() => {
                  setDialogOpen(false);
                  toast.success(`Vozac ${newName} uspjesno dodat`);
                  resetForm();
                }}
              >
                Sacuvaj vozaca
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Pretrazi vozace..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
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
                  <TableHead>Ime i prezime</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead>Komunalni br.</TableHead>
                  <TableHead>Dnevna cijena</TableHead>
                  <TableHead>Yandex</TableHead>
                  <TableHead>Vauceri</TableHead>
                  <TableHead>Dug</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((driver) => {
                  const vehicle = vehicles.find(v => v.id === driver.vehicle_id);
                  const debt = getDriverDebt(driver.id);
                  const yandex = getYandexTotalByDriver(driver.id);
                  const vouchers = getVoucherTotalByDriver(driver.id);
                  const hasDebt = debt > 0;

                  return (
                    <TableRow key={driver.id}>
                      <TableCell className="font-medium">{driver.full_name}</TableCell>
                      <TableCell className="text-sm">{driver.phone}</TableCell>
                      <TableCell>
                        {vehicle
                          ? <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {driver.daily_rate.toLocaleString()} RSD/dan
                      </TableCell>
                      <TableCell>
                        {yandex > 0
                          ? <span className="text-green-600 text-sm font-medium flex items-center gap-1"><TrendingDown className="h-3 w-3" />{yandex.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {vouchers > 0
                          ? <span className="text-blue-600 text-sm font-medium flex items-center gap-1"><TrendingDown className="h-3 w-3" />{vouchers.toLocaleString()}</span>
                          : <span className="text-muted-foreground text-sm">—</span>
                        }
                      </TableCell>
                      <TableCell>
                        {hasDebt
                          ? <Badge variant="destructive" className="font-mono text-xs"><TrendingUp className="mr-1 h-3 w-3" />{debt.toLocaleString()} RSD</Badge>
                          : <Badge variant="outline" className="text-green-600 border-green-300 text-xs">Izmireno</Badge>
                        }
                      </TableCell>
                      <TableCell><StatusBadge status={driver.status} /></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/drivers/${driver.id}`}><Eye className="h-4 w-4" /></Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nema pronadjenih vozaca
                    </TableCell>
                  </TableRow>
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
