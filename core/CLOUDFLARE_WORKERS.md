# Cloudflare Workers Compatibility Guide

`@cr8.audio/discogs-sdk` runs in Cloudflare Workers and other edge runtimes.

> **3.0.0 made this real.** Versions 2.3.x–2.4.x _documented_ edge safety, but
> `src/index.ts` still re-exported `NodeAuth`, so `dist/index.js` contained
> `require("http")` and bundlers pulled Node built-ins into every Workers build.
> In 3.0.0 `NodeAuth` moved to its own entry point and CI fails if a Node
> built-in ever reaches an edge entry again.

## What Changed

### Workers-Safe Auth (Default)

The default `Auth` class now works in edge runtimes:

- No Node.js `http` module dependency
- No Node.js `url` module dependency
- No `Buffer` assumptions

```typescript
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';

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

If you need the local callback server for CLI apps, import it from the Node
entry point — never from the package root:

```typescript
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
import { NodeAuth } from '@cr8.audio/discogs-sdk/node';

const sdk = new DiscogsSDK({ DiscogsConsumerKey, DiscogsConsumerSecret });
const auth = new NodeAuth(sdk.auth.base);

// This starts a local http server (Node.js only)
await auth.authenticate();
```

## Migration Guide

### If you only use getRequestToken/handleCallback/getUserIdentity

**No changes needed** - the default `Auth` class still exports these methods.

### Update the package name

```bash
pnpm remove @crate.ai/discogs-sdk && pnpm add @cr8.audio/discogs-sdk
```

Then update every import from `@crate.ai/discogs-sdk` to `@cr8.audio/discogs-sdk`.

### If you use authenticate() (local callback server)

Update your imports:

```typescript
// Before (2.x)
import { NodeAuth } from '@crate.ai/discogs-sdk';

// After (3.0.0)
import { NodeAuth } from '@cr8.audio/discogs-sdk/node';
```

### If you call search

`getSearchResults()` now returns the full Discogs payload instead of being
mistyped as an array:

```typescript
// Before (2.x) — the type lied; this was never the real response
const results = await sdk.search.getSearchResults({ query: 'rush' });

// After (3.0.0)
const { results, pagination } = await sdk.search.getSearchResults({
  query: 'rush',
});
```

## Cloudflare Workers Example

```typescript
// app/api/auth/discogs/request-token.ts
import { createFileRoute } from '@tanstack/react-router';
import { DiscogsSDK } from '@cr8.audio/discogs-sdk';
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

        const { verificationURL, requestTokens } =
          await sdk.auth.getRequestToken();

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

Node-only code lives behind the `./node` export condition, so a Workers bundle
that imports the package root can never reach it — no runtime detection, no
lazy imports, nothing for a bundler to guess at.

This is enforced, not just intended:

- ESLint blocks Node built-in imports everywhere except `src/node.ts` and `src/auth/node.ts`.
- `pnpm run check:bundle` scans the built `dist/index.*` and `dist/utils.*` for Node built-ins and fails CI if it finds any.

## Rate limiting

`DefaultHttpClient` is Workers-safe and:

- Parses `X-Discogs-Ratelimit`, `X-Discogs-Ratelimit-Used`, and `X-Discogs-Ratelimit-Remaining`
- On HTTP `429`, retries with backoff using `Retry-After` when present (otherwise remaining-window / exponential backoff)
- Optionally delays when remaining requests are near the limit
- Exposes `getLastRateLimitInfo()` and throws typed `RateLimitError` (with header metadata) when retries are exhausted

```typescript
import {
  DiscogsSDK,
  RateLimitError,
  isRateLimitError,
} from '@cr8.audio/discogs-sdk';

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
