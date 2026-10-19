-- Istorija (trag) svih promena u relaciji vozač↔vozilo.
-- Svaka akcija (dodavanje, sklanjanje, promena uloge, deaktivacija vozača)
-- upisuje jedan red ovde — tako za sve ostaje trajan trag.
--
-- Pokreni jednom u Supabase (SQL editor). Bezbedno je: IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS vehicle_driver_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id    uuid,
  driver_id     uuid,
  role          text,                                   -- 'operativni' | 'papiroloski' | NULL
  action        text NOT NULL,                          -- 'added' | 'removed' | 'deactivated'
  date          date NOT NULL DEFAULT CURRENT_DATE,     -- datum promene
  performed_by  text,                                   -- ko je uneo
  note          text,                                   -- opciona napomena
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_driver_log_vehicle ON vehicle_driver_log (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_driver_log_driver  ON vehicle_driver_log (driver_id);
