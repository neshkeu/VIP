import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Users, Car, Wallet, AlertCircle, TrendingUp } from "lucide-react";
import { drivers, vehicles, cashEntries, driverDebts, getCashForPeriod, getCashBalance } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const today = new Date();
const YEAR  = today.getFullYear();
const MONTH = today.getMonth() + 1;
const PREFIX = `${YEAR}-${String(MONTH).padStart(2,"0")}`;

function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const Dashboard = () => {
  const activeDrivers  = drivers.filter(d => d.status === "active");
  const activeVehicles = vehicles.filter(v => v.status === "active");

  const { total_in, total_out, balance, entries } = getCashForPeriod(PREFIX + "-01", PREFIX + "-31");
  const currentBalance = getCashBalance(`${YEAR}-${String(MONTH).padStart(2,"0")}-17`);
  const openDebts = driverDebts.filter(d => d.status !== "closed");
  const totalDebt = openDebts.reduce((s, d) => s + (d.amount - d.paid_amount), 0);

  // Chart — ulaz/izlaz po danima u ovom mjesecu
  const byDate: Record<string, { day: string; Ulaz: number; Izlaz: number }> = {};
  entries.forEach(e => {
    if (!byDate[e.date]) byDate[e.date] = { day: e.date.slice(8), Ulaz: 0, Izlaz: 0 };
    if (e.direction === "in")  byDate[e.date].Ulaz  += e.amount;
    if (e.direction === "out") byDate[e.date].Izlaz += e.amount;
  });
  const chartData = Object.values(byDate).sort((a,b) => a.day.localeCompare(b.day));

  // Zadnji unosi
  const recentEntries = [...cashEntries].sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Kontrolna tabla</h1>
        <p className="text-muted-foreground text-sm">
          {today.toLocaleDateString("sr-RS", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </p>
      </div>

      {/* STAT KARTICE */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Stanje kase"      value={fmt(currentBalance)} icon={Wallet}       />
        <StatCard title="Aktivnih vozača"  value={activeDrivers.length} icon={Users}       trend={`${drivers.filter(d=>d.driver_type==="renta").length} renta · ${drivers.filter(d=>d.driver_type==="vlastito_vozilo").length} vlastito`} />
        <StatCard title="Aktivnih vozila"  value={activeVehicles.length} icon={Car}        />
        <StatCard title="Otvorena dugovanja" value={fmt(totalDebt)}     icon={AlertCircle} trend={`${openDebts.length} vozača`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* CHART */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Kasa ovaj mjesec</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Nema podataka</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fontSize:11 }} />
                    <YAxis tick={{ fontSize:11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : String(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:"var(--radius)" }}
                      formatter={(v: number) => [fmt(v)]}
                    />
                    <Bar dataKey="Ulaz"  fill="hsl(var(--primary))"    radius={[4,4,0,0]} />
                    <Bar dataKey="Izlaz" fill="hsl(var(--destructive))" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                <span className="text-green-600 font-medium">Ulaz: {fmt(total_in)}</span>
                <span className="text-red-500 font-medium">Izlaz: {fmt(total_out)}</span>
                <span className={`font-bold ${balance >= 0 ? "text-green-600" : "text-red-500"}`}>Bilans: {fmt(balance)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ZADNJI UNOSI */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />Zadnji unosi u kasu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentEntries.map(e => (
                <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.date} · {e.received_by}</p>
                  </div>
                  <span className={`font-bold text-sm ${e.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                    {e.direction === "in" ? "+" : "−"}{fmt(e.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* OTVORENA DUGOVANJA */}
      {openDebts.length > 0 && (
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.3 }}>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-destructive" />Otvorena dugovanja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {openDebts.map(d => {
                  const driver = drivers.find(dr => dr.id === d.driver_id);
                  const remaining = d.amount - d.paid_amount;
                  return (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                      <div>
                        <p className="font-medium text-sm">{driver?.full_name}</p>
                        <p className="text-xs text-muted-foreground">{d.description}</p>
                      </div>
                      <span className="font-bold text-destructive text-sm">{fmt(remaining)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;
