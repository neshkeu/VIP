-- Brisanje vozača (npr. test vozači) zajedno sa SVIM vezanim zapisima.
-- Pokreni jednom u Supabase (SQL editor). Bezbedno za ponovno pokretanje.
--
-- 1) driver_records_summary: koliko zapisa vozač ima po tabelama (pregled pre brisanja)
-- 2) delete_driver_cascade: briše sve vezane zapise pa vozača — sve ili ništa
--    (ako bilo šta ne uspe, ništa se ne briše).

CREATE OR REPLACE FUNCTION public.driver_records_summary(p_driver_id uuid)
RETURNS TABLE(table_name text, cnt bigint)
LANGUAGE plpgsql AS $$
DECLARE r record; n bigint;
BEGIN
  FOR r IN
    SELECT c.table_name AS t
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'driver_id' AND c.table_name <> 'drivers'
  LOOP
    EXECUTE format('SELECT count(*) FROM public.%I WHERE driver_id = $1', r.t) INTO n USING p_driver_id;
    IF n > 0 THEN table_name := r.t; cnt := n; RETURN NEXT; END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.delete_driver_cascade(p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r record; pass int; failed int;
BEGIN
  -- Zapisi koji nemaju driver_id, a vise o zapisima ovog vozača
  IF to_regclass('public.obracun_stavke') IS NOT NULL AND to_regclass('public.obracuni') IS NOT NULL THEN
    DELETE FROM public.obracun_stavke WHERE obracun_id IN (SELECT id FROM public.obracuni WHERE driver_id = p_driver_id);
  END IF;
  IF to_regclass('public.debt_payments') IS NOT NULL AND to_regclass('public.driver_debts') IS NOT NULL THEN
    DELETE FROM public.debt_payments WHERE debt_id IN (SELECT id FROM public.driver_debts WHERE driver_id = p_driver_id);
  END IF;
  IF to_regclass('public.penalties') IS NOT NULL AND to_regclass('public.driver_debts') IS NOT NULL THEN
    DELETE FROM public.penalties WHERE debt_id IN (SELECT id FROM public.driver_debts WHERE driver_id = p_driver_id);
  END IF;
  IF to_regclass('public.documents') IS NOT NULL THEN
    DELETE FROM public.documents WHERE entity_type = 'driver' AND entity_id::text = p_driver_id::text;
  END IF;

  -- Sve tabele sa kolonom driver_id; više prolaza zbog redosleda stranih ključeva
  FOR pass IN 1..6 LOOP
    failed := 0;
    FOR r IN
      SELECT c.table_name AS t
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public' AND c.column_name = 'driver_id' AND c.table_name <> 'drivers'
    LOOP
      BEGIN
        EXECUTE format('DELETE FROM public.%I WHERE driver_id = $1', r.t) USING p_driver_id;
      EXCEPTION WHEN foreign_key_violation THEN
        failed := failed + 1;
      END;
    END LOOP;
    EXIT WHEN failed = 0;
  END LOOP;

  -- Na kraju sam vozač (ako nešto i dalje drži vezu, javlja grešku i NIŠTA se ne briše)
  DELETE FROM public.drivers WHERE id = p_driver_id;
END $$;
