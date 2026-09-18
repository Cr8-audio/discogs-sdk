# @cr8.audio/discogs-sdk

## 3.0.0

### Major Changes

- 5b96c6b: The package is renamed to `@cr8.audio/discogs-sdk`, the root is now genuinely
  edge-safe, and the dependency-injection, search and storage defects that
  shipped with 2.x are fixed.

  ### Breaking changes
  - **The package is renamed.** `@crate.ai/discogs-sdk` is no longer maintained;
    this and all future releases ship as `@cr8.audio/discogs-sdk`, matching the
    `Cr8-audio` GitHub org and the `cr8.audio` domain. Version numbering
    continues from 2.4.1, so the first release under the new name is 3.0.0.

    ```diff
    - import { DiscogsSDK } from '@crate.ai/discogs-sdk';
    + import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
    ```

    ```bash
    pnpm remove @crate.ai/discogs-sdk && pnpm add @cr8.audio/discogs-sdk
    ```

  - **`NodeAuth` is no longer exported from the package root.** It imported
    `node:http`, which put `require("http")` into `dist/index.js` and broke every
    Cloudflare Workers / Deno / browser consumer that imported the root. Import it
    from the Node entry point instead:

    ```diff
    - import { NodeAuth } from '@crate.ai/discogs-sdk';
    + import { NodeAuth } from '@cr8.audio/discogs-sdk/node';
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

### Minor Changes

- 077e45e: Add Workers-safe Discogs rate-limit handling on `DefaultHttpClient`: honor `X-Discogs-Ratelimit*` headers, backoff/retry on 429 using `Retry-After` or remaining-window semantics, expose `getLastRateLimitInfo()` and typed `RateLimitError`. Fix root README StorageService ghost (document `DiscogsSDK` + `StorageAdapter` / `withCustomStorage`).

> **Renamed in 3.0.0.** Versions 2.4.1 and earlier were published as
> `@crate.ai/discogs-sdk`. The entries below predate the rename; version
> numbering continues unbroken across it.

## 2.4.0

### Minor Changes

- a1ccdfb: ci/cd bundler refactor better boilerplate for future endpoints
- 767f482: Search Endpoint
- a8652bb: user endpiont
- be3f153: bundle refactor new endpoints and ci/cd
- 89a7b92: refactor

### Patch Changes

- 72da33a: added new profile resources type to user identity type
- abe0ad0: Code clean up comments logs old code
- 767f482: a better CLI DX
- 28b9f81: upate auth request token and utils to store data
- c34f9c8: Search endpoint doesn't require use to be logged in
- 767f482: streamline DX
- 28b9f81: add optional callbackurl to getRequestToken
- 767f482: update README
- 767f482: Cosmetic 💅
- fc27c5f: removed DX from core
- 15a66ff: search update
- 28b9f81: updating getAccessToken
- 35d4bdb: readme update
- 3d56391: cosmetic
- 767f482: update readme
