#!/usr/bin/env node
/**
 * Guards the package's central promise: the root entry runs in Cloudflare
 * Workers, Deno and browsers.
 *
 * Node built-ins are allowed only in the dedicated `node` entry. Before 3.0.0
 * `src/index.ts` re-exported `NodeAuth`, which put `require("http")` into
 * dist/index.js and quietly broke every edge consumer — this check exists so
 * that cannot regress.
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const EDGE_ENTRIES = [
  'dist/index.js',
  'dist/index.mjs',
  'dist/utils.js',
  'dist/utils.mjs',
];

// Matches `require("http")`, `require("node:http")`, `from "node:url"`, etc.
const BUILTIN = String.raw`(?:node:)?(?:http|https|url|fs|path|crypto|stream|net|tls|zlib|os|child_process|worker_threads|buffer)`;
const PATTERNS = [
  new RegExp(String.raw`require\(\s*["']${BUILTIN}["']\s*\)`, 'g'),
  new RegExp(String.raw`from\s*["']${BUILTIN}["']`, 'g'),
  new RegExp(String.raw`import\s*\(\s*["']${BUILTIN}["']\s*\)`, 'g'),
];

let failed = false;

for (const entry of EDGE_ENTRIES) {
  if (!existsSync(entry)) {
    console.error(`✗ ${entry} is missing — run \`pnpm build\` first.`);
    failed = true;
    continue;
  }

  const source = await readFile(entry, 'utf8');
  const hits = PATTERNS.flatMap((pattern) =>
    [...source.matchAll(pattern)].map((m) => m[0]),
  );

  if (hits.length > 0) {
    console.error(
      `✗ ${entry} references Node built-ins: ${[...new Set(hits)].join(', ')}`,
    );
    failed = true;
  } else {
    console.log(`✓ ${entry} is free of Node built-ins`);
  }
}

if (failed) {
  console.error(
    '\nEdge entries must not import Node built-ins. Move that code to src/node.ts.',
  );
  process.exit(1);
}
