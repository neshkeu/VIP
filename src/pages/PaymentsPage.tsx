import { useState } from "react";
import { payments, getDriverById, drivers } from "@/data/mockData";
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

const PaymentsPage = () => {
  const [search, setSearch] = useState("");
  const [driverFilter, setDriverFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = payments.filter((p) => {
    const driver = getDriverById(p.driver_id);
    const matchesSearch = driver?.full_name.toLowerCase().includes(search.toLowerCase()) || p.notes.toLowerCase().includes(search.toLowerCase());
    const matchesDriver = driverFilter === "all" || p.driver_id === driverFilter;
    return matchesSearch && matchesDriver;
  });

  const totalAmount = filtered.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Uplate</h1>
          <p className="text-muted-foreground">Praćenje uplata vozača · Ukupno: ${totalAmount.toLocaleString()}</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Evidentiraj uplatu</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Evidentiraj uplatu</DialogTitle>
              <DialogDescription>Evidentiraj novu uplatu od vozača.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Vozač</Label>
                <Select>
                  <SelectTrigger><SelectValue placeholder="Izaberi vozača" /></SelectTrigger>
                  <SelectContent>{drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Iznos</Label><Input type="number" placeholder="0" /></div>
                <div className="grid gap-2">
                  <Label>Način plaćanja</Label>
                  <Select>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Gotovina</SelectItem>
                      <SelectItem value="bank">Banka</SelectItem>
                      <SelectItem value="card">Kartica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Vrsta uplate</Label>
                <Select>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Zaduženje</SelectItem>
                    <SelectItem value="fine">Kazna</SelectItem>
                    <SelectItem value="other">Ostalo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2"><Label>Datum</Label><Input type="date" /></div>
              <div className="grid gap-2"><Label>Napomene</Label><Textarea placeholder="Napomene o uplati..." /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkaži</Button>
              <Button onClick={() => { setDialogOpen(false); toast.success("Uplata evidentirana"); }}>Sačuvaj</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Pretraži uplate..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={driverFilter} onValueChange={setDriverFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Svi vozači</SelectItem>
                {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Vozač</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Način plaćanja</TableHead>
                <TableHead>Napomene</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const driver = getDriverById(p.driver_id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.payment_date}</TableCell>
                    <TableCell className="font-medium">{driver?.full_name ?? "—"}</TableCell>
                    <TableCell className="font-medium">${p.amount}</TableCell>
                    <TableCell><StatusBadge status={p.payment_type} /></TableCell>
                    <TableCell><StatusBadge status={p.payment_method} /></TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{p.notes}</TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nema pronađenih uplata</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentsPage;
