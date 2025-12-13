/**
 * Web-safe base64 encoding utility
 * 
 * This module provides base64 encoding that works across Node.js and
 * Cloudflare Workers/Edge runtimes without assuming Buffer is available.
 */

/**
 * Encode a string to base64 using web-standard APIs when available,
 * falling back to Node's Buffer only if present.
 * 
 * @param input - The string to encode
 * @returns Base64-encoded string
 */
export function base64Encode(input: string): string {
  // Try web-standard approach first (works in Workers, Deno, modern browsers)
  if (typeof btoa === 'function') {
    try {
      // btoa expects a binary string, so encode to UTF-8 bytes first
      const bytes = new TextEncoder().encode(input);
      // Convert bytes to binary string
      const binaryString = Array.from(bytes, (byte) =>
        String.fromCharCode(byte),
      ).join('');
      return btoa(binaryString);
    } catch {
      // Fall through to Buffer if btoa fails
    }
  }

  // Fallback to Node's Buffer (only available in Node.js)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'utf-8').toString('base64');
  }

  throw new Error(
    'base64Encode: No base64 encoding method available (neither btoa nor Buffer found)',
  );
}

/**
 * Decode a base64 string using web-standard APIs when available,
 * falling back to Node's Buffer only if present.
 * 
 * @param input - The base64 string to decode
 * @returns Decoded string
 */
export function base64Decode(input: string): string {
  // Try web-standard approach first
  if (typeof atob === 'function') {
    try {
      const binaryString = atob(input);
      // Convert binary string back to UTF-8
      const bytes = Uint8Array.from(binaryString, (char) =>
        char.charCodeAt(0),
      );
      return new TextDecoder().decode(bytes);
    } catch {
      // Fall through to Buffer if atob fails
    }
  }

  // Fallback to Node's Buffer
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input, 'base64').toString('utf-8');
  }

  throw new Error(
    'base64Decode: No base64 decoding method available (neither atob nor Buffer found)',
  );
}
