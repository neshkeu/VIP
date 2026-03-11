import { useState } from "react";
import { expenses, getVehicleById, vehicles } from "@/data/mockData";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const ExpensesPage = () => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = expenses.filter((e) => {
    const vehicle = getVehicleById(e.vehicle_id);
    const matchesSearch = e.description.toLowerCase().includes(search.toLowerCase()) ||
      `${vehicle?.brand} ${vehicle?.model}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || e.expense_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalExpenses = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Troškovi</h1>
          <p className="text-muted-foreground">Troškovi vozila · Ukupno: ${totalExpenses.toLocaleString()}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Dodaj trošak</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dodaj trošak</DialogTitle>
              <DialogDescription>Evidentiraj trošak vozila.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Vozilo</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozilo" /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.license_plate})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Vrsta</Label>
                  <Select>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repair">Popravka</SelectItem>
                      <SelectItem value="service">Servis</SelectItem>
                      <SelectItem value="insurance">Osiguranje</SelectItem>
                      <SelectItem value="other">Ostalo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Iznos</Label><Input type="number" placeholder="0" /></div>
              </div>
              <div className="grid gap-2"><Label>Datum</Label><Input type="date" /></div>
              <div className="grid gap-2"><Label>Opis</Label><Textarea placeholder="Opis troška..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkaži</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success("Trošak dodat"); }}>Sačuvaj</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pretraži troškove..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Sve vrste</SelectItem>
                <SelectItem value="repair">Popravka</SelectItem>
                <SelectItem value="service">Servis</SelectItem>
                <SelectItem value="insurance">Osiguranje</SelectItem>
                <SelectItem value="other">Ostalo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Vozilo</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Opis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => {
                const vehicle = getVehicleById(e.vehicle_id);
                return (
                  <TableRow key={e.id}>
                    <TableCell>{e.date}</TableCell>
                    <TableCell className="font-medium">{vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}</TableCell>
                    <TableCell><StatusBadge status={e.expense_type} /></TableCell>
                    <TableCell className="font-medium">${e.amount}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[250px] truncate">{e.description}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nema pronađenih troškova</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpensesPage;
