<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { nonThrowableRequest } from "../lib/request";

const router = useRouter();

const userData = reactive({
  username: "",
  password: "",
});

const errors: string[] = reactive([]);

async function register() {
  errors.splice(0, errors.length);

  const { errors: registrationErrors } = await nonThrowableRequest(
    async () => (await axios.post<void>("/register", userData)).data
  );

  if (registrationErrors) {
    return registrationErrors.forEach((registrationError) =>
      errors.push(registrationError)
    );
  }

  return router.push({ name: "login" });
}
</script>

<template>
  <h2>Register</h2>

  <ul v-show="errors.length" data-test="errors">
    <li v-for="error in errors" :key="error">{{ error }}</li>
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
