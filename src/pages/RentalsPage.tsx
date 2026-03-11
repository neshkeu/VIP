import { useState } from "react";
import { getActiveAssignments, assignments, getDriverById, getVehicleById, drivers, vehicles, offDays, calculateRent } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Calculator, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const RentalsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [offDayDialogOpen, setOffDayDialogOpen] = useState(false);
  const [calcDialogOpen, setCalcDialogOpen] = useState(false);

  const [calcDailyRate, setCalcDailyRate] = useState("");
  const [calcTotalDays, setCalcTotalDays] = useState("");
  const [calcOffDays, setCalcOffDays] = useState("0");

  const active = getActiveAssignments();

  const calcResult = calcDailyRate && calcTotalDays
    ? calculateRent(Number(calcDailyRate), Number(calcTotalDays), Number(calcOffDays))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Zaduženja</h1>
          <p className="text-muted-foreground">Aktivna zaduženja vozila i vozača</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={calcDialogOpen} onOpenChange={setCalcDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Calculator className="mr-2 h-4 w-4" />Kalkulator rente</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kalkulator rente</DialogTitle>
                <DialogDescription>Unesite dnevnu cijenu i broj dana za obračun.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Dnevna cijena (EUR)</Label>
                    <Input type="number" placeholder="50" value={calcDailyRate} onChange={(e) => setCalcDailyRate(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ukupno dana</Label>
                    <Input type="number" placeholder="30" value={calcTotalDays} onChange={(e) => setCalcTotalDays(e.target.value)} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Slobodni dani (pola cijene)</Label>
                  <Input type="number" placeholder="0" value={calcOffDays} onChange={(e) => setCalcOffDays(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Ako vozac ne radi, placa 50% dnevne cijene za taj dan.</p>
                </div>
                {calcResult && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border bg-muted/40 p-4 space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">Obracun</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Radni dani</p>
                        <p className="text-xl font-bold">{calcResult.workDays}</p>
                        <p className="text-xs text-muted-foreground">x EUR{calcDailyRate}</p>
                      </div>
                      <div className="rounded-md bg-background border p-3">
                        <p className="text-xs text-muted-foreground">Slobodni dani</p>
                        <p className="text-xl font-bold">{calcResult.offDays}</p>
                        <p className="text-xs text-muted-foreground">x EUR{(Number(calcDailyRate) * 0.5).toFixed(2)}</p>
                      </div>
                      <div className="rounded-md bg-primary/10 border border-primary/20 p-3">
                        <p className="text-xs text-muted-foreground">Ukupno</p>
                        <p className="text-xl font-bold text-primary">EUR{calcResult.total.toFixed(2)}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCalcDialogOpen(false)}>Zatvori</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={offDayDialogOpen} onOpenChange={setOffDayDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><CalendarOff className="mr-2 h-4 w-4" />Slobodan dan</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Oznaci slobodan dan</DialogTitle>
                <DialogDescription>Vozac ne radi — placa 50% dnevne rente za taj dan.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Vozilo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.filter(v => v.status === "active").map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Datum</Label>
                  <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div className="grid gap-2">
                  <Label>Napomena (opciono)</Label>
                  <Input placeholder="Bolovanje, odmor..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOffDayDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => { setOffDayDialogOpen(false); toast.success("Slobodan dan zabiljezan"); }}>Sacuvaj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" />Novo zaduzenje</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Kreiraj zaduzenje</DialogTitle>
                <DialogDescription>Dodijeli vozilo vozacu sa individualnom cijenom rente.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vozac</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozaca" /></SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Vozilo</Label>
                  <Select>
                    <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.filter(v => v.status === "active").map((v) => (
                        <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} — {v.taxi_license_number} ({v.license_plate})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Dnevna cijena (EUR)</Label>
                    <Input type="number" placeholder="50" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Vrsta zaduzenja</Label>
                    <Select>
                      <SelectTrigger><SelectValue placeholder="Vrsta" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Dnevno</SelectItem>
                        <SelectItem value="weekly">Sedmicno</SelectItem>
                        <SelectItem value="monthly">Mjesecno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Datum pocetka</Label>
                  <Input type="date" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
                <Button onClick={() => { setDialogOpen(false); toast.success("Zaduzenje kreirano"); }}>Kreiraj</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Aktivna zaduzenja</TabsTrigger>
          <TabsTrigger value="history">Istorija</TabsTrigger>
          <TabsTrigger value="offdays">Slobodni dani</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Aktivna zaduzenja ({active.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Taxi licenca</TableHead>
                    <TableHead>Dnevna cijena</TableHead>
                    <TableHead>Vrsta</TableHead>
                    <TableHead>Datum pocetka</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {active.map((a) => {
                    const driver = getDriverById(a.driver_id);
                    const vehicle = getVehicleById(a.vehicle_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                        <TableCell>
                          {vehicle ? (
                            <Badge variant="outline" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="font-medium">EUR{a.rent_amount}</TableCell>
                        <TableCell><StatusBadge status={a.rent_type} /></TableCell>
                        <TableCell>{a.start_date}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Istorija svih zaduzenja</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Cijena</TableHead>
                    <TableHead>Pocetak</TableHead>
                    <TableHead>Kraj</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => {
                    const driver = getDriverById(a.driver_id);
                    const vehicle = getVehicleById(a.vehicle_id);
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                        <TableCell>EUR{a.rent_amount}/{a.rent_type === "monthly" ? "mj" : a.rent_type === "weekly" ? "sed" : "dan"}</TableCell>
                        <TableCell>{a.start_date}</TableCell>
                        <TableCell>{a.end_date || "—"}</TableCell>
                        <TableCell><StatusBadge status={a.end_date ? "inactive" : "active"} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offdays" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Slobodni dani — pola rente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vozac</TableHead>
                    <TableHead>Vozilo</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Napomena</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {offDays.map((o) => {
                    const driver = getDriverById(o.driver_id);
                    const vehicle = getVehicleById(o.vehicle_id);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                        <TableCell>{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                        <TableCell>{o.date}</TableCell>
                        <TableCell className="text-muted-foreground">{o.notes || "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {offDays.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nema zabiljezenh slobodnih dana</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RentalsPage;
