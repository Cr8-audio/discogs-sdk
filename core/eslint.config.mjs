import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/** Node built-ins are allowed only in the dedicated Node entry points. */
const NODE_BUILTINS = [
  'http',
  'node:http',
  'https',
  'node:https',
  'url',
  'node:url',
  'fs',
  'node:fs',
  'path',
  'node:path',
  'crypto',
  'node:crypto',
  'stream',
  'node:stream',
  'net',
  'node:net',
  'tls',
  'node:tls',
  'os',
  'node:os',
  'child_process',
  'node:child_process',
  'buffer',
  'node:buffer',
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'coverage/**'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-restricted-imports': [
        'error',
        {
          paths: NODE_BUILTINS.map((name) => ({
            name,
            message:
              'The package root must run in Workers/edge runtimes. Put Node-only code in src/auth/node.ts and export it from src/node.ts.',
          })),
        },
      ],
    },
  },

  {
    // The Node entry points are the one place Node built-ins belong.
    files: ['src/node.ts', 'src/auth/node.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  {
    files: ['tests/**/*.ts', 'scripts/**/*.mjs', '*.config.ts', '*.config.mts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        global: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-restricted-imports': 'off',
    },
  },
);
