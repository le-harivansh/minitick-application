import axios from "axios";
import ms from "ms";
import { useMainStore } from "../stores/main";
import { ACCESS_TOKEN_EXPIRES_AT, REFRESH_TOKEN_EXPIRES_AT } from "./constants";
import { nonThrowableRequest } from "./request";

export async function refreshAccessTokenAndSaveExpiryToLocalStorage() {
  const { result: refreshAccessTokenResult } = await nonThrowableRequest(
    async () =>
      (
        await axios.get<{ expiresAt: number }>("/refresh/access-token")
      ).data
  );

  if (refreshAccessTokenResult) {
    localStorage.setItem(
      ACCESS_TOKEN_EXPIRES_AT,
      refreshAccessTokenResult.expiresAt.toString()
    );

    return refreshAccessTokenResult.expiresAt;
  }
}

export async function refreshRefreshTokenAndSaveExpiryToLocalStorage() {
  const { result: refreshRefreshTokenResult } = await nonThrowableRequest(
    async () =>
      (
        await axios.get<{ expiresAt: number }>("/refresh/refresh-token")
      ).data
  );

  if (refreshRefreshTokenResult) {
    localStorage.setItem(
      REFRESH_TOKEN_EXPIRES_AT,
      refreshRefreshTokenResult.expiresAt.toString()
    );

    return refreshRefreshTokenResult.expiresAt;
  }
}

export function setTimeoutToRefreshAccessToken(initialTimeout: number) {
  const RETRY_AFTER_IF_REFRESH_FAILS = 1000 * 5; // the timeout to set if the token-refresh fails.
  const accessTokenRefreshThreshold = ms(
    import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
  );
  const mainStore = useMainStore();

  async function refreshAccessTokenCallback(): Promise<void> {
    const newAccessTokenExpiresAt =
      (await refreshAccessTokenAndSaveExpiryToLocalStorage()) ??
      Date.now() + accessTokenRefreshThreshold + RETRY_AFTER_IF_REFRESH_FAILS;

    mainStore.tokenTimers.accessToken = setTimeout(
      refreshAccessTokenCallback,
      newAccessTokenExpiresAt - Date.now() - accessTokenRefreshThreshold
    );
  }

  mainStore.tokenTimers.accessToken = setTimeout(
    refreshAccessTokenCallback,
    initialTimeout
  );
}

export async function setTimeoutToRefreshRefreshToken(initialTimeout: number) {
  const RETRY_AFTER_IF_REFRESH_FAILS = 1000 * 5; // the timeout to set if the token-refresh fails.
  const refreshTokenRefreshThreshold = ms(
    import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
  );
  const mainStore = useMainStore();

  async function refreshRefreshTokenCallback(): Promise<void> {
    const newRefreshTokenExpiresAt =
      (await refreshRefreshTokenAndSaveExpiryToLocalStorage()) ??
      Date.now() + refreshTokenRefreshThreshold + RETRY_AFTER_IF_REFRESH_FAILS;

    mainStore.tokenTimers.refreshToken = setTimeout(
      refreshRefreshTokenCallback,
      newRefreshTokenExpiresAt - Date.now() - refreshTokenRefreshThreshold
    );
  }

  mainStore.tokenTimers.refreshToken = setTimeout(
    refreshRefreshTokenCallback,
    initialTimeout
  );
}
