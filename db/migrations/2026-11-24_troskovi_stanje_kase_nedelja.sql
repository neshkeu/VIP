-- Troškovi/prihodi firme u kasi, stanje kase (preneto) i posebna cena nedelje.
-- Bezbedno za ponovno pokretanje.

-- 1) Kasa: kategorija stavke (za troškove/ostale prihode) i veza sa komunalnim brojem (vozilom)
ALTER TABLE public.cash_entries ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.cash_entries ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS cash_entries_date_idx ON public.cash_entries(date);

-- 2) Vozač: posebna cena nedelje (npr. 4600 radnim danom, 1000 nedeljom). 0 = važi staro pravilo.
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS sunday_rate numeric NOT NULL DEFAULT 0;

-- 3) Stanje kase pre datuma (preneto): svi ulazi minus svi izlazi pre p_date
CREATE OR REPLACE FUNCTION public.cash_balance_before(p_date date)
RETURNS numeric
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM(CASE WHEN direction = 'in' THEN amount ELSE -amount END), 0)
  FROM public.cash_entries WHERE date < p_date;
$$;
