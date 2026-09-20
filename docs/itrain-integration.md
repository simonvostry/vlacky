# Vlacky → iTrain integration

Vlacky is the source of vehicle identities, decoder/function definitions, reference images and saved train compositions. Vlacky also stores the latest speed-profile backup per physical locomotive. iTrain remains the measurement and operational system; its applied speed profiles, stopping/braking calibration, detector offsets, layout definitions and live operating state are preserved during collection synchronization.

The hosted MCP server is **read-only**. It neither edits iTrain files nor programs hardware. Its contract is supplied in server initialization instructions, `get_sync_contract`, and every complete vehicle/train export. A future local iTrain updater must implement the preservation rules with tests; MCP instructions alone cannot constrain unrelated scripts or arbitrary XML edits.

## Connection

MCP URL: `https://vlacky.vercel.app/api/mcp`

Transport: stateless Streamable HTTP, including compatibility with 2025-era MCP clients. No local MCP process, Redis, or persistent server session is needed.

Authentication: dedicated `Authorization: Bearer <token>`. Configure `VLACKY_MCP_TOKEN` (at least 32 characters) on the server. The token has read access only to MCP, collection export and integration image downloads. It does not grant access to website CRUD APIs. Google login remains mandatory for the website. Tokens in URLs and browser cookies are not accepted as integration credentials. Missing server configuration denies all integration requests.

Codex configuration supports a remote MCP URL with a bearer environment variable, or private `http_headers`. The local Codex configuration is personal and must never be committed. A personal `vlacky` MCP entry can be used by Codex in the separate iTrain workspace. Restart the desktop app/reconnect MCP after adding it.

```toml
[mcp_servers.vlacky]
url = "https://vlacky.vercel.app/api/mcp"
bearer_token_env_var = "VLACKY_MCP_TOKEN"
```

For this environment, the token can instead be provisioned into the personal config's `http_headers` so a desktop app launched from Finder does not depend on shell environment inheritance. Restrict the personal config to mode 0600. Do not print its credentials in prompts, logs, exported JSON, or iTrain files.

Rotate/revoke by changing/removing `VLACKY_MCP_TOKEN` in Vercel and deploying, then updating the local credential. Preview deployments are inaccessible unless explicitly provisioned with their own token.

## Tools and HTTP downloads

| Tool | Result |
|---|---|
| `get_sync_contract` | Field ownership and mandatory preservation procedure |
| `list_vehicles` | Searchable locomotive/wagon summaries and stable IDs |
| `get_vehicle` | One vehicle, its decoders, functions and image manifests |
| `list_trains` | Composition summaries |
| `get_train` | Ordered composition plus complete referenced vehicles |
| `get_vehicle_image` | Original and PNG download URLs, dimensions and SHA-256 |
| `get_collection_snapshot` | Snapshot revision, counts, contract and bulk JSON download URL |

- `GET /api/integrations/v1/snapshot` returns the complete JSON document.
- `GET /api/integrations/v1/images/{vehicleId}?format=original` returns original image bytes.
- `GET /api/integrations/v1/images/{vehicleId}?format=png` returns PNG at native dimensions; animated source files use their first frame.
- All require the same bearer header. Image URLs contain no token. Download images to a persistent local folder and point iTrain to those local files. Verify checksums from the downloaded snapshot. Missing/unavailable source images mean keep the existing target image.
- A snapshot uses one read transaction for collection tables. `revision` is a SHA-256 over the exported content and image manifests, excluding `generatedAt`. If collection data changes between obtaining the manifest and downloading the snapshot, use the downloaded snapshot's revision and recompute the diff.
- A source ID such as `vlacky:vehicle:15` is stable within this collection (`source` URL). Keep these IDs and the database when migrating hosting; never remap by designation or address automatically.
- `isTemplate` marks samples. Samples are excluded by default; `includeTemplates=true` explicitly includes them. Any composition containing an excluded or missing vehicle is omitted in full and reported, never silently shortened. The vehicle edit form exposes the template checkbox.
- Decoder addresses are resolved: a decoder's own address wins, otherwise the vehicle default is used. Unknown addresses remain null. Function keys are scoped to the decoder. CVs, manuals and sound project names are under `referenceOnly`.
- Each train contains vehicle source IDs in order. Images belong to individual vehicles; a composed train image is not currently generated.

## Required local iTrain workflow

