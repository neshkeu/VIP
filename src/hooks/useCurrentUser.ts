import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useCurrentUser() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Ime korisnika — dio emaila prije @
  const displayName = user?.email?.split("@")[0] ?? "";

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return { user, displayName, logout };
}
