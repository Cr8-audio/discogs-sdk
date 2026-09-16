import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    // Package root — must stay free of Node built-ins (see scripts/check-bundle.mjs).
    index: 'src/index.ts',
    // Node-only entry: `@cr8.audio/discogs-sdk/node`.
    node: 'src/node.ts',
    // Standalone utilities: `@cr8.audio/discogs-sdk/utils`.
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
