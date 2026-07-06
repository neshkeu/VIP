import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://wfwyadpzgovfyihfbkei.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_tnHr1ujFyHvXBmVw5yi8ng_jIYFouxT";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Nedostaju Supabase kredencijali. Postavi VITE_SUPABASE_URL i VITE_SUPABASE_ANON_KEY u .env.local",
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
