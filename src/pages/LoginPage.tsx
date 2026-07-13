import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Button } from "@/components/ui/button";
import { Loader2, Delete } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_MS       = 60_000;

function LoginPage() {
  const navigate = useNavigate();
  const { settings, loading: settingsLoading, error: settingsError } = useAppSettings();

  const [pin, setPin]           = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const APP_PIN = settings?.pin ?? "";
  const PIN_LEN = APP_PIN.length || 4;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate("/", { replace: true });
    });
  }, [navigate]);

  useEffect(() => {
    if (!lockedUntil) return;
    const t = setTimeout(() => setLockedUntil(null), lockedUntil - Date.now());
    return () => clearTimeout(t);
  }, [lockedUntil]);

  const locked = lockedUntil !== null && lockedUntil > Date.now();

  const submit = async (fullPin: string) => {
    if (loading || locked || !settings) return;
    setLoading(true);
    setError("");

    if (fullPin !== APP_PIN) {
      const next = attempts + 1;
      setAttempts(next);
      setPin("");
      if (next >= LOCKOUT_ATTEMPTS) {
        setLockedUntil(Date.now() + LOCKOUT_MS);
        setError("Previše pokušaja. Sačekaj 60 sekundi.");
      } else {
        setError(`Pogrešan PIN (${LOCKOUT_ATTEMPTS - next} pokušaja preostalo)`);
      }
      setLoading(false);
      return;
    }

    // Ako je servisni nalog podesen -> Supabase Auth login (starije podesavanje)
    if (settings.service_email && settings.service_password) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: settings.service_email,
        password: settings.service_password,
      });
      if (authError) {
        setError("Greška prilikom prijave. Proveri servisni nalog u bazi.");
        console.error("Auth error:", authError);
        setPin("");
        setLoading(false);
        return;
      }
    } else {
      // PIN alone - samo lokalni flag (RLS mora dozvoljavati anon)
      localStorage.setItem("vip_pin_ok", "1");
      localStorage.setItem("vip_pin_ok_at", String(Date.now()));
    }

    toast.success("Dobrodošli!");
    navigate("/", { replace: true });
  };

  const append = (digit: string) => {
    if (locked || loading || !settings) return;
    setError("");
    const next = (pin + digit).slice(0, PIN_LEN);
    setPin(next);
    if (next.length === PIN_LEN) submit(next);
  };

  const remove = () => {
    if (locked || loading) return;
    setError("");
    setPin(prev => prev.slice(0, -1));
  };

  const clear = () => {
    if (locked || loading) return;
    setError("");
    setPin("");
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked || loading) return;
      if (/^\d$/.test(e.key)) append(e.key);
      else if (e.key === "Backspace") remove();
      else if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pin, locked, loading, settings]);

  if (settingsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-xs space-y-6"
      >
        <div className="flex flex-col items-center gap-3">
          <div className="h-20 w-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-primary/20">
            <img src="/vip-taxi-logo.png" alt="VIP Taxi" className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-display font-bold tracking-wide">VIP TAXI</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Unesi PIN za pristup</p>
          </div>
        </div>

        {settingsError && (
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            Ne mogu da učitam podešavanja iz baze. Proveri da li tabela <code className="font-mono">app_settings</code> postoji.
          </div>
        )}

        <div className="flex justify-center gap-3">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <motion.div
              key={i}
              animate={{ scale: i < pin.length ? 1.15 : 1 }}
              transition={{ duration: 0.15 }}
              className={`h-3.5 w-3.5 rounded-full ${i < pin.length ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <AnimatePresence>
          {(error || loading) && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center text-sm min-h-[20px] font-medium"
            >
              {loading
                ? <span className="text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Prijava...</span>
                : <span className={locked ? "text-amber-600" : "text-destructive"}>{error}</span>}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-3 gap-2.5">
          {["1","2","3","4","5","6","7","8","9"].map(n => (
            <Button
              key={n}
              variant="outline"
              size="lg"
              disabled={locked || loading}
              onClick={() => append(n)}
              className="h-16 text-xl font-medium select-none"
            >
              {n}
            </Button>
          ))}
          <Button
            variant="ghost"
            size="lg"
            disabled={locked || loading || pin.length === 0}
            onClick={clear}
            className="h-16 text-xs text-muted-foreground"
          >
            Očisti
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={locked || loading}
            onClick={() => append("0")}
            className="h-16 text-xl font-medium"
          >
            0
          </Button>
          <Button
            variant="ghost"
            size="lg"
            disabled={locked || loading || pin.length === 0}
            onClick={remove}
            className="h-16"
          >
            <Delete className="h-5 w-5" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          VIP Plus Taxi © {new Date().getFullYear()}
        </p>
      </motion.div>
    </div>
  );
}

export default LoginPage;
