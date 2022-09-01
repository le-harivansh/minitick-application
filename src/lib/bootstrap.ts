import axios from "axios";
import ms from "ms";
import { useMainStore } from "../stores/main";
import { ACCESS_TOKEN_EXPIRES_AT, REFRESH_TOKEN_EXPIRES_AT } from "./constants";
import { nonThrowableRequest } from "./helpers";
import {
  refreshAccessTokenAndSaveExpiryToLocalStorage,
  setTimeoutToRefreshAccessToken,
  refreshRefreshTokenAndSaveExpiryToLocalStorage,
  setTimeoutToRefreshRefreshToken,
} from "./token/refresh";

export async function initializeUserInStoreIfAuthenticated() {
  const mainStore = useMainStore();

  const { result: userData, errors: userQueryErrors } =
    await nonThrowableRequest(
      async () =>
        (
          await axios.get<{ id: string; username: string }>("/user")
        ).data
    );

  if (userQueryErrors) {
    return false;
  }

  mainStore.authenticatedUser.id = userData.id;
  mainStore.authenticatedUser.username = userData.username;

  // refresh access-token
  let currentAccessTokenExpiresAt = Number(
    localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)
  );
  const accessTokenRefreshThreshold = ms(
    import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
  );

  if (currentAccessTokenExpiresAt - accessTokenRefreshThreshold <= Date.now()) {
    currentAccessTokenExpiresAt =
      (await refreshAccessTokenAndSaveExpiryToLocalStorage()) ?? 0;
  }

  setTimeoutToRefreshAccessToken(
    currentAccessTokenExpiresAt - Date.now() - accessTokenRefreshThreshold
  );

  // refresh refresh-token
  let currentRefreshTokenExpiresAt = Number(
    localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)
  );
  const refreshTokenRefreshThreshold = ms(
    import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
  );

  if (
    currentRefreshTokenExpiresAt - refreshTokenRefreshThreshold <=
    Date.now()
  ) {
    currentRefreshTokenExpiresAt =
      (await refreshRefreshTokenAndSaveExpiryToLocalStorage()) ?? 0;
  }

  setTimeoutToRefreshRefreshToken(
    currentRefreshTokenExpiresAt - Date.now() - refreshTokenRefreshThreshold
  );
}
