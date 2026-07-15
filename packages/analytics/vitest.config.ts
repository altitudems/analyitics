import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      happyDOM: {
        url: 'https://www.website.com/test.html',
      },
    },
    include: ['src/**/*.{spec,test}.ts', 'tests/**/*.{spec,test}.ts'],
    globals: true,
  },
})
