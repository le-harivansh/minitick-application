<script setup lang="ts">
import axios from "axios";
import ms from "ms";
import { onMounted } from "vue";
import { RouterLink, RouterView } from "vue-router";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "./lib/constants";
import { nonThrowableRequest } from "./lib/request";
import {
  refreshAccessTokenAndSaveExpiryToLocalStorage,
  refreshRefreshTokenAndSaveExpiryToLocalStorage,
  setTimeoutToRefreshAccessToken,
  setTimeoutToRefreshRefreshToken,
} from "./lib/token-refresh";
import { useMainStore } from "./stores/main";

const mainStore = useMainStore();

onMounted(async () => {
  const { result: userData, errors: userQueryErrors } =
    await nonThrowableRequest(
      async () =>
        (
          await axios.get<{ id: string; username: string }>("/user")
        ).data
    );

  if (userQueryErrors) {
    return;
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
    currentAccessTokenExpiresAt - accessTokenRefreshThreshold
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
    currentRefreshTokenExpiresAt - refreshTokenRefreshThreshold
  );
});
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'register' }">Register</RouterLink>
      <RouterLink :to="{ name: 'login' }">Login</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>
