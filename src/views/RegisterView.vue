<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import axios, { AxiosError, type AxiosResponse } from "axios";

const router = useRouter();

const userData = reactive({
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
        for (const errorMessage of responseData.message) {
          errors.push(errorMessage);
        }
      }
    }
  }

  return response;
}

async function register() {
  const registerResponse = await processResponse(() =>
    axios.post("/register", userData)
  );

  if (registerResponse?.status === 204) {
    const loginResponse = await processResponse(() =>
      axios.post("/login", userData)
    );

    userData.username = "";
    userData.password = "";

    if (loginResponse?.status === 204) {
      await router.push({ name: "home" });
    }
  }
}
</script>

<template>
  <h2>Register</h2>

  <ul v-show="errors.length" data-test="errors">
    <li v-for="(error, index) in errors" :key="`${error}-${index}`">
      {{ error }}
    </li>
  </ul>

  <form @submit.prevent="register" data-test="register-form">
    <label for="username">Username:</label>
    <input
      type="text"
      id="username"
      v-model="userData.username"
      autocomplete="username"
      required
      pattern=".{4,}"
      title="The username should be at least 4 characters long"
    />

    <label for="password">Password:</label>
    <input
      type="password"
      id="password"
      v-model="userData.password"
      autocomplete="new-password"
      required
      pattern=".{8,}"
      title="The password should be at least 8 characters long"
    />

    <button type="submit" data-test="register-button">Register</button>
  </form>
</template>
