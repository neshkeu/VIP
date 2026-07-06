import type { Vehicle } from "@/hooks/useVehicles";
import type { Driver } from "@/hooks/useDrivers";
import { DocumentStatusBadge } from "./DocumentStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Car, FileText, User, Phone, Building2, Calendar, Hash, ShieldCheck } from "lucide-react";

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("sr-RS");
  } catch {
    return d;
  }
}

function isExpiringSoon(date: string | null | undefined) {
  if (!date) return false;
  const diff = (new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return diff < 30 && diff > 0;
}
function isExpired(date: string | null | undefined) {
  return date ? new Date(date) < new Date() : false;
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium text-right ${mono ? "font-mono" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">{title}</p>
      </div>
      <div className="rounded-lg border bg-card/50 p-3">{children}</div>
    </div>
  );
}

function DateCell({ date }: { date: string | null | undefined }) {
  if (!date) return <span>—</span>;
  const expired = isExpired(date);
  const soon = isExpiringSoon(date);
  return (
    <span className={`inline-flex items-center gap-1 ${expired ? "text-red-600" : soon ? "text-amber-600" : ""}`}>
      {(expired || soon) && <AlertTriangle className="h-3 w-3" />}
      {fmtDate(date)}
    </span>
  );
}

export function VehicleDetailsCard({ vehicle, drivers = [] }: { vehicle: Vehicle; drivers?: Driver[] }) {
  const primaryDriver = drivers.find(d => d.vehicle_id === vehicle.id);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-display font-bold">
                {vehicle.brand} {vehicle.model}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {vehicle.year > 0 ? vehicle.year : "godina —"}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="secondary" className="font-mono text-sm">
                {vehicle.license_plate}
              </Badge>
              {vehicle.taxi_license_number && (
                <Badge variant="outline" className="font-mono text-xs">
                  KO {vehicle.taxi_license_number}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Osnovni podaci */}
        <Section icon={Car} title="Osnovni podaci">
          <Row label="Marka" value={vehicle.brand} />
          <Row label="Model" value={vehicle.model} />
          <Row label="Godina" value={vehicle.year > 0 ? vehicle.year : "—"} />
          <Row label="Tablice" value={vehicle.license_plate} mono />
          <Row label="Komunalni broj" value={vehicle.taxi_license_number} mono />
          <Row label="VIN" value={vehicle.vin} mono />
        </Section>

        {/* Vlasnik */}
        <Section icon={Building2} title="Vlasnik / Udruženje">
          <Row label="Vlasnik" value={vehicle.owner_name} />
          <Row
            label="Telefon vlasnika"
            value={
              vehicle.owner_phone ? (
                <a href={`tel:${vehicle.owner_phone}`} className="text-primary hover:underline">
                  {vehicle.owner_phone}
                </a>
              ) : "—"
            }
          />
          <Row label="Udruženje" value={vehicle.udruzenje} />
          <Row label="POS terminal" value={vehicle.pos_terminal_id || "—"} mono />
        </Section>

        {/* Rokovi */}
        <Section icon={Calendar} title="Rokovi">
          <Row label="Taksi legitimacija" value={<DateCell date={vehicle.taxi_license_expiry} />} />
          <Row label="Registracija" value={<DateCell date={vehicle.registration_expiry} />} />
          <Row label="Osiguranje" value={<DateCell date={vehicle.insurance_expiry} />} />
        </Section>

        {/* Dokumenti */}
        <Section icon={FileText} title="Dokumenti vozila">
          <div className="flex justify-between items-center py-1.5 border-b border-border/40">
            <span className="text-xs text-muted-foreground">Legitimacija vozila</span>
            <DocumentStatusBadge status={vehicle.leg_vozila_status} />
          </div>
          <div className="flex justify-between items-center py-1.5 border-b border-border/40">
            <span className="text-xs text-muted-foreground">Inspekcijski</span>
            <DocumentStatusBadge status={vehicle.inspekcijski_status} />
          </div>
          <div className="flex justify-between items-center py-1.5">
            <span className="text-xs text-muted-foreground">Saobraćajna</span>
            <DocumentStatusBadge status={vehicle.saobracajna_status} />
          </div>
        </Section>
      </div>

      {/* Vozač */}
      {primaryDriver && (
        <Section icon={User} title="Trenutni vozač">
          <Row label="Ime i prezime" value={primaryDriver.full_name} />
          <Row
            label="Telefon"
            value={
              primaryDriver.phone ? (
                <a href={`tel:${primaryDriver.phone}`} className="text-primary hover:underline">
                  {primaryDriver.phone}
                </a>
              ) : "—"
            }
          />
          <Row
            label="Tip"
            value={
              <Badge variant="outline" className="text-xs">
                {primaryDriver.driver_type === "renta" ? "Renta" : "Vlastito vozilo"}
              </Badge>
            }
          />
        </Section>
      )}

      {/* Napomena */}
      {vehicle.notes && (
        <Section icon={Hash} title="Napomena">
          <p className="text-sm whitespace-pre-wrap">{vehicle.notes}</p>
        </Section>
      )}
    </div>
  );
}
