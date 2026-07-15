import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Calendar, Car, User } from "lucide-react";
import { useApp } from "@/context/AppContext";

type Item = {
  id: string;
  kind: "vehicle" | "driver";
  entityName: string;
  what: string;
  date: string;
  daysLeft: number;
};

function daysBetween(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return null;
  return Math.floor((d - Date.now()) / (1000 * 60 * 60 * 24));
}

function fmtDate(d: string) {
  try { return new Date(d).toLocaleDateString("sr-RS"); }
  catch { return d; }
}

const WARN_DAYS = 30;

export function ExpiryAlerts() {
  const { vehicles } = useApp();

  const items: Item[] = [];

  vehicles.forEach(v => {
    const label = `${v.brand} ${v.model} (${v.license_plate})`;
    const checks: Array<[string, string | null | undefined]> = [
      ["Taksi legitimacija", v.taxi_license_expiry],
      ["Registracija",       v.registration_expiry],
      ["Osiguranje",         v.insurance_expiry],
    ];
    checks.forEach(([what, date]) => {
      const d = daysBetween(date);
      if (d === null) return;
      if (d <= WARN_DAYS) {
        items.push({
          id: `${v.id}-${what}`,
          kind: "vehicle",
          entityName: label,
          what,
          date: date!,
          daysLeft: d,
        });
      }
    });
  });

  items.sort((a, b) => a.daysLeft - b.daysLeft);

  const expired = items.filter(i => i.daysLeft < 0);
  const soon    = items.filter(i => i.daysLeft >= 0 && i.daysLeft <= WARN_DAYS);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Rokovi i notifikacije
          {(expired.length + soon.length) > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">{expired.length + soon.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-80 overflow-y-auto">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sve u redu — nema isticanja u sledećih {WARN_DAYS} dana
          </p>
        ) : (
          items.map(item => {
            const Icon = item.kind === "vehicle" ? Car : User;
            const isExpired = item.daysLeft < 0;
            const isUrgent  = item.daysLeft >= 0 && item.daysLeft <= 7;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-2 rounded-lg border p-2.5 ${
                  isExpired ? "bg-red-50 border-red-200"
                  : isUrgent ? "bg-amber-50 border-amber-200"
                  : "bg-muted/30 border-border"
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                  isExpired ? "text-red-600" : isUrgent ? "text-amber-600" : "text-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.entityName}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {item.what} — {fmtDate(item.date)}
                  </p>
                </div>
                <Badge
                  variant={isExpired ? "destructive" : isUrgent ? "secondary" : "outline"}
                  className="text-xs whitespace-nowrap"
                >
                  {isExpired ? `istekla pre ${Math.abs(item.daysLeft)} dana` : `za ${item.daysLeft} dana`}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
