import { useEffect, useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useApp, type Driver } from "@/context/AppContext";
import { useVehicleDrivers } from "@/hooks/useVehicleDrivers";
import { useAssignments } from "@/hooks/useAssignments";
import { useVehicleDriverLog } from "@/hooks/useVehicleDriverLog";
import { useDebts } from "@/hooks/useDebts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

// Nazivi tabela za prikaz
const TABLE_LABELS: Record<string, string> = {
  cash_entries: "Stavke u kasi",
  driver_debts: "Dugovanja",
  debt_payments: "Uplate dugova",
  penalties: "Kazne",
  yandex_reports: "Yandex izvodi",
  card_reports: "Kartice",
  neoplanta_rides: "Neoplanta vožnje",
  membership_entries: "Članarine",
  calendar_entries: "Kalendar",
  calendar_amounts: "Kalendar (iznosi)",
  fuel_pdv_entries: "PDV gorivo",
  deposit_transactions: "Depozit",
  obracuni: "Obračuni (arhiva)",
  vehicle_drivers: "Veze sa komunalnim brojem",
  vehicle_assignments: "Periodi na vozilima",
  vehicle_driver_log: "Trag promena",
  monthly_assignments: "Mesečne dodele",
};
// Ovo nije novac/istorija poslovanja — brisanje bez dodatne potvrde
const STRUCTURAL = new Set(["vehicle_drivers", "vehicle_assignments", "vehicle_driver_log", "monthly_assignments"]);

type Row = { table_name: string; cnt: number };

// Brisanje vozača zajedno sa svim vezanim zapisima (za test/pogrešno unete vozače).
// Pravog vozača koji više ne radi treba DEAKTIVIRATI, ne brisati.
export function DeleteDriverDialog({ driver, onClose }: { driver: Driver | null; onClose: () => void }) {
  const { refetchAll } = useApp();
  const { refetch: refetchLinks } = useVehicleDrivers();
  const { refetch: refetchAssignments } = useAssignments();
  const { refetch: refetchLog } = useVehicleDriverLog();
  const { refetch: refetchDebts } = useDebts();

  const [rows, setRows]         = useState<Row[] | null>(null);
  const [noFn, setNoFn]         = useState(false);   // SQL funkcije nisu pokrenute
  const [confirm, setConfirm]   = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!driver) return;
    setRows(null); setNoFn(false); setConfirm("");
    supabase.rpc("driver_records_summary", { p_driver_id: driver.id }).then(({ data, error }) => {
      if (error) { setNoFn(true); setRows([]); return; }
      setRows(((data ?? []) as Row[]).map(r => ({ table_name: r.table_name, cnt: Number(r.cnt) })));
    });
  }, [driver]);

  const history = (rows ?? []).filter(r => !STRUCTURAL.has(r.table_name));
  const needsTyped = history.length > 0;
  const canDelete = !!driver && rows !== null && !noFn && (!needsTyped || confirm.trim().toUpperCase() === "OBRISI");

  const doDelete = async () => {
    if (!driver) return;
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_driver_cascade", { p_driver_id: driver.id });
      if (error) throw error;
      await Promise.all([refetchAll(), refetchLinks(), refetchAssignments(), refetchLog(), refetchDebts()]);
      toast.success(`Vozač ${driver.full_name} obrisan`);
      onClose();
    } catch (e) {
      toast.error("Brisanje nije uspelo (ništa nije obrisano): " + (e instanceof Error ? e.message : String(e)));
    } finally { setDeleting(false); }
  };

  return (
    <Dialog open={!!driver} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Obriši vozača</DialogTitle>
          <DialogDescription>{driver?.full_name}{driver?.phone ? ` · ${driver.phone}` : ""}</DialogDescription>
        </DialogHeader>

        {rows === null ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Proveravam šta sve ima vozač...</div>
        ) : noFn ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Za brisanje treba jednom pokrenuti SQL za brisanje vozača u Supabase (fajl <code>db/migrations/2026-10-30_delete_driver_cascade.sql</code>). Posle toga ovde radi.
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            {rows.length === 0 ? (
              <p>Vozač nema nikakvu istoriju — biće obrisan.</p>
            ) : (
              <>
                <p>Zajedno sa vozačem <strong>trajno</strong> se briše:</p>
                <ul className="rounded-lg border bg-muted/30 p-2.5 space-y-0.5">
                  {rows.map(r => (
                    <li key={r.table_name} className={`flex justify-between ${STRUCTURAL.has(r.table_name) ? "text-muted-foreground" : "font-medium"}`}>
                      <span>{TABLE_LABELS[r.table_name] ?? r.table_name}</span><span>{r.cnt}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {needsTyped && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="flex items-start gap-1.5 text-red-700"><AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  Vozač ima novčanu istoriju (kasa, dugovi, izvodi…). Briši samo test ili pogrešno unete vozače. Za pravog vozača koji više ne radi koristi <strong>Deaktiviraj</strong> (Komunalni broj → Vozači i istorija).</p>
                <p className="text-xs text-red-700">Za potvrdu upiši <strong>OBRISI</strong>:</p>
                <Input value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="OBRISI" className="bg-white" />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={deleting}>Otkaži</Button>
          <Button variant="destructive" disabled={!canDelete || deleting} onClick={doDelete}>
            {deleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Obriši trajno
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
