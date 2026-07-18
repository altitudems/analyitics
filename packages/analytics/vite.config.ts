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
        url: 'https://www.example.com/',
      },
    },
    include: ['src/**/*.{spec,test}.ts'],
    globals: true,
  },
})
