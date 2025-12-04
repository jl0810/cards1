import js from "@eslint/js";
import next from "eslint-config-next";
import tseslint from "typescript-eslint";

export default [
  // Base configs
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...next,

  // Ignores MUST come first
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'generated/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      '*.config.cjs',
      '*.config.mjs',
      'dist/**',
      '__tests__/**',
      '*.test.ts',
      '*.test.js',
      '*.test.tsx',
      'jest.setup.js',
      'playwright.config.ts',
      'next-env.d.ts',
      "__mocks__/**",
    ]
  },

  // TypeScript-specific configuration
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // 🔴 CRITICAL: Block explicit 'any' types (your global rules)
      '@typescript-eslint/no-explicit-any': 'error',

      // 🟡 HIGH PRIORITY: Type safety rules
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',

      // 🟢 MEDIUM: Code quality
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      }],
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Disable rules that conflict with Next.js/React patterns
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: {
          attributes: false, // Allow async event handlers in React
        },
      }],
      '@typescript-eslint/require-await': 'warn',

      // General code quality
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },
];
