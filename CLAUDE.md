# Vlacky — Model Train Tracker

Czech-language app for tracking model train collection and layout operations.

**Full architecture docs:** [docs/architecture.md](docs/architecture.md)

## Live Deployment
- **App URL:** https://vlacky.vercel.app
- **Hosting:** Vercel (personal account, auto-deploys from GitHub on push to main)
- **GitHub:** https://github.com/simonvostry/vlacky (public repo)
- **Database:** Turso (libSQL) at `libsql://vlacky-xsima78.aws-eu-west-1.turso.io`
- **Turso credentials:** in `.env.local` (gitignored) and Vercel env vars

## Stack
- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Database: Turso (libSQL) in production, SQLite (better-sqlite3) as local fallback
- ORM: Drizzle (supports both drivers via `src/db/index.ts`)
- Scraping: node-html-parser + fetch
- Package manager: npm

## URL Routes

### UI Pages
| URL | Description |
|-----|-------------|
| `/` | Redirects to `/katalog` |
| `/katalog` | Vehicle catalog (landing page) — browsable grid with filters |
| `/katalog/[id]` | Catalog detail — all livery variants, specs, designation decoder, "Přidat" button |
| `/soupravy` | Train compositions list with visual rendering |
| `/soupravy/[id]` | Train detail — visual composition + vehicle management |
| `/soupravy/[id]/upravit` | Edit train metadata |
| `/soupravy/novy` | Create new train |
| `/lokomotivy` | Owned locomotives library |
| `/lokomotivy/[id]` | Locomotive detail (DCC address, train appearances) |
| `/lokomotivy/[id]/upravit` | Edit locomotive |
| `/lokomotivy/novy` | Add new locomotive (supports pre-fill from catalog) |
| `/vozy` | Owned wagons library |
| `/vozy/[id]` | Wagon detail |
| `/vozy/[id]/upravit` | Edit wagon |
| `/vozy/novy` | Add new wagon (supports pre-fill from catalog) |
| `/dcc` | DCC address overview + conflict detection |

### API Routes
| Method | URL | Description |
|--------|-----|-------------|
| GET/POST | `/api/vozidla` | List/create vehicles |
| GET/PUT/DELETE | `/api/vozidla/[id]` | CRUD vehicle |
| GET/POST | `/api/vlaky` | List/create trains |
| GET/PUT/DELETE | `/api/vlaky/[id]` | CRUD train |
| POST/PUT/DELETE | `/api/vlaky/[id]/vozidla` | Manage train composition (add, reorder, remove) |

### Legacy Redirects
| URL | Redirects to |
|-----|-------------|
| `/vozidla` | `/lokomotivy` |

## Commands
- `npm run dev` — start dev server (reads `.env.local` for Turso)
- `npm run build` — production build
- `npm run db:push` — sync Drizzle schema (uses Turso if env vars set)
- `npm run db:seed` — seed with EC 70 sample data
- `npm run db:scrape` — scrape vehicle catalog from vagonWEB.cz popisy pages
- `npm run db:scrape-images` — download all livery variant images from grouped views
- `npx tsx src/db/scrape-rady.ts` — scrape rady pages (ČD 1994–2026 + ČSD 1957–1993)
- `npx tsx src/db/scrape-rady.ts csd` — scrape ČSD only (1957–1993)
- `vercel --prod` — manual deploy to Vercel
- `git push` — auto-deploys to Vercel via GitHub integration

## Data Model (5 active tables)

```
vehicles ←→ train_vehicles ←→ trains
   ↓
vehicle_catalog ← catalog_images
```

- **vehicles** — physical models owned (designation, operator, type, classType, imagePath, manufacturer, catalogNumber, dccAddress, catalogId FK, catalogImageId FK)
- **trains** — named compositions (number, name, category, route, era)
- **train_vehicles** — junction: vehicleId + trainId + position + DCC overrides
- **vehicle_catalog** — reference catalog from vagonWEB.cz (~521 entries, 5 operators)
- **catalog_images** — multiple livery variants per catalog entry (~1600+ images)
- ~~decoder_functions~~ — removed (was F0–F28 mapping, now just dccAddress per vehicle)

## Data Sources (vagonWEB.cz)

### Catalog Scrapers
| Script | Source Pages | Operator | Entries |
|--------|-------------|----------|---------|
| `scrape-vagonweb.ts` | `popisy.php?k=CD_Y`, `CD_Z`, `CSD_4n_II`, `RJ`, `OeBB_1` | ČD, ČSD, RJ, ÖBB | ~339 |
| `scrape-images.ts` | Same pages with `z=s` (grouped view) | All | ~1600 variants |
| `scrape-rady.ts` | `rady.php?z=ČD` (1994–2026), `z=ČSD` (1957–1993) | ČD, ČSD | ~182 additional |

### Train Import Scripts (src/db/import-*.ts)
8 trains imported: EC 70, RJ 1014, RJ 55, Ex 355, R 452, R 670, Os 9065, Sp 1641

## Key Design Decisions
- **Catalog ≠ owned vehicles**: `vehicle_catalog` is reference data; `vehicles` is what you own. Linked via optional `catalogId` FK.
- **"Přidat" from catalog**: Catalog detail page has a button per livery variant → pre-fills the vehicle form with all data from catalog.
- **Image sizing**: All images rendered at 0.75× native scale. **Critical: must override Tailwind's `img { max-width: 100% }` with inline `maxWidth: "none"` on all vehicle images**, otherwise they shrink in narrow containers.
- **Flexbox wrap layout**: Catalog and vehicle grids use `flex flex-wrap` with fixed tile widths (`shrink-0`) — tiles never compress, they wrap to next row instead.
- **Operator logos**: SVG files at `public/img/logo-*.svg` (ČD, ČSD, ÖBB, DB, RJ). Shared via `OperatorLogo` component.
- **Filters**: URL search params (`?typ=loco`, `?op=ČD`, `?barvy=1`) — bookmarkable, composable.
- **Async DB**: All queries use `await` — works with both sync better-sqlite3 and async Turso.
- **Designation decoder**: `src/components/designation-decoder.tsx` parses UIC letter codes into Czech descriptions.

## Domain Learnings
- vagonWEB.cz has no JSON API — all data scraped from HTML tables
- Vehicle images at `/popisy/img/{OPERATOR}/{designation}-{variant}-a.gif`
- Multiple livery variants per vehicle type (up to 10+ for some)
- Tailwind v4 preflight sets `img { max-width: 100%; height: auto }` — must be overridden with inline `maxWidth: "none"` for fixed-size vehicle images
- UIC designation letters: A=1st, B=2nd, WR=dining, WL=sleeping, D=luggage, m=long, p=open-plan, z=electric, f=driving trailer, ee=central power
- ČSD operators stored as both "ČSD" and "ČSD/ČD" in catalog — filter treats them as one group
