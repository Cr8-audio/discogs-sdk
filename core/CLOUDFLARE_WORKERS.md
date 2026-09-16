# Cloudflare Workers Compatibility Guide

As of version 2.3.0, `@crate.ai/discogs-sdk` is fully compatible with Cloudflare Workers and other edge runtimes.

## What Changed

### Workers-Safe Auth (Default)
The default `Auth` class now works in edge runtimes:
- No Node.js `http` module dependency
- No Node.js `url` module dependency  
- No `Buffer` assumptions

```typescript
import { DiscogsSDK } from '@crate.ai/discogs-sdk';

// This now works in Cloudflare Workers!
const sdk = new DiscogsSDK({
  DiscogsConsumerKey: env.DISCOGS_CONSUMER_KEY,
  DiscogsConsumerSecret: env.DISCOGS_CONSUMER_SECRET,
  callbackUrl: 'https://your-app.com/api/auth/discogs/callback',
});

// These methods work in Workers
await sdk.auth.getRequestToken();
await sdk.auth.handleCallback({ oauthVerifier, oauthToken });
await sdk.auth.getUserIdentity();
```

### Node.js Local Server (NodeAuth)
If you need the local callback server for CLI apps, use `NodeAuth`:

```typescript
import { NodeAuth } from '@crate.ai/discogs-sdk';
import { BaseImplementation } from '@crate.ai/discogs-sdk';

const base = ...; // your BaseImplementation
const auth = new NodeAuth(base);

// This starts a local http server (Node.js only)
await auth.authenticate();
```

## Migration Guide

### If you only use getRequestToken/handleCallback/getUserIdentity
**No changes needed** - the default `Auth` class still exports these methods.

### If you use authenticate() (local callback server)
Update your imports:

```typescript
// Before
import { Auth } from '@crate.ai/discogs-sdk';
const auth = new Auth(base);
await auth.authenticate(); // Local server method

// After
import { NodeAuth } from '@crate.ai/discogs-sdk';
const auth = new NodeAuth(base);
await auth.authenticate(); // Still works
```

## Cloudflare Workers Example

```typescript
// app/api/auth/discogs/request-token.ts
import { createFileRoute } from '@tanstack/react-router';
import { DiscogsSDK } from '@crate.ai/discogs-sdk';
import { env } from 'cloudflare:workers';

export const Route = createFileRoute('/api/auth/discogs/request-token')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        
        const sdk = new DiscogsSDK({
          DiscogsConsumerKey: env.DISCOGS_CONSUMER_KEY,
          DiscogsConsumerSecret: env.DISCOGS_CONSUMER_SECRET,
          callbackUrl: `${origin}/api/auth/discogs/callback`,
        });

        const { verificationURL, requestTokens } = await sdk.auth.getRequestToken();

        // Set cookies and return authUrl
        return Response.json({ authUrl: verificationURL });
      },
    },
  },
});
```

## Technical Details

### Base64 Encoding
The SDK now uses web-standard `btoa`/`TextEncoder` for base64 encoding, with automatic fallback to Node's `Buffer` when available. This ensures compatibility across all runtimes.

### Fetch API
The `DefaultHttpClient` uses the standard `fetch` API, which is available in:
- Cloudflare Workers
- Deno
- Node.js 18+
- Modern browsers

### No Runtime Detection Required
The SDK uses conditional exports and lazy imports to ensure Workers builds never pull in Node-specific code, even at bundle time.

## Rate limiting

`DefaultHttpClient` is Workers-safe and:

- Parses `X-Discogs-Ratelimit`, `X-Discogs-Ratelimit-Used`, and `X-Discogs-Ratelimit-Remaining`
- On HTTP `429`, retries with backoff using `Retry-After` when present (otherwise remaining-window / exponential backoff)
- Optionally delays when remaining requests are near the limit
- Exposes `getLastRateLimitInfo()` and throws typed `RateLimitError` (with header metadata) when retries are exhausted

```typescript
import { DiscogsSDK, RateLimitError, isRateLimitError } from '@crate.ai/discogs-sdk';

const sdk = new DiscogsSDK({
  DiscogsConsumerKey: env.DISCOGS_CONSUMER_KEY,
  DiscogsConsumerSecret: env.DISCOGS_CONSUMER_SECRET,
  rateLimit: { maxRetries: 3, nearLimitThreshold: 1 },
});

try {
  await sdk.search.getSearchResults({ query: 'rush' });
} catch (err) {
  if (isRateLimitError(err)) {
    console.log(err.rateLimit.remaining, err.rateLimit.retryAfterSeconds);
  }
  throw err;
}
```

## Troubleshooting

### "Invalid consumer" error from Discogs
This means your consumer key/secret are incorrect, expired, or swapped. Verify in [Discogs developer settings](https://www.discogs.com/settings/developers).

### Cookies not working
Ensure you're setting cookies with:
- `httpOnly: true`
- `secure: true` for HTTPS origins
- `sameSite: 'lax'`

### OAuth callback fails
Double-check your `callbackUrl` matches the URL registered in your Discogs application settings.
