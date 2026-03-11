import { useState } from "react";
import { Link } from "react-router-dom";
import {
  drivers, vehicles,
  getRentChargesByDriver, getPaidAmount, getRemainingAmount,
  getYandexTotalByDriver, getVoucherTotalByDriver, getPosDeductedFromDebt,
  getPosAccumulatedByVehicle, posPayoutRequests,
  getDriverById, getVehicleById,
} from "@/data/mockData";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Eye, TrendingUp, TrendingDown, CreditCard, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

const DriversPage = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [posDialogOpen, setPosDialogOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  // Forma za novog vozaca
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newVehicleId, setNewVehicleId] = useState("");
  const [newDailyRate, setNewDailyRate] = useState("");
  const [newTaxiLicense, setNewTaxiLicense] = useState("");

  // Forma za POS isplatu
  const [posAmount, setPosAmount] = useState("");
  const [posAction, setPosAction] = useState<"pay_cash" | "deduct_debt">("pay_cash");
  const [posNote, setPosNote] = useState("");

  const resetForm = () => {
    setNewName(""); setNewPhone(""); setNewVehicleId("");
    setNewDailyRate(""); setNewTaxiLicense("");
  };

  const handleVehicleSelect = (vid: string) => {
    setNewVehicleId(vid);
    const v = vehicles.find(x => x.id === vid);
    if (v) setNewTaxiLicense(v.taxi_license_number);
  };

  // Racuna neto dug vozaca (renta - gotovinske uplate - yandex odbitci - pos odbitci - vauceri)
  const getDriverBalance = (driverId: string) => {
    const charges = getRentChargesByDriver(driverId);
    const rentDebt = charges.reduce((sum, c) => sum + getRemainingAmount(c.id, c.total_amount), 0);
    const yandex = getYandexTotalByDriver(driverId);
    const vouchers = getVoucherTotalByDriver(driverId);
    const posDeducted = getPosDeductedFromDebt(driverId);
    return rentDebt - yandex - vouchers - posDeducted;
  };

  const filtered = drivers.filter((d) => {
    const matchesSearch =
      d.full_name.toLowerCase().includes(search.toLowerCase()) ||
      d.phone.includes(search);
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingPosRequests = posPayoutRequests.filter(p => p.status === "pending");

  const openPosDialog = (driverId: string) => {
    setSelectedDriverId(driverId);
    const driver = drivers.find(d => d.id === driverId);
    const vehicle = driver ? vehicles.find(v => v.id === driver.vehicle_id) : null;
    const accumulated = vehicle ? getPosAccumulatedByVehicle(vehicle.id) : 0;
    setPosAmount(String(accumulated > 0 ? accumulated : ""));
    setPosNote("");
    setPosDialogOpen(true);
  };

  const selectedDriver = selectedDriverId ? drivers.find(d => d.id === selectedDriverId) : null;
  const selectedVehicle = selectedDriver ? vehicles.find(v => v.id === selectedDriver.vehicle_id) : null;
  const posAccumulated = selectedVehicle ? getPosAccumulatedByVehicle(selectedVehicle.id) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Vozaci</h1>
          <p className="text-muted-foreground">Upravljanje vozacima, dugovima i POS isplatama</p>
        </div>
        <div className="flex gap-2">
          {pendingPosRequests.length > 0 && (
            <Button variant="outline" className="relative">
              <CreditCard className="mr-2 h-4 w-4" />
              POS zahtjevi
              <Badge variant="destructive" className="ml-2 text-xs">{pendingPosRequests.length}</Badge>
            </Button>
          )}
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
                  <Input placeholder="Nemanja Nikolic" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Kontakt telefon</Label>
                  <Input placeholder="+381 64 123-4567" value={newPhone} onChange={e => setNewPhone(e.target.value)} />
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
                    type="number" placeholder="3500"
                    value={newDailyRate} onChange={e => setNewDailyRate(e.target.value)}
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
                  onClick={() => { setDialogOpen(false); toast.success(`Vozac ${newName} uspjesno dodat`); resetForm(); }}
                >
                  Sacuvaj vozaca
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Svi vozaci</TabsTrigger>
          <TabsTrigger value="pos">
            POS zahtjevi
            {pendingPosRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">{pendingPosRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* LISTA VOZACA */}
        <TabsContent value="list" className="mt-4">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Pretrazi vozace..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
                      <TableHead>POS kredit</TableHead>
                      <TableHead>Stanje</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((driver) => {
                      const vehicle = vehicles.find(v => v.id === driver.vehicle_id);
                      const balance = getDriverBalance(driver.id);
                      const posCredit = vehicle ? getPosAccumulatedByVehicle(vehicle.id) : 0;
                      const inDebt = balance > 0;
                      const inCredit = balance < 0;

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
                          <TableCell className="text-sm font-medium">
                            {driver.daily_rate.toLocaleString()} RSD/dan
                          </TableCell>
                          <TableCell>
                            {posCredit > 0 ? (
                              <button
                                onClick={() => openPosDialog(driver.id)}
                                className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline"
                              >
                                <CreditCard className="h-3 w-3" />
                                {posCredit.toLocaleString()} RSD
                              </button>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {inDebt && (
                              <Badge variant="destructive" className="font-mono text-xs">
                                <TrendingUp className="mr-1 h-3 w-3" />duguje {balance.toLocaleString()} RSD
                              </Badge>
                            )}
                            {inCredit && (
                              <Badge variant="outline" className="font-mono text-xs text-green-600 border-green-300 bg-green-50">
                                <TrendingDown className="mr-1 h-3 w-3" />firma duguje {Math.abs(balance).toLocaleString()} RSD
                              </Badge>
                            )}
                            {balance === 0 && (
                              <Badge variant="outline" className="text-xs text-muted-foreground">Izmireno</Badge>
                            )}
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
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Nema pronadjenih vozaca
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </motion.div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* POS ZAHTJEVI */}
        <TabsContent value="pos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">POS zahtjevi za isplatu</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Iznos</TableHead>
                    <TableHead>Nacin</TableHead>
                    <TableHead>Datum zahtjeva</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posPayoutRequests.map((req) => {
                    const driver = getDriverById(req.driver_id);
                    const vehicle = getVehicleById(req.vehicle_id);
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>
                          {vehicle ? <Badge variant="outline" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge> : "—"}
                        </TableCell>
                        <TableCell className="font-semibold">{req.amount.toLocaleString()} RSD</TableCell>
                        <TableCell>
                          <Badge variant={req.action === "pay_cash" ? "secondary" : "outline"} className="text-xs">
                            {req.action === "pay_cash" ? "Isplata gotovinom" : "Oduzmi od duga"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{req.request_date}</TableCell>
                        <TableCell>
                          {req.status === "pending" ? (
                            <Badge variant="destructive" className="text-xs">
                              <AlertCircle className="mr-1 h-3 w-3" />Na cekanju
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">Rijeseno</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {req.status === "pending" && (
                            <Button size="sm" onClick={() => toast.success("Zahtjev oznacen kao rijesen")}>
                              Rijesi
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {posPayoutRequests.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nema zahtjeva</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* POS ISPLATA DIALOG */}
      <Dialog open={posDialogOpen} onOpenChange={setPosDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>POS isplata — {selectedDriver?.full_name}</DialogTitle>
            <DialogDescription>
              {selectedVehicle && (
                <>Vozilo: {selectedVehicle.brand} {selectedVehicle.model} — <Badge variant="outline" className="font-mono text-xs">{selectedVehicle.taxi_license_number}</Badge></>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="rounded-md border bg-muted/40 p-3 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Akumulirani POS kredit:</span>
              <span className="font-bold text-blue-600">{posAccumulated.toLocaleString()} RSD</span>
            </div>
            <div className="grid gap-2">
              <Label>Iznos isplate (RSD)</Label>
              <Input
                type="number"
                placeholder={String(posAccumulated)}
                value={posAmount}
                onChange={e => setPosAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>Nacin obracuna</Label>
              <Select value={posAction} onValueChange={(v) => setPosAction(v as "pay_cash" | "deduct_debt")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pay_cash">Isplati vozacu gotovinom</SelectItem>
                  <SelectItem value="deduct_debt">Oduzmi od duga vozaca</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {posAction === "pay_cash"
                  ? "Firma isplacuje vozacu gotovinom — smanjuje se njegov POS kredit."
                  : "Iznos se oduzima od duga vozaca prema firmi — umanjuje rentu."}
              </p>
            </div>
            <div className="grid gap-2">
              <Label>Napomena (opciono)</Label>
              <Input placeholder="Napomena..." value={posNote} onChange={e => setPosNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosDialogOpen(false)}>Otkazi</Button>
            <Button
              disabled={!posAmount || Number(posAmount) <= 0}
              onClick={() => {
                setPosDialogOpen(false);
                const msg = posAction === "pay_cash"
                  ? `Isplaceno ${Number(posAmount).toLocaleString()} RSD vozacu`
                  : `Oduzeto ${Number(posAmount).toLocaleString()} RSD od duga`;
                toast.success(msg);
              }}
            >
              Potvrdi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriversPage;
