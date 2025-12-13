/**
 * Auth module - exports web-safe Auth class by default.
 * 
 * For Node.js-specific functionality (local callback server),
 * import NodeAuth from '@crate.ai/discogs-sdk/node' instead.
 */

export { Auth } from './web';
export { NodeAuth } from './node';
export * from './types';
