# Development and operations

[Documentation index](../README.md#documentation)

## Local setup

1. Install dependencies with `npm ci`.
2. Configure the server-only Google variables in `.env.local` as described in
   [authentication](authentication.md). Login denies access if configuration is missing.
3. Choose the database deliberately. The runtime loads `.env.local` and uses Turso
   when both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are set; otherwise it opens
   `data/vlacky.db`. A local server can therefore read/write the real collection.
4. For a fresh disposable local database, initialize the schema with `npm run db:push`
   only after confirming the target. `drizzle.config.ts` reads process environment;
   it does not itself load `.env.local`. Do not assume its target matches the runtime.
5. Run `npm run dev` and use `http://localhost:3000` for Google login.

Credentials stay in ignored environment files or hosting settings. Never copy them
into documentation, fixtures, output logs or a public repository. `output/` holds
local generation/research/review artifacts; `data/backups/` holds private snapshots.
Neither is required to build the app from Git.

## Resuming work

Read `AGENTS.md` and the relevant topic document, then inspect the branch, recent
commits, tracked diffs and untracked paths before editing. Existing untracked artwork
and import/preparation scripts may belong to earlier work: do not stage them with a
blanket add, discard them or run them as setup. Local files survive an app restart,
but untracked/ignored files are not backed up by a Git push.

When a session is explicitly saved, an optional private restart note can be placed
under ignored `output/session-notes/`, with `LATEST.md` pointing to the dated note.
Use it for working-tree inventory, completed verification, deployed commits and
outstanding user verification. Keep durable rules in these topic docs. Local notes
must not contain credentials or supersede the current code and documentation.

Read the review launcher before reusing a local browser harness; verify that its
database is disposable. Prior `output/` fixtures are test data, not the live collection.
Never run a local server assuming `.env.local` targets a disposable database.

## Validation

```sh
npm run build
npm run test:theme
npm run test:train-display
npm run test:gallery-size
npm run test:freight
npm run test:collection-filters
npm run test:filter-dropdown
npm run test:auth
npm run test:auth-http
npm run test:decoders
npm run test:speed-profiles
npm run test:integration
```

Run the suites relevant to the change. HTTP suites require a production build and
use isolated servers/disposable authentication and databases, never the live
collection. `test:auth-http` deliberately uses an unreachable database for anonymous
requests. Decoder/profile/integration suites validate writes against temporary SQLite.
`npm run lint` is also available; a build is not a substitute for linting changed code.

For image changes, run `node scripts/check-train-image-edges.mjs`.
For detail magnifier changes also run `npm run test:image-zoom` and check hover,
keyboard, touch, lazy loading and native-pixel limits at DPR 1, 2 and 3. For UI changes,
check both themes and mobile layouts; use the [design rules](design.md). Verify live
images with authentication, not an anonymous response that may be a login page.

## Database changes

Existing installations use additive migrations, not `db:push` as a replacement for
migration logic. These scripts load `.env.local`, so inspect the target before running.

| Command | Disposable/local target override |
| --- | --- |
| `npm run db:migrate-decoders` | `DECODER_MIGRATION_URL=file:/absolute/path.db` |
| `npm run db:migrate-integration` | `INTEGRATION_MIGRATION_URL=file:/absolute/path.db` |
| `npm run db:migrate-vehicle-equipment` | `VEHICLE_EQUIPMENT_MIGRATION_URL=file:/absolute/test.db` |
| `npm run db:migrate-lighting-defaults` | `LIGHTING_MIGRATION_URL=file:/absolute/test.db` |
| `npm run db:migrate-wagon-variants` | `WAGON_VARIANTS_MIGRATION_URL=file:/absolute/path.db` |
| `npm run db:migrate-freight` | `FREIGHT_MIGRATION_URL=file:/absolute/path.db` |
| `npm run db:migrate-speed-profiles` | `SPEED_PROFILE_MIGRATION_URL=file:/absolute/path.db` |

Apply required migrations to a backed-up, intended database before deploying code
that depends on them. They are idempotent. Decoder migration preserves functions
and addresses and refuses to silently discard nonempty legacy train DCC values.
Integration migration adds the template flag and marks the specific known example.
Speed-profile migration adds current-profile storage without creating history.

`npm run db:seed`, `npm run db:scrape`, `npm run db:scrape-images`,
`npx tsx src/db/scrape-rady.ts` and `src/db/import-*.ts` are deliberate data-writing
maintenance commands, not setup or verification steps for an existing collection.
Some rebuild data; do not rerun them casually. The profile maintenance importer
refuses to replace an existing differing profile; see [integration](itrain-integration.md).

`node scripts/import-ex250-1992.mjs` previews the source-backed Ex 250 import;
`--apply` adds its catalog entries, owned models and formation in one transaction.
It reuses exact catalog/livery matches, refuses a conflicting existing train, and
does nothing on a verified repeat. Set `TRAIN_IMPORT_URL=file:/absolute/test.db`
for a disposable database. Back up the intended database and deploy the original
and enhanced image assets before applying to production. The manifest is
`src/db/data/ex250-1992.json`; it includes seasonal and route restrictions.

## Hosting and deployment

- Canonical app URL: https://vlacky.vostry.org; original alias: https://vlacky.vercel.app.
- Repository: https://github.com/simonvostry/vlacky; pushing `main` triggers a Vercel build.
- Vercel project: `vlacky`, personal scope `simonvostry-6617s-projects`.
- Manual deployment when needed: `vercel --prod --yes --scope simonvostry-6617s-projects`.
- Production data is in Turso; credentials are configured in Vercel and local ignored
  settings. Data-only updates appear without deploying application code.
- `vostry.org` uses the personal Cloudflare account for DNS and Webglobe as registrar.
  Vercel hosts the app. Confirm the personal account before DNS changes; never use
  the Salted/company account. Inspect current DNS instead of relying on historical
  record IDs or IP/target values copied into notes.
- Google callback/HTTPS on the custom domain were verified on 2026-09-13. Register
  exact callbacks before expecting OAuth on another host.

A successful direct deployment does not update Git. Record the commit and deployment
result when publishing. Keep image assets and their mapping together. `.vercelignore`
excludes credentials, local databases, masters and research artifacts from uploads;
`next.config.ts` traces original images into integration functions.

The last recorded MCP client/export origin uses the Vercel alias. Moving it to the
custom hostname remains a separate configuration task: verify `VLACKY_PUBLIC_URL`,
client URLs and source identity mappings together. Do not silently change identity
scope as part of documentation or styling work.

## Freight support migration

Before deploying freight support, back up the intended database and run
`npm run db:migrate-freight`. Override the target with
`FREIGHT_MIGRATION_URL=file:/absolute/test.db` for a disposable copy. The migration
adds `wagon_kind` to vehicles/catalog and `kind` to trains, defaults existing rows
to `passenger`, and is transactional and idempotent. It never rebuilds tables or
changes memberships, model identities, DCC settings or measured profiles.

After building, `npm run test:freight` exercises migration preservation and repeat
execution, owned freight creation, filtered collections, shared locomotive assembly,
legacy edits, authentication-compatible pages and snapshot classification. No sample
freight vehicles are inserted into the real collection.

## Wagon variant migration

Back up the intended database, then run `npm run db:migrate-wagon-variants` before
deploying dependent code. The migration adds a grouping table, nullable variant FK,
running number and nullable equipment flags. It groups only previously ungrouped
wagons with an exact match of image, dimensions, designation, operator, class/kind,
manufacturer/SKU, catalog/livery links and template status. Unpictured wagons remain
separate. Existing individual configuration and notes do not split an otherwise
identical variant. A repeat preserves existing grouping and intentional splits.
No vehicle or membership rows are deleted or renumbered.

After building, run `npm run test:wagon-variants`, `npm run test:freight`, decoder,
integration, speed-profile and authentication tests. The variant HTTP test uses a
disposable database to verify migration preservation/idempotence, gallery grouping,
individual and shared edits, guarded reduction, blank configuration for additional
copies, explicit selection, concurrent allocation, cross-train isolation and export.

The 2026-09-26 implementation was checked in an isolated browser against a disposable
copy of the collection: light/dark at 1440 and 390 px, gallery/detail/edit/train
screens, quantity increases, individual equipment edits and explicit piece selection.
Long compositions and the membership table scroll locally on narrow screens.
Private review captures and the database backup stay outside Git.

## Vehicle equipment migration

After the wagon-variant migration, back up the intended database and run
`npm run db:migrate-vehicle-equipment` before deploying code that reads the new
columns. `VEHICLE_EQUIPMENT_MIGRATION_URL=file:/absolute/test.db` targets a disposable
copy. The transactional, additive migration adds six boolean columns with false
defaults and 0/1 constraints. Only newly added coupler columns are initialized from
the legacy whole-wagon flag (unknown becomes false); subsequent runs preserve edits.
No IDs, variant memberships, decoder settings, profiles or train order are changed.

Validate with `npm run test:vehicle-equipment`, `npm run test:wagon-variants`,
freight, decoder, integration, speed-profile and authentication suites after building.
Check passenger/freight and locomotive editing in both themes/narrow layouts,
per-piece independence, copy defaults, mixed coupler ends, speaker-only wagons,
weathering and the train picker/placement hint against a disposable database.

`npm run db:migrate-lighting-defaults` converts only null general-lighting values to
false, preserving explicit Yes/No and all other data. Back up before applying. It
adds insert/update fallback triggers so legacy nullable tables default omitted/null
lighting to No without rebuilding vehicles or foreign keys. Fresh schemas have a
NOT NULL false default. The vehicle-equipment suite checks preservation, repeat
execution and legacy writes; the wagon-variant suite checks app defaults and copies.

## Vehicle length migration

Back up the intended database, then run `npm run db:migrate-vehicle-length` before
deploying code that reads this column. Use
`VEHICLE_LENGTH_MIGRATION_URL=file:/absolute/test.db` for disposable verification.
The migration only adds nullable `vehicles.length_over_buffers_mm` with a positive
numeric range constraint; repeats preserve existing values. It never parses notes,
converts prototype dimensions or changes other collection data. Backfilling model
lengths is a separate reviewed operation through the wagon storage boundary, with
sources retained in notes and uncertain/set-only measurements left unknown.

Run `npm run test:vehicle-length` and `npm run test:wagon-variants` after building;
the latter covers decimal API round-trips, null/omission, validation, variant edits,
copy inheritance, explicit new-variant creation and snapshot export. Check detail/edit pages in
both themes and a narrow viewport against a disposable collection.

## Epoch migration

Back up the intended database, then run `npm run db:migrate-epochs` before deploying
dependent code. `EPOCH_MIGRATION_URL=file:/absolute/test.db` selects a disposable
copy. The additive, transactional migration adds `epochs` and `epoch_notes` to
vehicles, catalog types and liveries; it is idempotent and makes no assignments.
Backfill is a separate reviewed operation following [the source policy](epochs.md).
Verify only these new fields changed, preserving all existing collection data.

Run `npm run test:epochs`, collection-filter and wagon-variant tests, plus the
integration/decoder/speed/freight HTTP suites after building. Browser review covers
multi-selection, source notes, catalog prefill, filtered liveries, remembered filters
and reset in light/dark and narrow layouts against a disposable database.

For wagon editor changes, `test:wagon-variants` checks both route types, field
isolation, shared propagation, catalog-link validation and rejection of mixed
payloads. `test:auth-http` includes both piece-edit routes. Review light/dark and
mobile editors through the actual pencils, including a stale piece form after
a shared edit. Inline row review also covers Save/Cancel without navigation,
multiple open drafts surviving another save, failed-save retry, quantity locking,
address validation/clearing and the DCC section updating without discarding its
open decoder draft. This separation requires no schema migration or collection rewrite.

Wagon-detail layout review additionally checks whole-row selection, Back/Forward,
direct URLs, retained piece/decoder drafts, decoder saves targeting the selected
physical ID, a single address readout, epoch badges, responsive artwork and edit
pencils on mouse hover, keyboard focus and touch. Use a disposable collection for
these writes; the layout change needs no production data migration.

## Owned descriptions and row actions

Run `npm run db:migrate-vehicle-descriptions` against the backed-up intended database
before deploying code reading `description` and `reference_notes`. Override with
`VEHICLE_DESCRIPTION_MIGRATION_URL=file:/absolute/disposable.db` for tests. The script
is additive/idempotent and leaves all original notes untouched. A reviewed content
cleanup may separately populate shared descriptions and preserve the full original
text as physical reference notes through the storage boundary; never infer missing
seat counts or promote generated lettering to facts.

Run `npx tsx --test tests/vehicle-descriptions.test.ts`, wagon-variant, decoder,
freight, integration, speed-profile and auth HTTP suites. Browser checks cover plus,
duplicate with independent decoder IDs and copied addresses, pending drafts, deletion
confirmation/failure/membership guard, last-row navigation, single/multiple numbering,
header layout and visible descriptions in both themes and narrow viewports.


## Decoder catalog

Back up the intended database, then run `npm run db:migrate-decoder-catalog` before
deploying the decoder catalog. Use `DECODER_CATALOG_MIGRATION_URL=file:/absolute/test.db`
for disposable tests. The migration adds manufacturers/models and the nullable
installed decoder `catalog_model_id`, reusing normalized names from existing
configurations. It does not rewrite existing manufacturer/model text, addresses,
functions, CVs, vehicle IDs or speed profiles; repeating it is safe.

Run `npx tsx --test tests/decoder-catalog.test.ts`, decoder, wagon-variant, freight,
integration, speed-profile and auth HTTP suites. Browser review covers dependent
selectors, new and duplicate catalog entries, unknown selections, loading/retry,
optional function labels, advanced disclosure and preserved CVs, both themes and
narrow layouts. Tests and browser writes use disposable databases only.

Unified wagon editing requires no migration. Run decoder and wagon-variant HTTP
suites (including atomic combined-save rollback), auth HTTP, integration and profile
checks. Browser review should exercise combined Save/Cancel, multiple drafts,
selection, failed-save retry, the three-state coupler count and stable toggle widths, inline deletion No/Escape/
Yes/error, decoder removal, and the compact desktop/narrow layout in both themes.

For applying wagon settings to siblings, wagon-variant HTTP tests cover exact-target
validation, cross-variant rejection, transactional rollback, independent decoder IDs,
replacement by empty values and preservation of identities, memberships and profiles.
Run auth HTTP checks for the new endpoint and browser-check confirmation No/Escape/Yes,
open-draft locking, failure/retry, updated summaries and single-wagon visibility in
both themes and narrow viewports, using a disposable collection only.

Mutation-response freshness is checked by reading a configuration inside an open
write transaction while another connection still sees old values, and by verifying
the copy response contains the newly saved flags, addresses and decoder records.
Browser checks should compare all affected icons and function summaries immediately
after confirmation, including newly opened editors, without page navigation.
