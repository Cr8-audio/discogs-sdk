---
"@cr8.audio/discogs-sdk": minor
---

Add Workers-safe Discogs rate-limit handling on `DefaultHttpClient`: honor `X-Discogs-Ratelimit*` headers, backoff/retry on 429 using `Retry-After` or remaining-window semantics, expose `getLastRateLimitInfo()` and typed `RateLimitError`. Fix root README StorageService ghost (document `DiscogsSDK` + `StorageAdapter` / `withCustomStorage`).
