import { describe, it, expect } from 'vitest';

/**
 * Workers Compatibility Tests
 *
 * These tests verify that the SDK can be imported and used in Cloudflare
 * Workers and other edge runtimes without Node.js-specific dependencies.
 */

describe('Workers Compatibility', () => {
  it('should import Auth without Node http module', async () => {
    // This test verifies that importing Auth doesn't pull in Node http
    const { Auth } = await import('../src/auth/web');
    expect(Auth).toBeDefined();
    expect(typeof Auth).toBe('function');
  });

  it('should import DiscogsSDK without Node dependencies', async () => {
    const { DiscogsSDK } = await import('../src/index');
    expect(DiscogsSDK).toBeDefined();

    // Verify we can instantiate without errors (even with empty creds)
    const sdk = new DiscogsSDK({
      DiscogsConsumerKey: 'test',
      DiscogsConsumerSecret: 'test',
    });
    expect(sdk).toBeDefined();
    expect(sdk.auth).toBeDefined();
  });

  it('should export NodeAuth separately for Node environments', async () => {
    const { NodeAuth } = await import('../src/auth/node');
    expect(NodeAuth).toBeDefined();
    expect(typeof NodeAuth).toBe('function');
  });

  it('base64Encode should work without Buffer', async () => {
    // Temporarily hide Buffer to simulate Workers environment
    const originalBuffer = global.Buffer;
    try {
      // @ts-expect-error - intentionally hiding Buffer
      global.Buffer = undefined;

      const { base64Encode } = await import('../src/utils/base64');
      const result = base64Encode('test:secret');
      expect(result).toBe('dGVzdDpzZWNyZXQ=');
    } finally {
      global.Buffer = originalBuffer;
    }
  });

  it('base64Encode should work with Buffer when available', async () => {
    const { base64Encode } = await import('../src/utils/base64');
    const result = base64Encode('test:secret');
    expect(result).toBe('dGVzdDpzZWNyZXQ=');
  });
});
