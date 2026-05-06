/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RRRECIPE_IMPORT_API_URL?: string;
  readonly VITE_RRRECIPE_BACKLOG_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
