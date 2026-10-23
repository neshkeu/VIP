import { useState, useRef, useEffect } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ComboOption {
  value: string;
  label: string;
  sublabel?: string;
}

// Inline (bez portala) combobox — lista je unutar dijaloga pa skrol mišem radi.
export function DriverCombobox({
  value,
  onChange,
  options,
  placeholder = "Izaberi vozača...",
  emptyText = "Nema rezultata.",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.value === value);

  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? options.filter(o => `${o.label} ${o.sublabel ?? ""}`.toLowerCase().includes(needle))
    : options;

  // Zatvori klikom van komponente
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQ(""); }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <Button type="button" variant="outline" role="combobox" aria-expanded={open}
        className="w-full justify-between font-normal" onClick={() => setOpen(o => !o)}>
        <span className={`truncate ${selected ? "" : "text-muted-foreground"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="flex items-center gap-1 border-b px-2">
            <Search className="h-4 w-4 opacity-50 shrink-0" />
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Kucaj ime..."
              className="w-full bg-transparent px-1 py-2 text-sm outline-none" />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : filtered.map(o => (
              <button key={o.value} type="button"
                onClick={() => { onChange(o.value); setOpen(false); setQ(""); }}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent">
                <Check className={`h-4 w-4 shrink-0 ${value === o.value ? "opacity-100" : "opacity-0"}`} />
                <span className="flex flex-col min-w-0">
                  <span className="truncate">{o.label}</span>
                  {o.sublabel && <span className="text-xs text-muted-foreground truncate">{o.sublabel}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
