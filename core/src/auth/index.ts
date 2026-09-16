/**
 * Auth module — web/edge-safe by default.
 *
 * `NodeAuth` (local OAuth callback server) is NOT exported here: it imports
 * `node:http`, which would pull Node built-ins into every bundle that touches
 * the package root. Import it from the dedicated Node entry point instead:
 *
 * ```ts
 * import { NodeAuth } from '@crate.ai/discogs-sdk/node';
 * ```
 */
export { Auth } from './web';
export * from './types';
