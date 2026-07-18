/// <reference types="vite/client" />

declare module '*.css' {}

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_ENDPOINT?: string
  readonly VITE_ANALYTICS_WRITE_KEY?: string
  readonly VITE_ANALYTICS_STATS_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
