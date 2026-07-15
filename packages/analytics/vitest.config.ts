import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'https://www.website.com/test.html',
      },
    },
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.{spec,test}.ts', 'tests/**/*.{spec,test}.ts'],
    globals: true,
  },
})
