<script setup lang="ts">
import axios from "axios";
import { reactive, ref, watch } from "vue";
import { PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT } from "../lib/constants";
import { nonThrowableRequest } from "../lib/helpers";

const emit = defineEmits<{
  (event: "passwordConfirmed", expiresAt: number): void;
}>();

const isOpen = ref(false);
const password = ref("");
const errors: string[] = reactive([]);

watch(isOpen, (value) => {
  if (!value) {
    password.value = "";
  }
});

async function confirmPassword() {
  errors.splice(0, errors.length);

  const {
    result: refreshPasswordConfirmationTokenResult,
    errors: refreshPasswordConfirmationTokenErrors,
  } = await nonThrowableRequest(
    async () =>
      (
        await axios.post<{ expiresAt: number }>(
          "/refresh/password-confirmation-token",
          { password: password.value }
        )
      ).data
  );

  if (refreshPasswordConfirmationTokenErrors) {
    return refreshPasswordConfirmationTokenErrors.forEach(
      (refreshPasswordConfirmationTokenError) =>
        errors.push(refreshPasswordConfirmationTokenError)
    );
  }

  localStorage.setItem(
    PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
    refreshPasswordConfirmationTokenResult.expiresAt.toString()
  );

  isOpen.value = false;

  emit("passwordConfirmed", refreshPasswordConfirmationTokenResult.expiresAt);
}
</script>

<template>
  <div>
    <button @click="isOpen = true" data-test="show-password-confirmation-modal">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5 text-orange-500"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
        />
      </svg>
    </button>

    <teleport to="body">
      <article
        v-if="isOpen"
        class="absolute top-0 left-0 w-full h-full p-2 bg-slate-100"
        data-test="password-confirmation-modal"
      >
        <section class="flex justify-end mb-4">
          <button
            @click="isOpen = false"
            data-test="close-password-confirmation-modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              class="w-6 h-6 text-red-500"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </section>
        <article class="flex flex-col">
          <h2 class="mb-4 font-heading text-2xl text-center font-semibold">
            Confirm your password
          </h2>

          <ul
            v-show="errors.length"
            data-test="errors"
            class="px-2 flex flex-col"
          >
            <li
              v-for="error in errors"
              :key="error"
              class="text-sm text-red-500"
            >
              {{ error }}
            </li>
          </ul>

          <form
            @submit.prevent="confirmPassword"
            class="flex flex-col space-y-2"
          >
            <section class="flex flex-col space-y-2">
              <label for="password" class="font-semibold">Password:</label>
              <input
                type="password"
                id="password"
                class="w-full p-2 rounded focus:outline-none focus:ring-2"
                placeholder="Your password"
                v-model="password"
                autocomplete="current-password"
                required
                autofocus
              />
            </section>

            <section>
              <button
                type="submit"
                class="bg-sky-400 w-full mt-4 py-1 rounded text-white font-bold text-lg hover:shadow-md focus:outline-none"
                data-test="confirm-password"
              >
                Confirm
              </button>
            </section>
          </form>
        </article>
      </article>
    </teleport>
  </div>
</template>
