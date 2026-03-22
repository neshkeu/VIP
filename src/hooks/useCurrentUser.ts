import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useCurrentUser() {
  const [user, setUser]               = useState<any>(null);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    loadUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUser());
    return () => subscription.unsubscribe();
  }, []);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      const { data } = await supabase.from("profiles").select("display_name").eq("id", user.id).single();
      setDisplayName(data?.display_name ?? user.email?.split("@")[0] ?? "");
    } else {
      setDisplayName("");
    }
  }

  const logout = async () => { await supabase.auth.signOut(); };

  return { user, displayName, logout };
}