1. Read `get_sync_contract`, then download the relevant definitions or full snapshot and image assets.
2. Resolve each source ID to the existing iTrain object using a mapping scoped to the target project. Names and DCC addresses are not unique identities. Resolve ambiguity before changing anything.
3. Produce a diff for only the requested fields. Define an explicit allowlist for the installed iTrain version's XML paths. Treat absent/null values as unknown, not as a command to clear a target field.
4. Save and close the target project in iTrain before writing files. Back it up and verify its content hash still matches the file from which the diff was computed.
5. Patch existing objects. Never delete/recreate locomotives or regenerate the project to change names, images, addresses or functions. Preserve object IDs, cross-references, unknown XML elements/attributes, archive resources and all unmapped fields.
6. Verify **all measured speed profiles, forward/reverse speed-step tables, profiling measurements, braking/stopping calibration and detector offsets are unchanged**. Abort if this cannot be established. Verify unrelated layout and operating settings are unchanged. Applying the same source snapshot twice must produce no second diff.
7. Open and validate the result in iTrain offline. Report applied, unchanged, unsupported and conflicting fields.

Function labels/categories are source descriptions, not iTrain enum values. A version-specific adapter must map them explicitly. Unknown function types, multiple independent decoder arrangements, and decoder/address changes affecting the validity of existing calibration must be reported; never discard calibration to resolve them. Reprofiling is a separate user operation.

CV records are **not executable programming instructions** and must not be mapped onto measured speed curves. Saved train compositions are definitions, not commands to place/activate trains. The same physical vehicle may occur in multiple saved compositions; do not assume these can all operate simultaneously. Vehicle orientation is currently unspecified and must be preserved in iTrain.

## Maintenance and verification

Before deploying the schema change, run `npm run db:migrate-integration`. It adds `vehicles.is_template` without removing existing fields and marks only the known V160 example. Local tests use `INTEGRATION_MIGRATION_URL=file:/absolute/path.db`.

After `npm run build`, run `npm run test:integration`, `npm run test:decoders`, `npm run test:auth`, and `npm run test:auth-http`. Integration tests use disposable SQLite and a separate server, checking real MCP initialization/tools, token scope, ordered snapshots, sample exclusion, image bytes/checksums, traversal rejection, read-only behavior and the preservation contract. They do not test an iTrain XML updater because none is installed by this project yet.

Sources: [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp), [Vercel MCP deployment](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel), [iTrain 6 manual](https://berros.eu/download/6-0/iTrain%206%20Handbuch.pdf).

## Current speed-profile backup (2026-09-20)

Snapshot schema 1.1 adds `vehicles[].referenceOnly.speedProfile`; sync contract version 2 explicitly treats it as backup data, outside `allowedSourceFields`. The seven MCP tools remain read-only. A missing profile never means delete or reset calibration. Restoring a backup to iTrain is a separately authorized operation requiring a tested adapter; this release implements no iTrain writer or automatic importer.

`vehicle_speed_profiles` stores exactly one JSON profile per `vehicles.id`. New saves replace it atomically, without measurement history or decoder foreign keys. Decoder edits cannot delete a profile's captured configuration. Profile data includes a nullable calendar measurement date, measurement mode, primary direction, step mode, scale, prototype-equivalent km/h, both directional values (missing values stay null), notes and source/context snapshots. Original source XML/decimal evidence remains separate from subsequently edited current points.

The locomotive detail has a graph, exact values, metadata/value editing and JSON import/export. Equal directions use one curve/column. Single-direction measurements also default to the primary curve; differing stored values can be revealed without overwriting them. “Použít hlavní směr pro oba směry” is an explicit edit of both columns. Imported JSON is previewed in the form and saved only on submit. It must use this application's validated profile format; `.tcdz` files are not accepted directly yet.

Authenticated `GET/PUT /api/vozidla/[id]/rychlostni-profil` serves locomotives only. PUT takes `{profile, expectedUpdatedAt}`; pass null for the initial save or the token returned by GET for replacement. A stale token returns 409 without changing the current measurement. Ordinary Google-session authorization is required; the MCP bearer cannot write. Future automatic iTrain ingestion needs separately scoped authentication and explicit identity matching, not wider permissions for the existing token.

Run `npm run db:migrate-speed-profiles` before deploying this release. For disposable databases set `SPEED_PROFILE_MIGRATION_URL=file:/absolute/path.db`. The additive migration is idempotent. The first-import maintenance helper `npx tsx scripts/import-speed-profile.ts VEHICLE_ID PROFILE_JSON` requires an embedded matching source ID and refuses to replace differing existing data. Run `npm run test:speed-profiles` after building.

Brejlovec vehicle 36 is recorded as measured on **2026-09-19**, with a single-direction measurement confirmed by the owner. All 56 original saved values are preserved, including the small step-1 reverse difference. Source context contains settings captured from the saved project, not a claim that all were recorded at measurement time.
