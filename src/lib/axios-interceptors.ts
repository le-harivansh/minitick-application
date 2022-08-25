import axios, { type AxiosError } from "axios";
import ms from "ms";
import { useMainStore } from "../stores/main";
import { ACCESS_TOKEN_EXPIRES_AT } from "./constants";
import { setTimeoutToRefreshAccessToken } from "./token-refresh";

export function retryUnauthorizedRequestsAfterRefreshingAccessToken() {
  const blacklistedRoutes = [
    "/login",
    "/refresh/access-token",
    "/refresh/refresh-token",
  ];

  let originalAxiosError: AxiosError | null = null;

  return async (error: AxiosError) => {
    if (originalAxiosError === null) {
      if (blacklistedRoutes.includes(error.config.url ?? "")) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401) {
        originalAxiosError = error;

        const { expiresAt: accessTokenExpiresAt } = (
          await axios.get<{ expiresAt: number }>("/refresh/access-token")
        ).data;

        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          accessTokenExpiresAt.toString()
        );

        clearTimeout(useMainStore().tokenTimers.accessToken ?? undefined);

        const accessTokenRefreshThreshold = ms(
          import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
        );

        setTimeoutToRefreshAccessToken(
          accessTokenExpiresAt - Date.now() - accessTokenRefreshThreshold
        );

        const axiosRequestConfig = originalAxiosError.config;

        originalAxiosError = null;

        return axios.request(axiosRequestConfig);
      }

      return Promise.reject(error);
    }

    const originalError = originalAxiosError;

    originalAxiosError = null;

    return Promise.reject(originalError);
  };
}
