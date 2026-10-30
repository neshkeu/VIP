// Datum helper — svugdje pretvara ISO (yyyy-mm-dd) u dd/mm/yyyy za prikaz.
// Baza i dalje čuva ISO — ovo je samo za prikaz.
export function fmtD(iso?: string | null): string {
  if (!iso) return "";
  // Podrži i ISO datetime (uzmi samo datumski deo)
  const s = String(iso).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

// dd/mm/yyyy - dd/mm/yyyy
export function fmtRange(from?: string | null, to?: string | null): string {
  if (!from && !to) return "";
  if (!from) return fmtD(to);
  if (!to || from === to) return fmtD(from);
  return `${fmtD(from)} — ${fmtD(to)}`;
}

// Datum po LOKALNOM vremenu (yyyy-mm-dd). toISOString() je UTC, pa posle
// ponoći (do 01–02h po našem vremenu) vraća JUČERAŠNJI datum — zato ovo.
export function localISO(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function todayISO(): string { return localISO(); }
export function thisMonthISO(): string { return localISO().slice(0, 7); }
