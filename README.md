# VIP Taxi – Sistem za upravljanje voznim parkom

Aplikacija za taxi biznis: evidencija vozila i vozača, kalendar članarina,
kasa (dnevne uplate/isplate), dugovanja, Yandex izveštaji i izveštaji sa kartica.

## Tehnologije

- **Vite** + **React 18** + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (Radix)
- **Supabase** (PostgreSQL + Auth)
- **React Router** za rutiranje
- **TanStack Query** za data cache
- **Vitest** + **Testing Library** za testove
- **Playwright** za e2e testove

## Setup

Potreban je Node.js 18+.

```bash
# 1. Instaliraj zavisnosti
npm install

# 2. Kreiraj .env.local i unesi Supabase kredencijale
cp .env.example .env.local
# uredi .env.local

# 3. Pokreni dev server
npm run dev
```

Aplikacija se otvara na `http://localhost:8080`.

## Skripte

| Komanda | Opis |
|--------|------|
| `npm run dev` | Dev server sa HMR |
| `npm run build` | Produkcioni build |
| `npm run preview` | Preview build-a |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit testovi |
| `npm run test:watch` | Testovi u watch modu |

## Struktura

```
src/
  components/       Reusable komponente (AppLayout, AppSidebar, ErrorBoundary...)
  components/ui/    shadcn/ui primitivi
  context/          AppContext (globalno stanje: vozači, vozila, izveštaji)
  data/             Mock podaci
  hooks/            Custom React hooks (useVehicles, useCash, useDrivers...)
  lib/              supabase klijent, utils
  pages/            Rute (Dashboard, DriversPage, CashPage...)
  test/             Vitest setup i primeri
```

## Stranice / rute

- `/` – Kontrolna tabla (dashboard)
- `/vehicles` – Vozila
- `/drivers` – Vozači
- `/calendar` – Kalendar članarina
- `/cash` – Kasa
- `/debts` – Dugovanja
- `/yandex` – Yandex izveštaji
- `/cards` – Kartični izveštaji
- `/login` – Prijava

## Environment varijable

Pogledati `.env.example`:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Ako `.env.local` ne postoji, klijent koristi fallback vrednosti iz `src/lib/supabase.ts`.
