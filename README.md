# Discogs SDK

The Discogs SDK (`@crate.ai/discogs-sdk`) authenticates with the Discogs API and accesses collection, search, and identity data.

The package root is Cloudflare Workers–safe: it imports no Node built-ins. The Node-only local OAuth callback server lives behind a separate entry point, `@crate.ai/discogs-sdk/node`.

# Getting Started

1. Sign in to Discogs and open [developer settings](https://www.discogs.com/settings/developers).
2. Click **New App**, fill out the form, and create the app.
3. Copy your consumer key and secret.
4. Install: `pnpm add @crate.ai/discogs-sdk` (Node 20+).

# Usage

```typescript
import { DiscogsSDK, StorageAdapter } from '@crate.ai/discogs-sdk';

const discogs = new DiscogsSDK({
  DiscogsConsumerKey: 'YOUR_CONSUMER_KEY',
  DiscogsConsumerSecret: 'YOUR_CONSUMER_SECRET',
  userAgent: 'YourApp/1.0 +https://example.com',
});

(async () => {
  try {
    const { verificationURL } = await discogs.auth.getRequestToken();
    console.log('Authorize at:', verificationURL);

    // After the user authorizes, complete the callback:
    // await discogs.auth.handleCallback({ oauthVerifier, oauthToken });

    const identity = await discogs.auth.getUserIdentity();
    console.log(identity);

    const { results, pagination } = await discogs.search.getSearchResults({
      query: 'rush',
      country: 'canada',
    });
    console.log(pagination.items, 'matches', results);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

## Entry points

| Import | Contents | Runtime |
| ------ | -------- | ------- |
| `@crate.ai/discogs-sdk` | `DiscogsSDK` and every resource, interface and type | Workers, Deno, browsers, Node |
| `@crate.ai/discogs-sdk/node` | `NodeAuth` — OAuth with a local callback server | Node only |
| `@crate.ai/discogs-sdk/utils` | `base64Encode`, error classes, rate-limit helpers | Workers, Deno, browsers, Node |

## Custom storage

Default storage is in-memory. Persist tokens with a `StorageAdapter` via `DiscogsSDK.withCustomStorage`:

```typescript
import { DiscogsSDK, StorageAdapter } from '@crate.ai/discogs-sdk';

class FileOrKvStorage implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    /* ... */
    return null;
  }
  async setItem(key: string, value: string): Promise<void> {
    /* ... */
  }
  async removeItem(key: string): Promise<void> {
    /* ... */
  }
  async clear(): Promise<void> {
    /* ... */
  }
}

const discogs = DiscogsSDK.withCustomStorage(
  {
    DiscogsConsumerKey: 'YOUR_CONSUMER_KEY',
    DiscogsConsumerSecret: 'YOUR_CONSUMER_SECRET',
  },
  new FileOrKvStorage(),
);
```

## Rate limits

`DefaultHttpClient` honors Discogs `X-Discogs-Ratelimit*` headers, backs off on `429` (using `Retry-After` when present), and exposes typed `RateLimitError` / `getLastRateLimitInfo()` for Workers callers. See [`core/CLOUDFLARE_WORKERS.md`](./core/CLOUDFLARE_WORKERS.md) and [`core/README.md`](./core/README.md).

## Repository layout

| Path | What it is |
| ---- | ---------- |
| `core/` | The published `@crate.ai/discogs-sdk` package |
| `example/` | Runnable CLI examples that link against `core/` |

## Contributing

See [CONTRIBUTING.md](./core/CONTRIBUTING.md) and [AGENTS.md](./AGENTS.md).
