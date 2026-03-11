import { useParams, Link } from "react-router-dom";
import { getVehicleById, getActiveAssignmentForVehicle, getDriverById, getExpensesByVehicle } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Car, User, Calendar } from "lucide-react";

const VehicleDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const vehicle = getVehicleById(id!);

  if (!vehicle) return <div className="p-8 text-center text-muted-foreground">Vozilo nije pronađeno</div>;

  const assignment = getActiveAssignmentForVehicle(vehicle.id);
  const driver = assignment ? getDriverById(assignment.driver_id) : null;
  const expenses = getExpensesByVehicle(vehicle.id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild><Link to="/vehicles"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-display font-bold">{vehicle.brand} {vehicle.model}</h1>
          <StatusBadge status={vehicle.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Car className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Podaci o vozilu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Godina:</span> <span className="ml-2">{vehicle.year}</span></div>
            <div><span className="text-muted-foreground">Tablice:</span> <span className="ml-2 font-mono">{vehicle.license_plate}</span></div>
            <div><span className="text-muted-foreground">VIN:</span> <span className="ml-2 font-mono text-xs">{vehicle.vin_number}</span></div>
            {vehicle.notes && <div><span className="text-muted-foreground">Napomene:</span> <span className="ml-2">{vehicle.notes}</span></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Dodeljeni vozač</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {driver && assignment ? (
              <div className="space-y-3">
                <div><span className="text-muted-foreground">Vozač:</span> <Link to={`/drivers/${driver.id}`} className="ml-2 text-primary hover:underline">{driver.full_name}</Link></div>
                <div><span className="text-muted-foreground">Zaduženje:</span> <span className="ml-2">${assignment.rent_amount}/{assignment.rent_type}</span></div>
                <div><span className="text-muted-foreground">Od:</span> <span className="ml-2">{assignment.start_date}</span></div>
              </div>
            ) : (
              <p className="text-muted-foreground">Nema dodeljenog vozača</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Datumi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><span className="text-muted-foreground">Istek registracije:</span> <span className="ml-2">{vehicle.registration_expiry}</span></div>
            <div><span className="text-muted-foreground">Istek osiguranja:</span> <span className="ml-2">{vehicle.insurance_expiry}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display">Istorija troškova</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Datum</TableHead>
                <TableHead>Vrsta</TableHead>
                <TableHead>Iznos</TableHead>
                <TableHead>Opis</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>{e.date}</TableCell>
                  <TableCell><StatusBadge status={e.expense_type} /></TableCell>
                  <TableCell className="font-medium">${e.amount}</TableCell>
                  <TableCell className="text-muted-foreground">{e.description}</TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nema evidentiranih troškova</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default VehicleDetailPage;
