/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * The url of the minitick server.
   */
  readonly VITE_SERVER_URL: string;

  /**
   * Refresh the access-token the specified amount of time before the
   * token expires.
   */
  readonly VITE_ACCESS_TOKEN_REFRESH_THRESHOLD: string;
  /**
   * Refresh the refresh-token the specified amount of time before the
   * token expires.
   */
  readonly VITE_REFRESH_TOKEN_REFRESH_THRESHOLD: string;

  /**
   * How long to wait before retrying to refresh a token if the refresh
   * operation fails.
   */
  readonly VITE_TOKEN_REFRESH_RETRY_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
