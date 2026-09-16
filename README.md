# Discogs SDK

The Discogs SDK (`@crate.ai/discogs-sdk`) authenticates with the Discogs API and accesses collection, search, and identity data. It is Cloudflare Workers–safe by default (Node-only local OAuth callback lives in opt-in `NodeAuth`).

# Getting Started

1. Sign in to Discogs and open [developer settings](https://www.discogs.com/settings/developers).
2. Click **New App**, fill out the form, and create the app.
3. Copy your consumer key and secret.
4. Install: `npm install @crate.ai/discogs-sdk`.

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

    const results = await discogs.search.getSearchResults({
      query: 'rush',
      country: 'canada',
    });
    console.log(results);
  } catch (error) {
    console.error('Error:', error);
  }
})();
```

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

## Contributing

See [CONTRIBUTING.md](./core/CONTRIBUTING.md).
