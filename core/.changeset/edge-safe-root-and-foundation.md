---
'@crate.ai/discogs-sdk': major
---

Make the package root genuinely edge-safe, and fix the dependency-injection,
search and storage defects that shipped with 2.x.

### Breaking changes

- **`NodeAuth` is no longer exported from the package root.** It imported
  `node:http`, which put `require("http")` into `dist/index.js` and broke every
  Cloudflare Workers / Deno / browser consumer that imported the root. Import it
  from the Node entry point instead:

  ```diff
  - import { NodeAuth } from '@crate.ai/discogs-sdk';
  + import { NodeAuth } from '@crate.ai/discogs-sdk/node';
  ```

  A `check:bundle` step now fails CI if a Node built-in ever reaches an edge
  entry again, and ESLint blocks the import at the source.

- **The package now declares an `exports` map.** Public entry points are
  `.`, `./node` and `./utils`. Deep imports such as
  `@crate.ai/discogs-sdk/dist/auth` no longer resolve — every public type and
  class is re-exported from the root (`User` and the resource types are newly
  exported there).

- **`Search.getSearchResults()` returns the real API payload**,
  `{ pagination, results }`, instead of being mistyped as a bare array:

  ```diff
  - const results = await sdk.search.getSearchResults({ query: 'rush' });
  + const { results, pagination } = await sdk.search.getSearchResults({ query: 'rush' });
  ```

- **Minimum Node is now 20.**

### Fixes

- `DiscogsSDK.withCustomStorage()` and `withCustomDependencies()` reassigned
  `base` _after_ `auth` / `collection` / `search` / `user` were constructed, so
  the injected storage and HTTP client were silently ignored. Resources are now
  built from the correct base.
- `Base.request()` discarded caller-supplied headers, which killed Search's
  Basic-auth fallback and dropped `Content-Length` on collection writes. Caller
  headers are now preserved; an OAuth header is only added when absent.
- `Search` signed requests with the **access token** paired to the **request
  token secret** — a signature Discogs rejects. It now uses the access token
  secret, and `page` / `perPage` map onto `page` / `per_page`.
- `MemoryStorageAdapter.getItem()` returned a bare value instead of the
  `Promise<string | null>` its `StorageAdapter` interface declares.
- `Collection` detected rate limits with `error.message.includes('429')`, which
  downgraded the typed `RateLimitError` from `DefaultHttpClient`. It now
  propagates unchanged, retaining the rate-limit metadata.
- `SearchParams` gained `page` / `perPage`; `SearchResult` is now a real type
  rather than a three-field stub.

### Housekeeping

- TypeScript 5.9 with `strict` enabled, Node 22 types, Vitest 3, ESLint 9.
- CI runs format, typecheck, lint, test, build and the bundle check on Node 20
  and 22; releases go through the changesets action.
- `repository` / `bugs` / `homepage` now point at `Cr8-audio/discogs-sdk`.
- Builds emit source maps and set `sideEffects: false` for tree-shaking.
