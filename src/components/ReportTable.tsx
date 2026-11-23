import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ReportCol<T> {
  key: string;
  label: string;
  value: (r: T) => string | number | null | undefined;   // za sortiranje, zbir i CSV
  render?: (r: T) => ReactNode;                           // prikaz (ako se razlikuje od value)
  money?: boolean;                                         // iznos u RSD (desno, bez decimala)
  num?: boolean;                                           // broj (desno)
  sum?: boolean;                                           // zbir u poslednjem redu
}

export const fmtMoney = (n: number | null | undefined) =>
  n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("sr-RS");

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Tabela izveštaja: klik na zaglavlje sortira, zbir na dnu, izvoz u Excel (CSV) i štampa.
export function ReportTable<T>({
  title, subtitle, rows, cols, rowKey, defaultSort, defaultDesc = true, fileName, empty = "Nema podataka za izabrani period", onRowClick, maxHeight = 520, actions,
}: {
  title: string;
  subtitle?: string;
  rows: T[];
  cols: ReportCol<T>[];
  rowKey: (r: T) => string;
  defaultSort?: string;
  defaultDesc?: boolean;
  fileName: string;
  empty?: string;
  onRowClick?: (r: T) => void;
  maxHeight?: number;
  actions?: ReactNode;
}) {
  const [sortKey, setSortKey] = useState(defaultSort ?? "");
  const [desc, setDesc] = useState(defaultDesc);

  const sorted = useMemo(() => {
    const col = cols.find(c => c.key === sortKey);
    if (!col) return rows;
    return [...rows].sort((a, b) => {
      const va = col.value(a), vb = col.value(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      const r = typeof va === "number" && typeof vb === "number" ? va - vb : String(va).localeCompare(String(vb), "sr");
      return desc ? -r : r;
    });
  }, [rows, cols, sortKey, desc]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    for (const c of cols) if (c.sum) t[c.key] = rows.reduce((s, r) => s + (Number(c.value(r)) || 0), 0);
    return t;
  }, [rows, cols]);
  const hasTotals = cols.some(c => c.sum) && rows.length > 1;

  const cellText = (c: ReportCol<T>, r: T) => {
    const v = c.value(r);
    if (c.money) return fmtMoney(v as number);
    if (c.num) return v == null ? "—" : Number(v).toLocaleString("sr-RS", { maximumFractionDigits: 1 });
    return v == null || v === "" ? "—" : String(v);
  };

  const exportCsv = () => {
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const lines = [cols.map(c => q(c.label)).join(";")];
    for (const r of sorted) lines.push(cols.map(c => {
      const v = c.value(r);
      if ((c.money || c.num) && v != null && v !== "") return String(Math.round(Number(v) * 100) / 100).replace(".", ",");
      return q(v == null ? "" : String(v));
    }).join(";"));
    if (hasTotals) lines.push(cols.map((c, i) => c.sum ? String(Math.round(totals[c.key])) : i === 0 ? q("UKUPNO") : "").join(";"));
    // BOM da Excel pravilno prikaže č/ć/š/ž
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${fileName}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const print = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const right = (c: ReportCol<T>) => c.money || c.num ? "text-align:right" : "";
    const head = cols.map(c => `<th style="${right(c)}">${esc(c.label)}</th>`).join("");
    const body = sorted.map(r => `<tr>${cols.map(c => `<td style="${right(c)}">${esc(cellText(c, r))}</td>`).join("")}</tr>`).join("");
    const foot = hasTotals ? `<tr class="t">${cols.map((c, i) => `<td style="${right(c)}">${c.sum ? fmtMoney(totals[c.key]) : i === 0 ? "UKUPNO" : ""}</td>`).join("")}</tr>` : "";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>body{font-family:Arial,sans-serif;font-size:12px;margin:20px}h2{margin:0 0 4px}p{margin:0 0 12px;color:#666}
      table{border-collapse:collapse;width:100%}th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left}
      th{background:#f3f3f3}tr.t td{font-weight:bold;border-top:2px solid #333}</style></head>
      <body><h2>VIP TAXI — ${esc(title)}</h2><p>${esc(subtitle ?? "")}</p><table><thead><tr>${head}</tr></thead><tbody>${body}${foot}</tbody></table></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 150);
  };

  const clickHead = (key: string) => {
    if (sortKey === key) setDesc(d => !d);
    else { setSortKey(key); setDesc(true); }
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {actions}
          <Button size="sm" variant="outline" className="h-8" onClick={exportCsv} disabled={rows.length === 0}><Download className="h-3.5 w-3.5 mr-1.5" />Excel</Button>
          <Button size="sm" variant="outline" className="h-8" onClick={print} disabled={rows.length === 0}><Printer className="h-3.5 w-3.5 mr-1.5" />Štampaj</Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <div className="overflow-auto border-t" style={{ maxHeight }}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr>
                  {cols.map(c => (
                    <th key={c.key} onClick={() => clickHead(c.key)}
                      className={`px-3 py-2 font-medium text-xs text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground ${c.money || c.num ? "text-right" : "text-left"}`}>
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sortKey === c.key && (desc ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={rowKey(r)} onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={`border-t border-border/50 ${onRowClick ? "cursor-pointer hover:bg-muted/50" : ""}`}>
                    {cols.map(c => (
                      <td key={c.key} className={`px-3 py-1.5 whitespace-nowrap ${c.money || c.num ? "text-right tabular-nums" : ""}`}>
                        {c.render ? c.render(r) : cellText(c, r)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {hasTotals && (
                <tfoot className="sticky bottom-0 bg-muted font-semibold">
                  <tr className="border-t-2 border-foreground/30">
                    {cols.map((c, i) => (
                      <td key={c.key} className={`px-3 py-2 whitespace-nowrap ${c.money || c.num ? "text-right tabular-nums" : ""}`}>
                        {c.sum ? (c.money ? fmtMoney(totals[c.key]) : totals[c.key].toLocaleString("sr-RS", { maximumFractionDigits: 1 })) : i === 0 ? `Ukupno (${rows.length})` : ""}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
