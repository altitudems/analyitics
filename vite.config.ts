import { defineConfig } from 'vite-plus'

export default defineConfig({
  lint: {
    plugins: ['typescript'],
    ignorePatterns: ['**/dist/**', '**/coverage/**', '**/node_modules/**', 'apps/**/dist/**'],
    options: {
      typeAware: true,
      typeCheck: true,
    },
    overrides: [
      {
        files: ['**/*.{spec,test}.ts'],
        plugins: ['typescript', 'vitest'],
      },
    ],
  },
  fmt: {
    singleQuote: true,
    semi: false,
    printWidth: 120,
  },
  run: {
    cache: true,
  },
})
