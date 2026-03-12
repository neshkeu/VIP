import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// TODO: Zamijeniti sa pravim backend pozivom
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "viptaxi2025";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulacija API poziva — zamijeniti sa pravim backendom
    await new Promise(r => setTimeout(r, 600));

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      localStorage.setItem("viptaxi_auth", "true");
      toast.success("Dobrodosli, Admin!");
      navigate("/");
    } else {
      setError("Pogresno korisnicko ime ili lozinka.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Logo i naziv */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-24 w-24 rounded-2xl overflow-hidden shadow-lg ring-4 ring-primary/20">
              <img src="/vip-taxi-logo.png" alt="VIP Taxi" className="h-full w-full object-cover" />
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-display font-bold tracking-wide text-foreground">VIP TAXI</h1>
          </div>
        </div>

        {/* Login forma */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border bg-card p-6 shadow-sm space-y-5"
        >
          <div className="text-center">
            <h2 className="text-base font-semibold text-foreground">Prijava</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Unesite svoje podatke za pristup</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Korisnicko ime</Label>
              <Input
                id="username"
                type="text"
                placeholder="admin"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Lozinka</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-destructive text-center bg-destructive/10 rounded-md py-2 px-3"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !username || !password}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Prijava...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Prijavi se
                </span>
              )}
            </Button>
          </form>
        </motion.div>

        <p className="text-center text-xs text-muted-foreground">
          VIP Plus Taxi &copy; {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

export default LoginPage;
