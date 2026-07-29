import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface ComboOption {
  value: string;
  label: string;
  sublabel?: string;
}

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
  const selected = options.find(o => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open}
          className="w-full justify-between font-normal">
          <span className={selected ? "" : "text-muted-foreground"}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          filter={(val, search) => {
            const opt = options.find(o => o.value === val);
            const hay = `${opt?.label ?? ""} ${opt?.sublabel ?? ""}`.toLowerCase();
            return hay.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder="Kucaj ime..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map(o => (
                <CommandItem key={o.value} value={o.value}
                  onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <Check className={`mr-2 h-4 w-4 ${value === o.value ? "opacity-100" : "opacity-0"}`} />
                  <div className="flex flex-col">
                    <span>{o.label}</span>
                    {o.sublabel && <span className="text-xs text-muted-foreground">{o.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
