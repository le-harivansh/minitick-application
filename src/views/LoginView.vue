<script setup lang="ts">
import axios from "axios";
import ms from "ms";
import { reactive } from "vue";
import { useRouter } from "vue-router";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { nonThrowableRequest } from "../lib/request";
import {
  setTimeoutToRefreshAccessToken,
  setTimeoutToRefreshRefreshToken,
} from "../lib/token-refresh";
import { useMainStore } from "../stores/main";

const router = useRouter();
const mainStore = useMainStore();

const userCredentials = reactive({
  username: "",
  password: "",
});

const errors: string[] = reactive([]);

async function login() {
  errors.splice(0, errors.length);

  const { result: authenticationResult, errors: authenticationErrors } =
    await nonThrowableRequest(
      async () =>
        (
          await axios.post<{
            accessToken: { expiresAt: number };
            refreshToken: { expiresAt: number };
            passwordConfirmationToken: { expiresAt: number };
          }>("/login", userCredentials)
        ).data
    );

  if (authenticationErrors) {
    return authenticationErrors.forEach((authenticationError) =>
      errors.push(authenticationError)
    );
  }

  localStorage.setItem(
    ACCESS_TOKEN_EXPIRES_AT,
    authenticationResult.accessToken.expiresAt.toString()
  );
  localStorage.setItem(
    REFRESH_TOKEN_EXPIRES_AT,
    authenticationResult.refreshToken.expiresAt.toString()
  );
  localStorage.setItem(
    PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
    authenticationResult.passwordConfirmationToken.expiresAt.toString()
  );

  const { result: userData, errors: userQueryErrors } =
    await nonThrowableRequest(
      async () =>
        (
          await axios.get<{ id: string; username: string }>("/user")
        ).data
    );

  if (userQueryErrors) {
    return userQueryErrors.forEach((userQueryError) =>
      errors.push(userQueryError)
    );
  }

  mainStore.authenticatedUser.id = userData.id;
  mainStore.authenticatedUser.username = userData.username;

  setTimeoutToRefreshAccessToken(
    authenticationResult.accessToken.expiresAt -
      Date.now() -
      ms(import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD)
  );

  setTimeoutToRefreshRefreshToken(
    authenticationResult.refreshToken.expiresAt -
      Date.now() -
      ms(import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD)
  );

  return router.push({ name: "home" });
}
</script>

<template>
  <h2>Login</h2>

  <ul v-show="!!errors.length" data-test="errors">
    <li v-for="error in errors" :key="error">{{ error }}</li>
  </ul>

  <form @submit.prevent="login" data-test="login-form">
    <label for="username">Username:</label>
    <input
      type="text"
      id="username"
      v-model="userCredentials.username"
      autocomplete="username"
      required
    />

    <label for="password">Password:</label>
    <input
      type="password"
      id="password"
      v-model="userCredentials.password"
      autocomplete="current-password"
      required
    />

    <button type="submit" data-test="login-button">Login</button>
  </form>
</template>
