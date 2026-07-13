import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface AppSettings {
  pin: string;
  service_email: string;
  service_password: string;
}

const DEFAULTS: AppSettings = {
  pin: "1234",
  service_email: "",
  service_password: "",
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("app_settings")
        .select("key, value");

      if (cancelled) return;

      if (err) {
        console.error("useAppSettings:", err);
        setError(err.message);
        setSettings(DEFAULTS);
        setLoading(false);
        return;
      }

      const map: Partial<AppSettings> = {};
      (data ?? []).forEach(row => {
        (map as Record<string, string>)[row.key] = row.value;
      });

      setSettings({ ...DEFAULTS, ...map });
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  async function updateSetting(key: keyof AppSettings, value: string) {
    const { error: err } = await supabase
      .from("app_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (err) throw err;
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
  }

  return { settings, loading, error, updateSetting };
}
