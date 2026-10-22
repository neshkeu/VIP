-- Jednokratno: prebaci sve stare veze vozač→vozilo iz polja drivers.vehicle_id
-- u pravu tabelu vehicle_drivers (uloga = trenutna drivers.role).
-- Time veza više ne živi samo u jedno-vrednosnom polju vehicle_id (koje se gazi),
-- pa se papirološke/operativne veze ne gube pri prebacivanju.
--
-- Bezbedno je: dodaje vezu samo ako već NE postoji za taj (vozilo, vozač).
-- Pokreni jednom u Supabase (SQL editor).

INSERT INTO vehicle_drivers (vehicle_id, driver_id, role)
SELECT d.vehicle_id, d.id, d.role
FROM drivers d
WHERE d.vehicle_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM vehicle_drivers vd
    WHERE vd.driver_id = d.id
      AND vd.vehicle_id = d.vehicle_id
  );
