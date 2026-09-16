import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Package root — must stay free of Node built-ins (see scripts/check-bundle.mjs).
    index: 'src/index.ts',
    // Node-only entry: `@crate.ai/discogs-sdk/node`.
    node: 'src/node.ts',
    // Standalone utilities: `@crate.ai/discogs-sdk/utils`.
    utils: 'src/utils.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  outDir: 'dist',
  target: 'es2022',
  sourcemap: true,
  treeshake: true,
  clean: true,
});
