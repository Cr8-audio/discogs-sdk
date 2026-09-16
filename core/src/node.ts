/**
 * Node-only entry point: `@crate.ai/discogs-sdk/node`.
 *
 * Everything exported here may use Node built-ins (`node:http`, `node:url`).
 * Do not import this module from Cloudflare Workers, Deno Deploy, or the
 * browser — use the package root, which is free of Node built-ins.
 */
export { NodeAuth } from './auth/node';
export type { CallbackConfig } from './auth/types';
