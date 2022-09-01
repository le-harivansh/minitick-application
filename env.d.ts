/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERVER_URL: string;

  readonly VITE_ACCESS_TOKEN_REFRESH_THRESHOLD: string;
  readonly VITE_REFRESH_TOKEN_REFRESH_THRESHOLD: string;

  readonly VITE_TOKEN_REFRESH_RETRY_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
