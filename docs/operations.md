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

## Validation

```sh
npm run build
npm run test:theme
npm run test:train-display
npm run test:freight
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

For image changes, run `node scripts/check-train-image-edges.mjs`. For UI changes,
check both themes and mobile layouts; use the [design rules](design.md). Verify live
images with authentication, not an anonymous response that may be a login page.

## Database changes

Existing installations use additive migrations, not `db:push` as a replacement for
migration logic. These scripts load `.env.local`, so inspect the target before running.

| Command | Disposable/local target override |
| --- | --- |
| `npm run db:migrate-decoders` | `DECODER_MIGRATION_URL=file:/absolute/path.db` |
| `npm run db:migrate-integration` | `INTEGRATION_MIGRATION_URL=file:/absolute/path.db` |
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
