import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const tsFiles = ['packages/*/src/**/*.ts', 'packages/*/tests/**/*.ts'];
const typedConfigs = tseslint.configs.recommendedTypeChecked.map((config) => ({
  ...config,
  files: tsFiles,
}));

export default tseslint.config(
  {
    ignores: ['**/coverage/**', '**/dist/**', '**/node_modules/**', 'packages/client/**'],
  },
  js.configs.recommended,
  ...typedConfigs,
  {
    files: tsFiles,
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        project: ['./packages/*/tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      'no-console': ['warn', { allow: ['log', 'error'] }],
    },
  },
);
