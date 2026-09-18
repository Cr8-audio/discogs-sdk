# @cr8.audio/discogs-sdk

A TypeScript SDK for the Discogs API, built around dependency injection and safe to run at the edge.

> **Renamed in 3.0.0.** This package was previously published as
> `@crate.ai/discogs-sdk`, which is no longer maintained. Version numbering
> continues unbroken — 3.0.0 succeeds 2.4.1. See
> [CLOUDFLARE_WORKERS.md](./CLOUDFLARE_WORKERS.md) for the full migration.

## Features

- Full TypeScript types, `strict` throughout
- OAuth 1.0a authentication (request token → authorize → access token)
- **Edge-safe package root** — no Node built-ins, runs in Cloudflare Workers, Deno and browsers
- Pluggable storage, HTTP client, token manager and OAuth handler
- Discogs rate-limit handling: `429` backoff, `Retry-After`, typed `RateLimitError`
- Collection, search, user and identity endpoints

## Installation

```bash
pnpm add @cr8.audio/discogs-sdk
```

Requires Node 20+ (or any runtime with `fetch`, `Headers` and `URLSearchParams`).

## Entry points

| Import                         | Contents                                                                       | Runtime                       |
| ------------------------------ | ------------------------------------------------------------------------------ | ----------------------------- |
| `@cr8.audio/discogs-sdk`       | `DiscogsSDK`, `Auth`, `Collection`, `Search`, `User`, every interface and type | Workers, Deno, browsers, Node |
| `@cr8.audio/discogs-sdk/node`  | `NodeAuth` — OAuth with a local callback server                                | Node only                     |
| `@cr8.audio/discogs-sdk/utils` | `base64Encode`, error classes, rate-limit helpers                              | Workers, Deno, browsers, Node |

> The root never imports `node:http` or any other Node built-in. That invariant
> is enforced by ESLint and by `pnpm run check:bundle` in CI — if you need the
> local callback server, import `NodeAuth` from `/node`.

## Setup

1. Sign in to Discogs and open [developer settings](https://www.discogs.com/settings/developers).
2. Create a new application.
3. Copy your consumer key and secret.

## Basic usage

```typescript
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';

const sdk = new DiscogsSDK({
  DiscogsConsumerKey: 'your_consumer_key',
  DiscogsConsumerSecret: 'your_consumer_secret',
  callbackUrl: 'https://your-app.example/api/auth/discogs/callback',
  userAgent: 'YourApp/1.0 +https://your-app.example',
});

// 1. Send the user to Discogs to authorize.
const { verificationURL } = await sdk.auth.getRequestToken();

// 2. Discogs redirects back to your callbackUrl with oauth_token + oauth_verifier.
await sdk.auth.handleCallback({ oauthToken, oauthVerifier });

// 3. You are authenticated.
const identity = await sdk.auth.getUserIdentity();

const { results, pagination } = await sdk.search.getSearchResults({
  query: 'Dark Side of the Moon',
  type: 'release',
  perPage: 25,
});

const collection = await sdk.collection.getCollection({
  username: identity.username,
  page: 1,
  perPage: 50,
});
```

### Node CLI flow

For a script that can open a local callback server, use `NodeAuth`:

```typescript
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
import { NodeAuth } from '@cr8.audio/discogs-sdk/node';

const sdk = new DiscogsSDK({ DiscogsConsumerKey, DiscogsConsumerSecret });
const auth = new NodeAuth(sdk.auth.base);

await auth.authenticate(); // prints a URL, waits on http://localhost:4567/callback
const identity = await auth.getUserIdentity();
```

## Custom storage

Tokens live in memory by default, which is the right choice for a serverless
handler but means nothing survives a restart. Supply a `StorageAdapter` to
persist them:

```typescript
import { DiscogsSDK, type StorageAdapter } from '@cr8.audio/discogs-sdk';

class KvStorage implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    return (await KV.get(key)) ?? null;
  }
  async setItem(key: string, value: string): Promise<void> {
    await KV.put(key, value);
  }
  async removeItem(key: string): Promise<void> {
    await KV.delete(key);
  }
  async clear(): Promise<void> {
    /* ... */
  }
}

const sdk = DiscogsSDK.withCustomStorage(
  { DiscogsConsumerKey, DiscogsConsumerSecret },
  new KvStorage(),
);
```

To replace more than storage, build the whole dependency set:

```typescript
const sdk = DiscogsSDK.withCustomDependencies({
  DiscogsConsumerKey,
  DiscogsConsumerSecret,
  storage,
  httpClient,
  tokenManager,
  oauthHandler,
});
```

## Rate limits

`DefaultHttpClient` reads Discogs' `X-Discogs-Ratelimit*` headers, waits when the
window is nearly exhausted, and retries `429`s using `Retry-After` when present.
When retries run out it throws a typed `RateLimitError`:

```typescript
import { isRateLimitError } from '@cr8.audio/discogs-sdk';

try {
  await sdk.search.getSearchResults({ query: 'rush' });
} catch (error) {
  if (isRateLimitError(error)) {
    console.log('retry after', error.rateLimit.retryAfterSeconds, 'seconds');
  }
}
```

Tune the behaviour per client:

```typescript
const sdk = new DiscogsSDK({
  DiscogsConsumerKey,
  DiscogsConsumerSecret,
  rateLimit: { maxRetries: 5, minBackoffMs: 1_000 },
});
```

Search works signed-out through consumer-key Basic auth at 60 requests/minute;
authenticating with OAuth raises that to 240.

## API reference

### Authentication

```typescript
await sdk.auth.getAuthorizationUrl();
await sdk.auth.getRequestToken();
await sdk.auth.handleCallback({ oauthVerifier, oauthToken });
await sdk.auth.getUserIdentity();
```

### Collection

```typescript
await sdk.collection.getCollection({ username, page, perPage, folderId });
await sdk.collection.getFolders(username);
await sdk.collection.addToCollection(releaseId, folderId);
await sdk.collection.getCollectionSorted('artist', 'asc');
await sdk.collection.getCollectionByFormat('Vinyl');
```

### Search

```typescript
const { results, pagination } = await sdk.search.getSearchResults({
  query: 'Album Name',
  type: 'release',
  year: '1977',
  format: 'album',
  page: 1,
  perPage: 50,
});
```

### User

```typescript
await sdk.user.getUser({ username });
```

## Development

```bash
pnpm install
pnpm test          # watch
pnpm run test:run  # once
pnpm run ci        # format + typecheck + lint + test + build + bundle check
```

`pnpm run check:bundle` asserts the built edge entries contain no Node
built-ins. Add new Node-only code to `src/auth/node.ts` and export it from
`src/node.ts`.

## Examples

See the [example project](https://github.com/Cr8-audio/discogs-sdk/tree/main/example).

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
