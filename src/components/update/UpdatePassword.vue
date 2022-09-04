<script setup lang="ts">
import axios from "axios";
import { ref, reactive, watch, inject, type Ref, readonly } from "vue";
import { PASSWORD_IS_CONFIRMED } from "../../lib/constants";
import { nonThrowableRequest } from "../../lib/helpers";

const passwordIsConfirmed = readonly(
  inject(PASSWORD_IS_CONFIRMED) as Ref<boolean>
);

const currentlyEditing = ref(false);
const newPassword = ref("");
const errors = reactive<string[]>([]);

async function update() {
  errors.splice(0, errors.length);

  const { errors: updateErrors } = await nonThrowableRequest(
    async () =>
      (
        await axios.patch<void>("/user", { password: newPassword.value })
      ).data
  );

  if (updateErrors) {
    return updateErrors.forEach((updateError) => errors.push(updateError));
  }

  newPassword.value = "";
  currentlyEditing.value = false;
}

function cancelUpdate() {
  newPassword.value = "";
  currentlyEditing.value = false;
}

watch(passwordIsConfirmed, (value) => {
  if (!value) {
    errors.splice(0, errors.length);

    cancelUpdate();
  }
});
</script>

<template>
  <form @submit.prevent="update">
    <section class="flex flex-col space-y-1">
      <label for="update-password" class="font-semibold">Password:</label>
      <div class="flex space-x-1">
        <input
          type="password"
          id="update-password"
          class="w-full px-2 py-1 rounded focus:outline-none focus:ring-2"
          placeholder="* * * * * * * *"
          v-model="newPassword"
          pattern=".{8,}"
          title="The password should be at least 8 characters long"
          autocomplete="new-password"
          required
          :disabled="!currentlyEditing"
        />
        <template v-if="passwordIsConfirmed">
          <template v-if="!currentlyEditing">
            <button @click="currentlyEditing = true" data-test="edit-password">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5 text-orange-600"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                />
              </svg>
            </button>
          </template>
          <template v-else>
            <button
              type="submit"
              :class="[!!newPassword ? 'text-green-500' : 'text-slate-500']"
              :disabled="!newPassword"
              data-test="update-password"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </button>
            <button @click="cancelUpdate" data-test="cancel-password-edit">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="currentColor"
                class="w-5 h-5 text-red-500"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </template>
        </template>
      </div>
    </section>

    <ul
      v-show="errors.length"
      data-test="password-update-errors"
      class="px-2 flex flex-col"
    >
      <li v-for="error in errors" :key="error" class="text-sm text-red-500">
        {{ error }}
      </li>
    </ul>
  </form>
</template>
