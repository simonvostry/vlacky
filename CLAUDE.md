# Vlacky — Model Train Tracker

Czech-language app for tracking model train collection and layout operations.

**Full architecture docs:** [docs/architecture.md](docs/architecture.md)

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- SQLite (better-sqlite3) + Drizzle ORM
- node-html-parser for vagonWEB.cz scraping
- npm (not pnpm)

## Commands
- `npm run dev` — start dev server
- `npm run db:push` — sync Drizzle schema to SQLite
- `npm run db:seed` — seed database with sample data
- `npm run db:scrape` — scrape vehicle catalog from vagonWEB.cz
- `npm run db:scrape-images` — download all livery variant images
- `npx tsx src/db/scrape-rady.ts` — scrape rady pages (ČD 1994–2026 + ČSD 1957–1993)

## Conventions
- All UI text in Czech
- Vehicle images: `public/img/` (manual imports), `public/img/catalog/` (scraped)
- Operator logos: `public/img/logo-*.svg` (ČD, ČSD, ÖBB, DB, RJ)
- Database file at `data/vlacky.db` (gitignored)
- API routes under `src/app/api/`
- Czech URL paths: `/vlaky`, `/vozidla`, `/katalog`, `/dcc`
- Shared `OperatorLogo` component for all operator logo rendering

## Data Model (6 tables)
- **vehicles** — physical model trains owned (locos + wagons, with DCC addresses)
- **trains** — named compositions (EC, IC, R, Os...)
- **train_vehicles** — position in consist + DCC/lighting overrides
- **decoder_functions** — F0–F28 function mapping per vehicle
- **vehicle_catalog** — reference catalog scraped from vagonWEB.cz (~521 entries)
- **catalog_images** — multiple livery variants per catalog entry (~1600 images)

## Key Design Decisions
- Catalog is separate from owned vehicles (will be linked via FK later)
- Train compositions use visual side-profile GIF images at 0.75× scale
- Catalog filters use URL search params (?typ=, ?op=, ?barvy=) for bookmarkability
- Operator logos are SVG files with height-based sizing (width: auto)
- Designation decoder parses UIC letter codes into Czech descriptions

## Domain Learnings
- vagonWEB.cz has no JSON API — all data scraped from HTML tables
- Vehicle images at `/popisy/img/{OPERATOR}/{designation}-{variant}-a.gif`
- Multiple livery variants per vehicle type (up to 10+ for some)
- UIC designation letters: A=1st, B=2nd, WR=dining, WL=sleeping, D=luggage, m=long, p=open-plan, z=electric, f=driving trailer, ee=central power
