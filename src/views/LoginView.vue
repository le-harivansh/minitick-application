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
import { nonThrowableServerRequest } from "../lib/helpers";
import {
  setTimeoutToRefreshAccessToken,
  setTimeoutToRefreshRefreshToken,
} from "../lib/token/refresh";
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
    await nonThrowableServerRequest(() =>
      axios.post<{
        accessToken: { expiresAt: number };
        refreshToken: { expiresAt: number };
        passwordConfirmationToken: { expiresAt: number };
      }>("/login", userCredentials)
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
    await nonThrowableServerRequest(() =>
      axios.get<{ id: string; username: string }>("/user")
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
  <main class="flex flex-col space-y-4">
    <h2 class="font-heading text-4xl text-center font-semibold">Login</h2>

    <ul
      v-show="errors.length"
      class="px-2 flex flex-col"
      data-test="login-errors"
    >
      <li v-for="error in errors" :key="error" class="text-sm text-red-500">
        {{ error }}
      </li>
    </ul>

    <form
      @submit.prevent="login"
      class="flex flex-col space-y-2"
      data-test="login-form"
    >
      <section class="flex flex-col space-y-1">
        <label for="username" class="font-semibold">Username:</label>
        <input
          type="text"
          id="username"
          class="w-full px-2 py-1 rounded focus:outline-none focus:ring-2"
          placeholder="Your username"
          v-model="userCredentials.username"
          autocomplete="username"
          required
          autofocus
        />
      </section>

      <section class="flex flex-col space-y-1">
        <label for="password" class="font-semibold">Password:</label>
        <input
          type="password"
          id="password"
          class="w-full px-2 py-1 rounded focus:outline-none focus:ring-2"
          placeholder="Your password"
          v-model="userCredentials.password"
          autocomplete="current-password"
          required
        />
      </section>

      <section>
        <button
          type="submit"
          class="bg-sky-400 w-full mt-4 py-1 rounded text-white font-bold text-lg hover:shadow-md focus:outline-none"
          data-test="login-button"
        >
          Login
        </button>
      </section>
    </form>
  </main>
</template>
