import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  inactive: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-warning/15 text-warning border-warning/30",
  rent: "bg-primary/15 text-primary border-primary/30",
  fine: "bg-destructive/15 text-destructive border-destructive/30",
  other: "bg-muted text-muted-foreground border-border",
  repair: "bg-destructive/15 text-destructive border-destructive/30",
  service: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  insurance: "bg-warning/15 text-warning border-warning/30",
  cash: "bg-success/15 text-success border-success/30",
  bank: "bg-primary/15 text-primary border-primary/30",
  card: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  daily: "bg-chart-3/15 text-chart-3 border-chart-3/30",
  weekly: "bg-chart-4/15 text-chart-4 border-chart-4/30",
  monthly: "bg-primary/15 text-primary border-primary/30",
};

const statusLabels: Record<string, string> = {
  active: "Aktivan",
  inactive: "Neaktivan",
  maintenance: "Servis",
  rent: "Zaduženje",
  fine: "Kazna",
  other: "Ostalo",
  repair: "Popravka",
  service: "Servis",
  insurance: "Osiguranje",
  cash: "Gotovina",
  bank: "Banka",
  card: "Kartica",
  daily: "Dnevno",
  weekly: "Nedeljno",
  monthly: "Mesečno",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge variant="outline" className={cn("capitalize font-medium", statusStyles[status] || "")}>
      {statusLabels[status] || status}
    </Badge>
  );
}
