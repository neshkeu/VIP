import { useState } from "react";
import { posReports, vehicles, getVehicleById } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/StatCard";
import { Plus, CreditCard, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PosReportsPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false);

  const totalPos = posReports.reduce((sum, r) => sum + r.amount, 0);
  const thisMonth = posReports.filter(r => r.report_date.startsWith("2025-03")).reduce((sum, r) => sum + r.amount, 0);

  // Grupisanje po vozilu
  const byVehicle = vehicles.map(v => {
    const reports = posReports.filter(r => r.vehicle_id === v.id);
    const total = reports.reduce((sum, r) => sum + r.amount, 0);
    return { vehicle: v, reports, total };
  }).filter(x => x.reports.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">POS Izvodi</h1>
          <p className="text-muted-foreground">Prihodi sa kartičnih terminala po vozilu</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Unesi izvod</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Unos bankarskog izvoda</DialogTitle>
              <DialogDescription>Unesite podatke sa primljenog izvoda od banke.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Vozilo (POS terminal)</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.filter(v => v.status !== "inactive").map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.brand} {v.model} — {v.pos_terminal_id} ({v.taxi_license_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Iznos (EUR)</Label>
                <Input type="number" placeholder="850.00" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Period od</Label>
                  <Input type="date" />
                </div>
                <div className="grid gap-2">
                  <Label>Period do</Label>
                  <Input type="date" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Datum izvoda</Label>
                <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="grid gap-2">
                <Label>Napomena (opciono)</Label>
                <Input placeholder="Broj izvoda, banka..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkazi</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success("Izvod uspjesno unesen"); }}>Sacuvaj</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Ukupni POS prihodi" value={`EUR${totalPos.toLocaleString()}`} icon={CreditCard} />
        <StatCard title="Ovaj mjesec" value={`EUR${thisMonth.toLocaleString()}`} icon={TrendingUp} trend="Mart 2025" />
        <StatCard title="Broj izvoda" value={posReports.length} icon={CreditCard} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {byVehicle.map(({ vehicle, reports, total }) => (
          <motion.div key={vehicle.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="font-display text-base">
                    {vehicle.brand} {vehicle.model}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="font-mono text-xs">{vehicle.taxi_license_number}</Badge>
                    <Badge variant="outline" className="font-mono text-xs">{vehicle.pos_terminal_id}</Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Ukupno: <span className="font-semibold text-foreground">EUR{total.toLocaleString()}</span></p>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Datum izvoda</TableHead>
                      <TableHead>Iznos</TableHead>
                      <TableHead>Napomena</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">{r.period_from} — {r.period_to}</TableCell>
                        <TableCell className="text-xs">{r.report_date}</TableCell>
                        <TableCell className="font-semibold">EUR{r.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{r.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Svi POS izvodi</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vozilo</TableHead>
                <TableHead>POS terminal</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Datum izvoda</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Napomena</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posReports.sort((a, b) => b.report_date.localeCompare(a.report_date)).map((r) => {
                const vehicle = getVehicleById(r.vehicle_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                    <TableCell>
                      {vehicle ? <Badge variant="outline" className="font-mono text-xs">{vehicle.pos_terminal_id}</Badge> : "—"}
                    </TableCell>
                    <TableCell className="text-xs">{r.period_from} — {r.period_to}</TableCell>
                    <TableCell>{r.report_date}</TableCell>
                    <TableCell className="font-semibold">EUR{r.amount.toLocaleString()}</TableCell>
                    <TableCell className="text-muted-foreground">{r.notes || "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PosReportsPage;
