import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'

const root = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  build: {
    lib: {
      entry: resolve(root, 'src/index.ts'),
      name: 'Analytics',
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
    },
    rollupOptions: {
      external: ['uuid', 'bowser', '@medv/finder'],
    },
    sourcemap: true,
    minify: false,
  },
  plugins: [
    dts({
      include: ['src'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts'],
      rollupTypes: true,
      tsconfigPath: resolve(root, 'tsconfig.json'),
    }),
  ],
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
