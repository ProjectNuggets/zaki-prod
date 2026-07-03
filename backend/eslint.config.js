import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'src/**/*.mjs'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'module', globals: { ...globals.node } },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      // Real-bug rules stay errors (0 hits today; they catch genuine future mistakes).
      'no-const-assign': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      // Pre-existing code smells across ~67k LOC → WARN, so the baseline exits 0 and
      // any NEW real error stands out. Track these for a future cleanup pass.
      'no-unreachable': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'no-empty': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
  {
    files: ['src/**/*.test.js', 'src/**/*.integration.test.js', 'src/**/*.pg.integration.test.js'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
  },
];
