# Vlacky — Model Train Tracker

Czech-language app for tracking model train collection and layout operations.

## Stack
- Next.js (App Router) + TypeScript + Tailwind CSS v4
- SQLite (better-sqlite3) + Drizzle ORM
- npm (not pnpm)

## Commands
- `npm run dev` — start dev server
- `npm run db:push` — sync Drizzle schema to SQLite
- `npm run db:seed` — seed database with sample data

## Conventions
- All UI text in Czech
- Vehicle images stored in `public/img/` as GIF side-profiles from vagonWEB.cz
- Database file at `data/vlacky.db` (gitignored)
- API routes under `src/app/api/`
- Czech URL paths: `/vlaky` (trains), `/vozidla` (vehicles), `/dcc`

## Data Model
- **vehicles** — physical model trains owned (locos + wagons)
- **trains** — named compositions (EC, IC, R, Os...)
- **train_vehicles** — position in consist + DCC overrides
- **decoder_functions** — F0–F28 function mapping per vehicle

## Domain Learnings
