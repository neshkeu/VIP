import { Badge } from "@/components/ui/badge";
import { Check, FileText, X, Minus } from "lucide-react";
import type { DocStatus } from "@/hooks/useVehicles";

const CFG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  ORIGINAL: { label: "Original", icon: Check,    className: "bg-green-50 text-green-700 border-green-200" },
  KOPIJA:   { label: "Kopija",   icon: FileText, className: "bg-blue-50 text-blue-700 border-blue-200" },
  NEMA:     { label: "Nema",     icon: X,        className: "bg-red-50 text-red-700 border-red-200" },
  IMA:      { label: "Ima",      icon: Check,    className: "bg-green-50 text-green-700 border-green-200" },
};

export function DocumentStatusBadge({ status, label }: { status: DocStatus | "IMA" | "NEMA" | null; label?: string }) {
  if (!status) {
    return (
      <Badge variant="outline" className="gap-1 text-xs bg-muted/30 text-muted-foreground">
        <Minus className="h-3 w-3" />
        {label ?? "—"}
      </Badge>
    );
  }
  const cfg = CFG[status];
  if (!cfg) {
    return <Badge variant="outline" className="text-xs">{label ?? status}</Badge>;
  }
  const Icon = cfg.icon;
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${cfg.className}`}>
      <Icon className="h-3 w-3" />
      {label ?? cfg.label}
    </Badge>
  );
}

export function DocumentStatusSelect({
  value,
  onChange,
}: {
  value: DocStatus;
  onChange: (v: DocStatus) => void;
}) {
  const options: { v: DocStatus; label: string }[] = [
    { v: null,       label: "—" },
    { v: "ORIGINAL", label: "Original" },
    { v: "KOPIJA",   label: "Kopija" },
    { v: "NEMA",     label: "Nema" },
  ];
  return (
    <div className="flex gap-1 flex-wrap">
      {options.map(o => (
        <button
          key={String(o.v)}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-2 py-1 text-xs rounded border transition-colors ${
            value === o.v
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background hover:bg-accent border-input"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
