import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const PIN_TTL_MS = 12 * 60 * 60 * 1000; // 12h

function hasValidPinFlag(): boolean {
  const ok = localStorage.getItem("vip_pin_ok");
  const at = Number(localStorage.getItem("vip_pin_ok_at") ?? 0);
  if (ok !== "1" || !at) return false;
  if (Date.now() - at > PIN_TTL_MS) {
    localStorage.removeItem("vip_pin_ok");
    localStorage.removeItem("vip_pin_ok_at");
    return false;
  }
  return true;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [pinOk, setPinOk]     = useState<boolean>(hasValidPinFlag());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    const onStorage = () => setPinOk(hasValidPinFlag());
    window.addEventListener("storage", onStorage);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );

  if (!session && !pinOk) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
