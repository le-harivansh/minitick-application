<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { nonThrowableServerRequest } from "../lib/helpers";
import ErrorList from "../components/ErrorList.vue";
import PasswordInput from "../components/PasswordInput.vue";

const router = useRouter();

const userData = reactive({
  username: "",
  password: "",
});

const errors: string[] = reactive([]);

async function register() {
  errors.splice(0, errors.length);

  const { errors: registrationErrors } = await nonThrowableServerRequest(() =>
    axios.post<void>("/register", userData)
  );

  if (registrationErrors) {
    return errors.push(...registrationErrors);
  }

  return router.push({ name: "login" });
}
</script>

<template>
  <main class="flex flex-col space-y-4">
    <h2 class="font-heading text-4xl text-center font-semibold">Register</h2>

    <ErrorList
      v-show="errors.length"
      :errors="errors"
      data-test="registration-errors"
    />

    <form
      @submit.prevent="register"
      class="flex flex-col space-y-2"
      data-test="registration-form"
    >
      <section class="flex flex-col space-y-1">
        <label for="username" class="font-semibold">Username:</label>
        <input
          type="text"
          id="username"
          class="w-full px-2 py-1 rounded focus:outline-none focus:ring-2"
          placeholder="Your new username"
          v-model="userData.username"
          pattern=".{4,}"
          title="The username should be at least 4 characters long"
          autocomplete="username"
          required
          autofocus
        />
      </section>

      <section class="flex flex-col space-y-1">
        <label for="password" class="font-semibold">Password:</label>
        <PasswordInput id="password" v-model="userData.password" />
      </section>

      <section>
        <button
          type="submit"
          class="bg-sky-400 w-full mt-4 py-1 rounded text-white font-bold text-lg hover:shadow-md focus:outline-none"
          data-test="register-button"
        >
          Register
        </button>
      </section>
    </form>
  </main>
</template>
