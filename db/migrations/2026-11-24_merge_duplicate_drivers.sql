-- Spajanje duplih vozača (ista osoba upisana dva puta: jednom kao operativni, jednom kao papirološki).
-- Od uvođenja komunalnog broja jedan vozač može imati više uloga (vehicle_drivers), pa su duplikati višak.

-- merge_drivers(keep, dup): sve veze i zapisi duplikata prelaze na "keep", duplikat se briše. Sve ili ništa.
CREATE OR REPLACE FUNCTION public.merge_drivers(p_keep uuid, p_dup uuid)
RETURNS void
LANGUAGE plpgsql AS $$
DECLARE r record;
BEGIN
  IF p_keep = p_dup THEN RAISE EXCEPTION 'Isti vozač'; END IF;
  -- veze sa komunalnim brojem: ako "keep" već ima vezu na tom vozilu, duplikatova se briše
  DELETE FROM public.vehicle_drivers d
   WHERE d.driver_id = p_dup
     AND EXISTS (SELECT 1 FROM public.vehicle_drivers k WHERE k.driver_id = p_keep AND k.vehicle_id = d.vehicle_id);
  UPDATE public.vehicle_drivers SET driver_id = p_keep WHERE driver_id = p_dup;
  -- sve ostale tabele sa driver_id
  FOR r IN
    SELECT c.table_name AS t FROM information_schema.columns c
    JOIN information_schema.tables tb ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'driver_id' AND c.table_name NOT IN ('drivers', 'vehicle_drivers')
      AND c.table_name NOT LIKE 'backup_%'
  LOOP
    EXECUTE format('UPDATE public.%I SET driver_id = $1 WHERE driver_id = $2', r.t) USING p_keep, p_dup;
  END LOOP;
  IF to_regclass('public.documents') IS NOT NULL THEN
    UPDATE public.documents SET entity_id = p_keep WHERE entity_type = 'driver' AND entity_id = p_dup;
  END IF;
  -- prazni podaci na "keep" se dopune sa duplikata
  UPDATE public.drivers k SET
    phone = COALESCE(NULLIF(NULLIF(k.phone, ''), '0'), d.phone),
    license_number = COALESCE(NULLIF(k.license_number, ''), d.license_number)
  FROM public.drivers d WHERE k.id = p_keep AND d.id = p_dup;
  DELETE FROM public.drivers WHERE id = p_dup;
END $$;

-- Jednokratno (24.11.2026): spojeni svi parovi istog imena; zadržan operativni zapis.
-- Rezervna kopija obrisanih: backup_drivers_merged, backup_vehicle_drivers_merged.
