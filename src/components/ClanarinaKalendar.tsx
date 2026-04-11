import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS_SR = ["Januar","Februar","Mart","April","Maj","Juni","Juli","Avgust","Septembar","Oktobar","Novembar","Decembar"];
const DAYS_SR   = ["Ned","Pon","Uto","Sri","Čet","Pet","Sub"];

function getMondaysInMonth(year: number, month: number): string[] {
  const mondays: string[] = [];
  const days = new Date(year, month, 0).getDate();
  for (let d = 1; d <= days; d++) {
    const dow = new Date(year, month-1, d).getDay();
    if (dow === 1) {
      mondays.push(`${year}-${String(month).padStart(2,"0")}-${String(d).padStart(2,"0")}`);
    }
  }
  return mondays;
}

function getWeekEnd(mondayStr: string): string {
  const d = new Date(mondayStr + "T00:00:00");
  d.setDate(d.getDate() + 6);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }
function fmtShort(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()}. ${MONTHS_SR[dt.getMonth()].slice(0,3)}`;
}

interface MembershipEntry {
  id: string; driver_id: string; date_from: string; date_to: string; amount: number;
}

export function ClanarinaKalendar({ driverId, weeklyAmt }: { driverId: string; weeklyAmt: number }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth()+1);
  const [entries, setEntries] = useState<MembershipEntry[]>([]);

  useEffect(() => {
    if (!driverId || driverId === "none") return;
    supabase.from("membership_entries").select("*")
      .eq("driver_id", driverId)
      .order("date_from", { ascending: false })
      .then(({ data }) => setEntries(data ?? []));
  }, [driverId]);

  const mondays = getMondaysInMonth(year, month);

  const isWeekPaid = (monday: string): boolean => {
    const sunday = getWeekEnd(monday);
    return entries.some(e => e.date_from <= monday && e.date_to >= sunday);
  };

  const isWeekPartial = (monday: string): boolean => {
    const sunday = getWeekEnd(monday);
    return entries.some(e =>
      (e.date_from <= monday && e.date_to >= monday) ||
      (e.date_from <= sunday && e.date_to >= sunday)
    ) && !isWeekPaid(monday);
  };

  const prevMonth = () => { if(month===1){setMonth(12);setYear(y=>y-1);}else setMonth(m=>m-1); };
  const nextMonth = () => { if(month===12){setMonth(1);setYear(y=>y+1);}else setMonth(m=>m+1); };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4"/>
        </button>
        <span className="text-xs font-semibold">{MONTHS_SR[month-1]} {year} — Članarine</span>
        <button onClick={nextMonth} className="h-7 w-7 rounded hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ChevronRight className="h-4 w-4"/>
        </button>
      </div>

      <div className="space-y-1.5">
        {mondays.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Nema sedmica</p>}
        {mondays.map((monday, i) => {
          const sunday = getWeekEnd(monday);
          const paid = isWeekPaid(monday);
          const partial = isWeekPartial(monday);
          return (
            <div key={monday} className={`rounded-lg border px-3 py-2 flex items-center justify-between ${
              paid    ? "bg-green-50 border-green-300" :
              partial ? "bg-amber-50 border-amber-300" :
              "bg-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded-full flex-shrink-0 ${paid?"bg-green-500":partial?"bg-amber-400":"bg-gray-200"}`}/>
                <span className="text-xs font-medium">{i+1}. sedmica</span>
                <span className="text-xs text-muted-foreground">{fmtShort(monday)} — {fmtShort(sunday)}</span>
              </div>
              <span className={`text-xs font-semibold ${paid?"text-green-600":partial?"text-amber-600":"text-gray-400"}`}>
                {paid ? `✓ ${fmt(weeklyAmt)}` : partial ? "djelimično" : "nije plaćeno"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 text-xs">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-500 inline-block"/>Plaćeno</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400 inline-block"/>Djelimično</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-200 inline-block"/>Nije plaćeno</span>
      </div>
    </div>
  );
}
