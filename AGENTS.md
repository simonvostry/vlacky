# Working on Vlacky

Private Czech-language model train collection app. Next.js App Router, TypeScript,
Tailwind CSS, Drizzle and Turso/SQLite; use npm. UI copy stays Czech.

## Start here

- [README](README.md): project overview and documentation map.
- [Architecture](docs/architecture.md): current data model, routes and code ownership.
- [Development and operations](docs/operations.md): setup, tests, migrations and deployment.
- [Design and images](docs/design.md): approved themes, controls, layouts and artwork rules.
- [Authentication](docs/authentication.md): mandatory access boundaries.
- [iTrain integration](docs/itrain-integration.md): field ownership and preservation contract.
- [Decisions and open questions](docs/decisions.md): durable context and unresolved research.

Read the relevant topic before changing it. Current code and these focused docs
supersede old session transcripts and design studies. Keep each rule in its owning
document; do not append chronological handoffs or duplicate architecture here.

## Rules that must survive every change

- Require a user before page data access and authorize every data API handler.
  Proxy protection is additional, not sufficient. Exact integration routes use
  their own mandatory bearer authorization; never widen that exception to CRUD.
- Catalog types and liveries are reference data; `vehicles` are physical owned
  models. Preserve their IDs, catalog links and `isTemplate` when editing.
- Await all database operations so both SQLite and Turso work. DCC configuration
  belongs to the physical vehicle, not its train composition.
- Keep one current speed profile, no history. Preserve full stored/imported/exported
  precision; readouts use one decimal with a Czech comma. Retain both directions
  even when the display collapses them.
- Ordinary iTrain sync must preserve calibration, measured curves, IDs, unknown
  fields and layout/live state. Missing values never mean clear or delete. MCP
  is read-only; a profile restore needs a separately authorized, tested adapter.
- Use semantic theme roles and shared controls. Preserve the top navigation,
  accessible pencil edit actions and responsive locomotive image sizing.
- For an individual model's paint detail, create a unique asset and change only
  that vehicle's image path; never overwrite shared catalog artwork.
- Keep credentials, collection backups, personal source photos and local `output/`
  artifacts out of Git. Public repository assets are public even though the app
  requires login. Inspect staged paths before committing.
- Use disposable databases for tests. Do not run seed, scrape, import or schema
  commands against the real collection as part of routine verification.
- Use the personal Vercel project and personal Cloudflare account for this app;
  never use the company account. Pushes to `main` trigger production deployment.

## Finishing work

Run checks relevant to the change; [operations](docs/operations.md#validation)
lists them. For UI changes check both themes and a narrow viewport. Update the
owning documentation when behavior changes. Record uncertainty rather than
turning generated image text or unverified historical claims into collection facts.
