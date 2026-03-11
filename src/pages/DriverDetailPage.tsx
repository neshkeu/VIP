import { useParams, Link } from "react-router-dom";
import { getDriverById, getAssignmentsByDriver, getVehicleById, getPaymentsByDriver } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, CreditCard, Car } from "lucide-react";

const DriverDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const driver = getDriverById(id!);

  if (!driver) return <div className="p-8 text-center text-muted-foreground">Vozač nije pronađen</div>;

  const assignments = getAssignmentsByDriver(driver.id);
  const activeAssignment = assignments.find((a) => !a.end_date);
  const vehicle = activeAssignment ? getVehicleById(activeAssignment.vehicle_id) : null;
  const payments = getPaymentsByDriver(driver.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link to="/drivers"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-display font-bold">{driver.full_name}</h1>
          <StatusBadge status={driver.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Lični podaci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Telefon:</span> <span className="ml-2">{driver.phone}</span></div>
            <div><span className="text-muted-foreground">Adresa:</span> <span className="ml-2">{driver.address}</span></div>
            <div><span className="text-muted-foreground">Dozvola:</span> <span className="ml-2 font-mono">{driver.license_number}</span></div>
            {driver.notes && <div><span className="text-muted-foreground">Napomene:</span> <span className="ml-2">{driver.notes}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Bankovni podaci</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Račun:</span> <span className="ml-2 font-mono">{driver.bank_account}</span></div>
            <div><span className="text-muted-foreground">Kartica:</span> <span className="ml-2 font-mono">{driver.bank_card_number}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Car className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Dodeljeno vozilo</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {vehicle && activeAssignment ? (
              <div className="space-y-3">
                <div><span className="text-muted-foreground">Vozilo:</span> <Link to={`/vehicles/${vehicle.id}`} className="ml-2 text-primary hover:underline">{vehicle.brand} {vehicle.model} ({vehicle.year})</Link></div>
                <div><span className="text-muted-foreground">Tablice:</span> <span className="ml-2 font-mono">{vehicle.license_plate}</span></div>
                <div><span className="text-muted-foreground">Zaduženje:</span> <span className="ml-2">${activeAssignment.rent_amount}/{activeAssignment.rent_type}</span></div>
                <div><span className="text-muted-foreground">Od:</span> <span className="ml-2">{activeAssignment.start_date}</span></div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nema dodeljenog vozila</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Istorija uplata</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Način plaćanja</TableHead>
                <TableHead>Napomene</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.payment_date}</TableCell>
                  <TableCell className="font-medium">${p.amount}</TableCell>
                  <TableCell><StatusBadge status={p.payment_type} /></TableCell>
                  <TableCell><StatusBadge status={p.payment_method} /></TableCell>
                  <TableCell className="text-muted-foreground">{p.notes}</TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nema evidentiranih uplata</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default DriverDetailPage;
