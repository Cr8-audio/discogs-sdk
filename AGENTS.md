# discogs-sdk

`@crate.ai/discogs-sdk` — a TypeScript client for the Discogs API, published to npm from `core/`. Its primary consumer is the Crate Audio app (`Cr8-audio/app`), which deploys to Cloudflare Workers.

## Layout

| Path | What it is |
| ---- | ---------- |
| `core/` | The published package. All SDK work happens here. |
| `example/` | Runnable CLI examples; depends on `core/` via `link:../core`. |
| `.github/workflows/` | `main.yml` (CI on every branch + PR), `publish.yml` (changesets release from `main`). |

`core/` has its own `package.json` and lockfile — run `pnpm install` inside `core/`, not at the repo root.

## The one invariant: the package root is edge-safe

**The package root must never import a Node built-in.** Crate runs this SDK in Cloudflare Workers; a single `node:http` import in the root breaks every edge consumer.

This was broken for the whole 2.3.x–2.4.x line: `src/index.ts` re-exported `NodeAuth`, so `dist/index.js` contained `require("http")` while the docs promised Workers support. 3.0.0 fixed it and added two guards:

- **ESLint** (`no-restricted-imports`) blocks Node built-ins everywhere except `src/node.ts` and `src/auth/node.ts`.
- **`pnpm run check:bundle`** scans the *built* `dist/index.*` and `dist/utils.*` and fails CI if a built-in appears.

Node-only code goes in `src/auth/node.ts` and is exported from `src/node.ts` (`@crate.ai/discogs-sdk/node`). Never re-export it from `src/index.ts`.

## Architecture

Dependency injection throughout:

- `src/interfaces/` — the four contracts: `HttpClient`, `StorageAdapter`, `TokenManager`, `OAuthHandler`.
- `src/implementations/` — the `Default*` classes for each.
- `src/factories/discogsFactory.ts` — assembles a `BaseImplementation` from config.
- `src/base.ts` — `Base`/`BaseImplementation` hold config, generate the OAuth 1.0a header, and own `request()`.
- `src/{auth,collection,search,user}/` — resource classes, each constructed with a `BaseImplementation`.

`Auth` (`src/auth/web.ts`) is edge-safe. `NodeAuth` (`src/auth/node.ts`) adds the local callback server.

### Things that are easy to get wrong

- **`Base.request()` merges caller headers.** It only adds an `Authorization` header when the caller did not supply one. Resources that resolve their own credentials (Search's Basic-auth fallback) depend on this. Don't go back to building a fresh `Headers` from scratch — that silently dropped caller auth and `Content-Length` before 3.0.0.
- **OAuth signatures pair a token with *its own* secret.** Search once signed the access token with the request-token secret; Discogs rejects that.
- **Resources capture their base at construction.** `DiscogsSDK` takes either a config or a prebuilt `BaseImplementation`, and `base` is `readonly`. Reassigning `this.base` after construction leaves `auth`/`collection`/`search`/`user` pointing at the old one — that's the bug the `withCustom*` statics used to have.
- **Rate limits are handled in `DefaultHttpClient`**, which retries 429s and throws a typed `RateLimitError`. Resources should let it propagate; don't sniff `error.message` for `'429'`.

## Commands

Run from `core/`:

```bash
pnpm install
pnpm run test:run      # vitest once
pnpm test              # vitest watch
pnpm run typecheck     # tsc --noEmit (strict)
pnpm run lint          # eslint
pnpm run build         # tsup -> dist
pnpm run check:bundle  # assert edge entries are Node-free (needs a build first)
pnpm run ci            # everything CI runs
```

Always run `pnpm run ci` before opening a PR.

## Releasing

Releases go through **changesets** — never hand-edit `version` in `package.json`. (2.4.1 was hand-bumped; don't repeat that.)

```bash
cd core && pnpm exec changeset
```

Pick the bump, describe the change, commit the generated file in `core/.changeset/`. On merge to `main`, `publish.yml` opens a release PR or publishes.

Changesets live in `core/.changeset/` only. A stray `.changeset/` at the repo root is a mistake — changesets never looked there.

## Coordinating with the app

Breaking changes here break `Cr8-audio/app` at `app/api/auth/discogs/*` and `lib/api-clients/discogs/`. Publish the SDK first, then bump the app's pin deliberately — the app is on `^2.3.0` and will not pick up 3.x automatically.
