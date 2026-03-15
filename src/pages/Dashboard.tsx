import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Users, Car, CalendarDays, TrendingUp, CheckCircle2, AlertCircle } from "lucide-react";
import {
  drivers, vehicles, calendarEvents, cashEntries,
  getDriverMonthSummary, getCashSummary
} from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const today = new Date();
const YEAR  = today.getFullYear();
const MONTH = today.getMonth() + 1;

const Dashboard = () => {
  const activeDrivers  = drivers.filter(d => d.status === "active");
  const activeVehicles = vehicles.filter(v => v.status === "active");
  const cashSummary    = getCashSummary(YEAR, MONTH);

  // Ukupno neizmirenih obaveza ovog mjeseca
  const pendingEvents = calendarEvents.filter(e => {
    const m = `${YEAR}-${String(MONTH).padStart(2,"0")}`;
    return e.date.startsWith(m) && !e.is_done;
  });

  // Sumarni podaci po vozacu za chart
  const driverSummaries = activeDrivers.map(d => {
    const s = getDriverMonthSummary(d.id, YEAR, MONTH);
    return {
      name: d.full_name.split(" ")[0],
      Naplaceno: s.paid,
      Duguje: s.pending,
    };
  });

  // Kasa po danima (zadnjih 7 dana)
  const last7: { day: string; Prihod: number; Rashod: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d   = new Date(today);
    d.setDate(d.getDate() - i);
    const str = d.toISOString().split("T")[0];
    const ins = cashEntries.filter(e => e.date === str && e.direction === "in").reduce((s, e) => s + e.amount, 0);
    const out = cashEntries.filter(e => e.date === str && e.direction === "out").reduce((s, e) => s + e.amount, 0);
    last7.push({ day: `${d.getDate()}.${d.getMonth()+1}.`, Prihod: ins, Rashod: out });
  }

  const fmt = (n: number) => n.toLocaleString("sr-RS") + " RSD";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Kontrolna tabla</h1>
        <p className="text-muted-foreground">Pregled za {today.toLocaleDateString("sr-RS", { month: "long", year: "numeric" })}</p>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aktivnih vozača"     value={activeDrivers.length}   icon={Users}        trend={`${drivers.filter(d=>d.status==="inactive").length} neaktivnih`} />
        <StatCard title="Aktivnih vozila"     value={activeVehicles.length}  icon={Car}          />
        <StatCard title="Prihod ovog mjeseca" value={fmt(cashSummary.income)} icon={TrendingUp}   trend={`Rashod: ${fmt(cashSummary.expense)}`} />
        <StatCard title="Neizmirenih obaveza" value={pendingEvents.length}    icon={AlertCircle}  />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART — stanje po vozacu */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Stanje po vozaču ovaj mjesec</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={driverSummaries} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    formatter={(v: number) => [fmt(v)]}
                  />
                  <Bar dataKey="Naplaceno" fill="hsl(var(--primary))"   radius={[4,4,0,0]} />
                  <Bar dataKey="Duguje"    fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* CHART — kasa zadnjih 7 dana */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base">Kasa — zadnjih 7 dana</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={last7} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : v} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }}
                    formatter={(v: number) => [fmt(v)]}
                  />
                  <Bar dataKey="Prihod" fill="hsl(var(--primary))"   radius={[4,4,0,0]} />
                  <Bar dataKey="Rashod" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* BRZI PREGLED — neizmirene obaveze */}
      {pendingEvents.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />
                Neizmirene obaveze ovog mjeseca
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {pendingEvents.slice(0, 6).map(e => {
                  const driver = drivers.find(d => d.id === e.driver_id);
                  return (
                    <div key={e.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                      <div>
                        <p className="font-medium">{driver?.full_name.split(" ")[0]}</p>
                        <p className="text-xs text-muted-foreground">{e.date} · {e.description}</p>
                      </div>
                      <span className="font-semibold text-destructive">{fmt(e.amount)}</span>
                    </div>
                  );
                })}
              </div>
              {pendingEvents.length > 6 && (
                <p className="text-xs text-muted-foreground mt-3 text-center">+ još {pendingEvents.length - 6} neizmirenih obaveza</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
