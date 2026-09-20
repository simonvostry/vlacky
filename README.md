# Vlacky

A private Czech-language app for a model train collection: reference catalog and
livery variants, owned locomotives and wagons, train compositions, decoder/DCC
configuration, and current speed-profile backups from iTrain.

Live app: [vlacky.vostry.org](https://vlacky.vostry.org). Google sign-in is restricted
to the configured owner. The source repository is public; collection data and
credentials are not included.

## Development

```sh
npm ci
npm run dev
```

Configure authentication and a database first; see [setup and operations](docs/operations.md).
The app uses Next.js 16, React 19, TypeScript, Tailwind CSS v4 and Drizzle, with
Turso in production and a local SQLite fallback. Exact versions are in
[package.json](package.json).

## Documentation

| Document | Purpose |
| --- | --- |
| [AGENTS.md](AGENTS.md) | Concise instructions for coding agents |
| [Architecture](docs/architecture.md) | Current structure, data model, routes and components |
| [Operations](docs/operations.md) | Local setup, validation, migrations and deployment |
| [Design and images](docs/design.md) | Approved appearance and image handling |
| [Authentication](docs/authentication.md) | Google configuration and access enforcement |
| [iTrain integration](docs/itrain-integration.md) | Read-only MCP, exports and preservation rules |
| [Decisions](docs/decisions.md) | Durable decisions and unresolved collection research |
| [Theme review, 2026-09-20](docs/reviews/theme-2026-09-20.md) | Dated implementation verification |

These documents describe the current system. Detailed session transcripts,
rejected proposals, research captures and image masters remain local under the
ignored `output/` directory; they are historical evidence, not implementation
instructions. Database backups remain local under ignored `data/backups/`.
