import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { ExpiryAlerts } from "@/components/ExpiryAlerts";
import { Users, Car, Wallet, TrendingUp, Loader2 } from "lucide-react";
import { useDrivers } from "@/hooks/useDrivers";
import { useVehicles } from "@/hooks/useVehicles";
import { useCash } from "@/hooks/useCash";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";

const today = new Date();
const filterMonth = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}`;
function fmt(n: number) { return n.toLocaleString("sr-RS") + " RSD"; }

const Dashboard = () => {
  const { drivers, loading: loadingDrivers } = useDrivers();
  const { vehicles, loading: loadingVehicles } = useVehicles();
  const { entries, total_in, total_out, balance, loading: loadingCash } = useCash(filterMonth);

  const loading = loadingDrivers || loadingVehicles || loadingCash;

  const activeDrivers  = drivers.filter(d => d.status === "active");
  const activeVehicles = vehicles.filter(v => v.status === "active");

  // Chart po danima
  const byDate: Record<string, { day: string; Ulaz: number; Izlaz: number }> = {};
  entries.forEach(e => {
    const day = e.date.slice(8);
    if (!byDate[e.date]) byDate[e.date] = { day, Ulaz: 0, Izlaz: 0 };
    if (e.direction === "in")  byDate[e.date].Ulaz  += e.amount;
    if (e.direction === "out") byDate[e.date].Izlaz += e.amount;
  });
  const chartData = Object.values(byDate).sort((a,b) => a.day.localeCompare(b.day));

  const recentEntries = [...entries].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="h-10 w-10 animate-spin text-primary"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Kontrolna tabla</h1>
        <p className="text-muted-foreground text-sm">
          {today.toLocaleDateString("sr-RS", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Aktivnih vozača"  value={activeDrivers.length}  icon={Users} trend={`${drivers.filter(d=>d.driver_type==="renta").length} renta · ${drivers.filter(d=>d.driver_type==="vlastito_vozilo").length} vlastito`} />
        <StatCard title="Aktivnih vozila"  value={activeVehicles.length} icon={Car}   />
        <StatCard title="Ulaz ovaj mj."    value={fmt(total_in)}         icon={Wallet}    />
        <div className={`rounded-xl border p-4 flex flex-col gap-1 ${balance >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-sm text-muted-foreground">Bilans</p>
          <p className={`text-2xl font-bold font-display ${balance >= 0 ? "text-green-600" : "text-red-500"}`}>
            {balance >= 0 ? "+" : ""}{fmt(balance)}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-display text-base">Kasa ovaj mjesec</CardTitle></CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Nema podataka</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border"/>
                    <XAxis dataKey="day" tick={{ fontSize:11 }}/>
                    <YAxis tick={{ fontSize:11 }} tickFormatter={v => v >= 1000 ? `${v/1000}k` : String(v)}/>
                    <Tooltip contentStyle={{ backgroundColor:"hsl(var(--card))", border:"1px solid hsl(var(--border))", borderRadius:"var(--radius)" }} formatter={(v: number) => [fmt(v)]}/>
                    <Bar dataKey="Ulaz"  fill="hsl(var(--primary))"    radius={[4,4,0,0]}/>
                    <Bar dataKey="Izlaz" fill="hsl(var(--destructive))" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              )}
              <div className="flex justify-between text-xs text-muted-foreground mt-2 px-1">
                <span className="text-green-600 font-medium">+{fmt(total_in)}</span>
                <span className="text-red-500 font-medium">−{fmt(total_out)}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.15 }}>
          <ExpiryAlerts />
        </motion.div>

        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="font-display text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary"/>Zadnji unosi u kasu</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recentEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nema unosa ovaj mjesec</p>
              ) : (
                recentEntries.map(e => (
                  <div key={e.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{e.description || e.type}</p>
                      <p className="text-xs text-muted-foreground">{e.date} · {e.received_by}</p>
                    </div>
                    <span className={`font-bold text-sm ${e.direction === "in" ? "text-green-600" : "text-red-500"}`}>
                      {e.direction === "in" ? "+" : "−"}{fmt(e.amount)}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
