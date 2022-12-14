<script setup lang="ts">
import axios from "axios";
import { reactive, ref, watch } from "vue";
import { nonThrowableServerRequest } from "../lib/helpers";
import ErrorList from "./ErrorList.vue";

const emit = defineEmits<{
  (event: "passwordConfirmed", expiresAt: number): void;
}>();

const isOpen = ref(false);
const password = ref("");
const errors = reactive<string[]>([]);

watch(isOpen, (isOpen) => {
  if (!isOpen) {
    password.value = "";
  }
});

async function confirmPassword() {
  errors.splice(0, errors.length);

  const {
    result: refreshPasswordConfirmationTokenResult,
    errors: refreshPasswordConfirmationTokenErrors,
  } = await nonThrowableServerRequest(() =>
    axios.post<{ expiresAt: number }>("/refresh/password-confirmation-token", {
      password: password.value,
    })
  );

  if (refreshPasswordConfirmationTokenErrors) {
    return refreshPasswordConfirmationTokenErrors.forEach(
      (refreshPasswordConfirmationTokenError) =>
        errors.push(refreshPasswordConfirmationTokenError)
    );
  }

  isOpen.value = false;

  emit("passwordConfirmed", refreshPasswordConfirmationTokenResult.expiresAt);
}
</script>

<template>
  <div>
    <button
      type="button"
      @click="isOpen = true"
      data-test="show-password-confirmation-modal-button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5 text-orange-300 hover:text-orange-500"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
        />
      </svg>
    </button>

    <teleport to="#application">
      <div
        v-if="isOpen"
        class="absolute top-0 left-0 w-full h-full sm:p-4 flex justify-center bg-slate-50"
        data-test="password-confirmation-modal"
      >
        <article
          class="max-w-sm p-2 flex-1 bg-slate-100 shadow-lg sm:rounded-lg"
        >
          <section class="flex justify-end mb-4">
            <button
              type="button"
              @click="isOpen = false"
              data-test="close-password-confirmation-modal-button"
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

            <ErrorList
              v-show="errors.length"
              :errors="errors"
              data-test="password-confirmation-errors"
            />

            <form
              @submit.prevent="confirmPassword"
              class="flex flex-col space-y-2"
              data-test="submit-confirm-password-form"
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
                  data-test="confirm-password-button"
                >
                  Confirm
                </button>
              </section>
            </form>
          </article>
        </article>
      </div>
    </teleport>
  </div>
</template>
