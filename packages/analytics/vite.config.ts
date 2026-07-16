import { defineConfig } from 'vite-plus'

export default defineConfig({
  pack: {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    outExtensions: ({ format }) => ({
      js: format === 'cjs' ? '.cjs' : '.js',
    }),
  },
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
