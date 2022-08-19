<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import axios, { AxiosError, type AxiosResponse } from "axios";

const router = useRouter();

const userCredentials = reactive({
  username: "",
  password: "",
});

const errors: string[] = reactive([]);

async function processResponse(request: () => Promise<AxiosResponse>) {
  let response: AxiosResponse | undefined = undefined;

  try {
    response = await request();
  } catch (error) {
    if (error instanceof AxiosError) {
      const responseData: { message: string } = error.response?.data;

      if (responseData && responseData.message) {
        const errorMessages = Array.isArray(responseData.message)
          ? responseData.message
          : [responseData.message];

        for (const errorMessage of errorMessages) {
          errors.push(errorMessage);
        }
      }
    }
  }

  return response;
}

async function login() {
  const loginResponse = await processResponse(() =>
    axios.post("/login", userCredentials)
  );

  if (loginResponse?.status === 204) {
    await router.push({ name: "home" });
  }
}
</script>

<template>
  <h2>Login</h2>

  <ul v-show="errors.length" data-test="errors">
    <li v-for="(error, index) in errors" :key="`${error}-${index}`">
      {{ error }}
    </li>
  </ul>

  <form @submit.prevent="login">
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
