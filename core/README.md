# @crate.ai/discogs-sdk

A TypeScript SDK for the Discogs API with dependency injection support.

## Features

- Full TypeScript support
- OAuth authentication with interactive flow
- Dependency injection for better testability
- Customizable storage adapters
- Comprehensive test coverage
- Collection management
- Search functionality
- Discogs rate-limit handling (429 backoff, typed `RateLimitError`)

## Installation

```bash
npm install @crate.ai/discogs-sdk
# or
pnpm add @crate.ai/discogs-sdk
# or
yarn add @crate.ai/discogs-sdk
```

## Setup

1. Sign in to Discogs and go to [developer settings](https://www.discogs.com/settings/developers)
2. Create a new application
3. Note your consumer key and secret

## Basic Usage

```typescript
import { DiscogsSDK } from '@crate.ai/discogs-sdk';

const sdk = new DiscogsSDK({
  DiscogsConsumerKey: 'your_consumer_key',
  DiscogsConsumerSecret: 'your_consumer_secret',
  callbackUrl: 'http://localhost:4567/callback',
  userAgent: 'YourApp/1.0 +https://github.com/yourusername/your-app',
});

// Get authorization URL
const authUrl = await sdk.auth.getAuthorizationUrl();
console.log('Please visit:', authUrl);

// After user authorizes, handle the callback with verifier
await sdk.auth.handleCallback({
  oauthVerifier: 'verifier_from_callback',
  oauthToken: 'token_from_callback',
});

// Get user identity
const identity = await sdk.auth.getUserIdentity();
console.log('Logged in as:', identity.username);

// Search for releases
const searchResults = await sdk.search.getSearchResults({
  query: 'Dark Side of the Moon',
  type: 'release',
});

// Get user's collection
const collection = await sdk.collection.getCollection({
  username: identity.username,
  page: 1,
  perPage: 50,
});
```

## Custom Storage

By default, the SDK uses in-memory storage. You can implement your own storage adapter:

```typescript
import { DiscogsSDK, StorageAdapter } from '@crate.ai/discogs-sdk';

class CustomStorage implements StorageAdapter {
  async getItem(key: string): Promise<string | null> {
    // Your implementation
  }

  async setItem(key: string, value: string): Promise<void> {
    // Your implementation
  }

  async removeItem(key: string): Promise<void> {
    // Your implementation
  }
}

const sdk = DiscogsSDK.withCustomStorage(
  {
    DiscogsConsumerKey: 'your_key',
    DiscogsConsumerSecret: 'your_secret',
    callbackUrl: 'your_callback',
    userAgent: 'YourApp/1.0',
  },
  new CustomStorage(),
);
```

## API Reference

### Authentication

```typescript
// Get authorization URL
const authUrl = await sdk.auth.getAuthorizationUrl();

// Handle OAuth callback
await sdk.auth.handleCallback({
  oauthVerifier: 'verifier',
  oauthToken: 'token',
});

// Get user identity
const identity = await sdk.auth.getUserIdentity();
```

### Collection

```typescript
// Get user's collection
const collection = await sdk.collection.getCollection({
  username: 'username',
  page: 1,
  perPage: 50,
});

// Get collection folders
const folders = await sdk.collection.getFolders('username');

// Add release to collection
await sdk.collection.addToCollection(releaseId, folderId);
```

### Search

```typescript
// Basic search
const results = await sdk.search.getSearchResults({
  query: 'Artist Name',
  type: 'release',
});

// Advanced search
const results = await sdk.search.getSearchResults({
  query: 'Album Name',
  type: 'release',
  year: '1977',
  format: 'album',
});
```

## Examples

For complete examples, check out our [example project](https://github.com/Crate-AI/discogs-sdk/tree/main/example).

## Contributing

Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT

## Authentication Flow

The SDK uses OAuth 1.0a for authentication. Here's a complete example:

```typescript
import { DiscogsSDK } from '@crate.ai/discogs-sdk';

const sdk = new DiscogsSDK({
    DiscogsConsumerKey: 'your_key',
    DiscogsConsumerSecret: 'your_secret',
    callbackUrl: 'http://localhost:4567/callback',
    userAgent: 'YourApp/1.0'
});

// 1. Get authorization URL
const authUrl = await sdk.auth.getAuthorizationUrl();
console.log('Visit:', authUrl);

// 2. Extract oauth_token from the URL
const oauthToken = new URL(authUrl).searchParams.get('oauth_token');

// 3. After user authorizes, they'll be redirected to your callback URL with:
// http://localhost:4567/callback?oauth_token=TOKEN&oauth_verifier=VERIFIER

// 4. Complete authentication with the verifier and token
await sdk.auth.handleCallback({
    oauthVerifier: 'verifier_from_callback_url',
    oauthToken: oauthToken
});

// 5. Get user identity
const identity = await sdk.auth.getUserIdentity();
console.log('Logged in as:', identity.username);
```

The callback URL will receive two parameters:
- `oauth_token`: Matches the token from step 2
- `oauth_verifier`: The verification code needed to complete authentication
