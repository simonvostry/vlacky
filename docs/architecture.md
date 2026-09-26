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

Nine active tables are defined in [the schema](../src/db/schema.ts).

| Table | Purpose and relationships |
| --- | --- |
| `wagon_variants` | Stable identity for a group of visually identical wagon models |
| `vehicles` | Owned physical pieces; nullable variant link, individual running number, end-specific magnetic couplers, lighting, sound equipment and weathering; optional catalog/livery links, image dimensions, default DCC address and `isTemplate` |
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
| `/lokomotivy`, `/vozy`, `/nakladni-vozy` | Shared locomotives, passenger wagons and freight wagons |
| `/lokomotivy/[id]`, `/vozy/[id]`, `/nakladni-vozy/[id]` | Vehicle identity, DCC configuration and train appearances; locomotives also have speed profiles |
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
| `/api/varianty-vozu/[id]` | PUT quantity with expected count and explicit IDs when reducing |
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

## Passenger and freight collections

`vehicles.wagonKind` and `vehicle_catalog.wagonKind` classify wagons as `passenger`
or `freight`; the default preserves existing passenger records. The field is
irrelevant for locomotives: `type` stays `loco` / `wagon`, and locomotives remain
one shared collection. `trains.kind` independently classifies a saved composition.
Do not infer either classification from a designation, class badge or train number.

`/vozy` contains passenger stock (including sleeping, restaurant, baggage and postal
vehicles); `/nakladni-vozy` contains freight stock with the same new/detail/edit
routes and DCC support. Shared server components enforce authentication and redirect
wagon detail/edit links to the correct section. `vehicleSection` owns link routing.
The vehicle type selector offers Lokomotiva, Osobní vůz and Nákladní vůz; freight
forms omit passenger class selection. Catalog filter `typ=freight` selects freight,
while `typ=wagon` selects passenger stock. Catalog add actions keep this classification.

Soupravy has Vše / Osobní / Nákladní filters (`druh`). Adding from the freight filter
preselects a freight train. Its vehicle picker offers shared locomotives and matching
wagons by default; an explicit checkbox also offers the other wagon group for mixed
formations. Changing classification never removes existing composition members.
Owned models, catalog references, decoders, profiles and integration identities retain
their existing IDs. Omitted classification in older API edits preserves stored values.

## Wagon variants and physical copies

Passenger and freight galleries show one tile per `wagon_variant_id`, with an owned
piece count. Locomotives stay individual. The grouping ID is independent of an image
URL; different liveries have different groups. Existing physical `vehicles.id`,
catalog links, templates, memberships, decoders and speed profiles are retained.
An ungrouped legacy record is displayed individually until migrated.

`wagon_variants` provides stable group identity. Shared model/artwork fields remain
on each vehicle as a compatibility projection for existing queries and integrations:
designation, operator, type/kind, class, image path/dimensions, model manufacturer,
SKU and catalog/livery links. `wagon-storage.ts` is the write boundary: a variant
edit updates these fields on every member in one transaction. A piece edit that
changes shared fields splits that piece when it has siblings; changing artwork for
a single-piece variant keeps its group ID. Physical fields are never propagated:
DCC, notes, template status, running number, general lighting, couplers at ends A/B,
tail lights, sound decoder, speaker and weathering.
Use this service/API for maintenance edits rather than changing shared SQL columns
in place. Existing direct-import scripts predate grouping: run the additive variant
migration after such imports, or migrate the importer to this write boundary.

Creating a wagon reuses an exact pictured model/catalog match, or creates a new
variant. Quantity creates separate physical rows; only the first new row receives
explicit individual configuration. Additional copies default the new equipment/weathering flags to false, retain unknown
general lighting, and have blank DCC, running number and notes, and no decoder/profile cloning. The quantity
editor also uses actual rows, requires an expected count and explicit IDs for a
reduction, and refuses to delete any piece still used in a composition. Explicit
piece deletion has the same membership guard; deleting an unassigned piece removes
its attached configuration through foreign keys. No automatic destructive merge
or decrement occurs.

The train picker groups variants, shows free/total counts for the current train,
and accepts a quantity or selected piece IDs. Membership always points to physical
IDs. The same physical piece cannot be added twice to one train, but can occur in
alternative saved compositions. Allocation, deletion and reorder operations use
one interactive write transaction, including their validation reads. The raw helper
uses libSQL for both Turso and local SQLite to avoid asynchronous callbacks inside
better-sqlite3 transactions. API edits to a membership must match its parent train.

## Physical equipment and weathering

`vehicles.magneticCouplerA` and `magneticCouplerB` describe fixed physical ends A/B,
not current train direction. `hasTailLights` records red tail lights separately from
the existing nullable `hasLights` general-lighting field. `hasSoundDecoder` and
`hasSpeaker` are independent inventory flags: a wagon speaker can be wired to a
locomotive decoder. These flags neither create decoder configurations nor infer them
from sound-project names/functions. `isWeathered` records applied weathering for
both locomotives and wagons, without changing shared artwork or variant grouping.

All six new fields are non-null booleans, default false. They are validated and saved
only on the edited physical piece, even with whole-variant edit scope. Additional
copies receive defaults rather than copying equipment/weathering. Omitted fields
preserve existing values; explicit null/string/number values are rejected.

The legacy `magnetic_couplers` column remains for compatibility. The additive equipment
migration initializes each new end from its old whole-wagon value (null becomes false)
and never resets existing end columns on repeat. Legacy non-null API edits set both
ends only if neither explicit end is supplied. End edits refresh the old projection:
same values produce true/false; mixed ends produce null. The UI uses only end fields.
