# Architecture

[Documentation index](../README.md#documentation)

Vlacky separates reference catalog data from physical models and saved train
compositions. It documents decoder settings and backs up current speed measurements;
it does not control hardware or write iTrain projects.

## Runtime and source ownership

Next.js App Router serves React pages and API handlers. Drizzle uses libSQL/Turso
when both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are present; otherwise the app
uses `data/vlacky.db` through better-sqlite3. All callers await database operations.
`src/db/index.ts` also supplies atomic read/write helpers for either driver.

| Location | Responsibility |
| --- | --- |
| `src/app/` | Pages, route handlers, global styles and app icons |
| `src/components/` | Shared navigation, forms, train images and configuration editors |
| `src/db/schema.ts` | Drizzle schema; authoritative field definitions |
| `src/db/` | Connections, catalog scrapers and historical train import scripts |
| `src/lib/` | Validation, storage helpers, authentication policy, integration and theme state |
| `scripts/` | Additive migrations and image preparation/verification |
| `tests/` | Policy, theme, API, migration and integration tests |
| `public/img/` | Source/catalog images, owned variants, UI derivatives and operator logos |
| `output/`, `data/backups/` | Ignored local working artifacts and private backups |

Authentication uses Auth.js with Google and an exact verified-email allowlist.
Every protected page/API checks authorization before data access. Dedicated
integration endpoints require their own bearer token. See [authentication](authentication.md)
and [integration](itrain-integration.md) for the separate boundaries.

## Data model

Eight active tables are defined in [the schema](../src/db/schema.ts).

| Table | Purpose and relationships |
| --- | --- |
| `vehicles` | Owned physical models; optional catalog/livery links, image dimensions, default DCC address and `isTemplate` |
| `vehicle_catalog` | Reference vehicle types and prototype specifications |
| `catalog_images` | Ordered livery variants belonging to a catalog type |
| `trains` | Named compositions with category, number, route, era and notes |
| `train_vehicles` | Ordered vehicle membership and notes; the same vehicle may belong to several saved compositions |
| `vehicle_decoders` | Installed decoders belonging to a physical vehicle; nullable own address inherits the vehicle default |
| `decoder_functions` | Functions linked to vehicle and installed decoder; category, behavior and description |
| `vehicle_speed_profiles` | One current JSON profile per locomotive with an optimistic-concurrency token |

Legacy `train_vehicles.dcc_address_override` and `lighting_decoder_address` columns
remain for compatibility; the app no longer reads/writes train-specific DCC settings.
Do not reuse them for new functionality.

`VehicleDecoders` and `DecoderEditor` share the locomotive/wagon editor. A decoder
includes manufacturer/model, sound project, manual URL, notes, functions and ordered
CV records with optional CV31/CV32 indexes. Copying a decoder makes an independent
configuration without copying its address. The DCC overview resolves inherited
addresses and flags addresses shared between vehicles. These records do not program
hardware. Validation and atomic persistence live in `decoder-config.ts` and
`decoder-storage.ts`.

`SpeedProfileEditor` supports metadata, graph/table display, advanced point editing
and validated application-format JSON import/export. Profiles retain both directions,
source/context evidence, measurement date and full precision. No revision history is
kept; decoder edits do not erase the captured profile context. Stale writes return 409.
See [the speed-profile contract](itrain-integration.md#current-speed-profile-backup).

## Routes

| UI route | Purpose |
| --- | --- |
| `/` | Redirect to `/soupravy` |
| `/prihlaseni` | Public Google login |
| `/soupravy` | Composition list; `?souprava=ID` opens in-flow details, below the selected row on mobile |
| `/soupravy/[id]` | Composition detail and vehicle ordering |
| `/lokomotivy`, `/vozy` | Owned locomotive/wagon libraries |
| `/lokomotivy/[id]`, `/vozy/[id]` | Vehicle identity, DCC configuration and train appearances; locomotives also have speed profiles |
| `/katalog`, `/katalog/[id]` | Reference catalog, filters and livery variants; Přidat pre-fills an owned-vehicle form |
| `/dcc` | Address overview and conflicts |
| `/vozidla` | Legacy redirect to `/lokomotivy`; older detail/edit routes remain compatible |

Trains, locomotives and wagons have `/novy` and `/[id]/upravit` forms. Catalog filters
are composable URL parameters: `typ`, `op`, `barvy`. ČSD filtering also includes
catalog entries labeled ČSD/ČD.

| API | Methods / purpose |
| --- | --- |
| `/api/vozidla`, `/api/vlaky` | GET/POST collection list/create |
| `/api/vozidla/[id]`, `/api/vlaky/[id]` | GET/PUT/DELETE item CRUD |
| `/api/vlaky/[id]/vozidla` | POST/PUT/DELETE composition membership/order |
| `/api/vozidla/[id]/dekodery` | GET/PUT validated atomic decoder configuration |
| `/api/vozidla/[id]/rychlostni-profil` | GET/PUT current locomotive profile with `expectedUpdatedAt` |
| `/api/auth/[...nextauth]` | Auth.js handlers |
| `/api/mcp` | GET/POST read-only MCP tools |
| `/api/integrations/v1/snapshot` | GET collection snapshot |
| `/api/integrations/v1/images/[id]` | GET native original/PNG vehicle image |

## Catalog sources

Scrapers parse vagonWEB HTML, not a JSON API. `scrape-vagonweb.ts` reads popisy pages
for ČD, ČSD/ČD, RJ and ÖBB; `scrape-images.ts` reads their grouped livery views;
`scrape-rady.ts` reads ČD/ČSD yearly fleet pages. Catalog counts are mutable and
are not architecture constants. `designation-decoder.tsx` explains UIC letter codes.

Import scripts represent specific historical train examples, not the complete or
current collection inventory. Run them only deliberately: they write data.
See [operations](operations.md) for migration and maintenance precautions, and
[design](design.md) for current layout, themes and image scaling.
