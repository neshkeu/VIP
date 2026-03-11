import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { Users, Car, FileText, DollarSign } from "lucide-react";
import { drivers, vehicles, getActiveAssignments, getMonthlyRentIncome, monthlyIncomeData, expensesByType } from "@/data/mockData";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { motion } from "framer-motion";

const COLORS = [
  "hsl(0, 72%, 51%)",
  "hsl(199, 89%, 48%)",
  "hsl(38, 92%, 50%)",
  "hsl(220, 14%, 70%)",
];

const Dashboard = () => {
  const activeRentals = getActiveAssignments().length;
  const monthlyIncome = getMonthlyRentIncome();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">Kontrolna tabla</h1>
        <p className="text-muted-foreground">Pregled vozila i ključni pokazatelji</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Ukupno vozača" value={drivers.length} icon={Users} trend="+2 ovog meseca" />
        <StatCard title="Ukupno vozila" value={vehicles.length} icon={Car} trend="+1 ovog meseca" />
        <StatCard title="Aktivna zaduženja" value={activeRentals} icon={FileText} />
        <StatCard title="Mesečni prihod" value={`$${monthlyIncome.toLocaleString()}`} icon={DollarSign} trend="+8% u odnosu na prošli mesec" />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Prihodi i troškovi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyIncomeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs fill-muted-foreground" />
                  <YAxis className="text-xs fill-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`$${value}`, undefined]}
                  />
                  <Bar dataKey="income" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Prihodi" />
                  <Bar dataKey="expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Troškovi" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Troškovi po vrsti</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={expensesByType} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4} dataKey="amount" nameKey="type">
                    {expensesByType.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      color: "hsl(var(--foreground))",
                    }}
                    formatter={(value: number) => [`$${value}`, undefined]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
