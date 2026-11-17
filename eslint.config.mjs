import tseslint from 'typescript-eslint';

export default [
  { ignores: ['node_modules/**', 'dist/**', '.expo/**', 'artifacts/**', 'test-results/**', 'supabase/scan-roster-dashboard.ts'] },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
    rules: {
      'constructor-super': 'error', 'no-constant-condition': 'error',
      'no-dupe-else-if': 'error', 'no-duplicate-case': 'error',
      'no-unreachable': 'error', 'no-unsafe-finally': 'error',
      'valid-typeof': 'error', 'no-async-promise-executor': 'error',
      'no-promise-executor-return': 'error',
    },
  },
];
