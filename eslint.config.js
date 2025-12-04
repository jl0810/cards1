import js from '@eslint/js'
import next from 'eslint-config-next'

export default [
  js.configs.recommended,
  ...next,
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'generated/**',
      'coverage/**',
      '*.config.js',
      'dist/**',
      '__tests__/**',
      '*.test.ts',
      '*.test.js',
      '*.test.tsx'
    ]
  }
]
