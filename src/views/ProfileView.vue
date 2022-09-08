<script setup lang="ts">
import axios from "axios";
import { useRouter } from "vue-router";
import { onMounted, reactive, ref, watch } from "vue";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { nonThrowableServerRequest } from "../lib/helpers";
import { useMainStore } from "../stores/main";
import PasswordConfirmationModal from "../components/PasswordConfirmationModal.vue";
import UpdateUserField from "../components/UpdateUserField.vue";

const router = useRouter();
const mainStore = useMainStore();

const passwordIsConfirmed = ref(false);

const errors = reactive<string[]>([]);

onMounted(() => {
  const currentPasswordConfirmationTokenExpiresAt = Number(
    localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
  );

  passwordIsConfirmed.value =
    currentPasswordConfirmationTokenExpiresAt > Date.now();

  if (passwordIsConfirmed.value) {
    setTimeout(() => {
      passwordIsConfirmed.value = false;
    }, currentPasswordConfirmationTokenExpiresAt - Date.now());
  }
});

watch(passwordIsConfirmed, (passwordIsConfirmed) => {
  if (!passwordIsConfirmed) {
    errors.splice(0, errors.length);
  }
});

function clearUserStateFromBrowser() {
  mainStore.authenticatedUser.id = null;
  mainStore.authenticatedUser.username = null;

  clearTimeout(mainStore.tokenTimers.accessToken ?? undefined);
  clearTimeout(mainStore.tokenTimers.refreshToken ?? undefined);

  mainStore.tokenTimers.accessToken = null;
  mainStore.tokenTimers.refreshToken = null;

  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT);
  localStorage.removeItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT);
}

/**
 * The value of `scope` should be equal to one of the values defined
 * on the server.
 */
async function logout(
  scope: "current-session" | "other-sessions" = "current-session"
) {
  const { errors: logoutErrors } = await nonThrowableServerRequest(() =>
    axios.post<void>("/logout", { scope })
  );

  if (logoutErrors) {
    return setErrors(logoutErrors);
  }

  if (scope === "current-session") {
    clearUserStateFromBrowser();

    return router.push({ name: "login" });
  }
}

async function deleteAccount() {
  const { errors: userDeletionErrors } = await nonThrowableServerRequest(() =>
    axios.delete<void>("/user")
  );

  if (userDeletionErrors) {
    return setErrors(userDeletionErrors);
  }

  clearUserStateFromBrowser();

  return router.push({ name: "register" });
}

function passwordConfirmed(passwordConfirmationTokenExpiresAt: number) {
  passwordIsConfirmed.value = true;

  localStorage.setItem(
    PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
    passwordConfirmationTokenExpiresAt.toString()
  );

  setTimeout(() => {
    passwordIsConfirmed.value = false;
  }, passwordConfirmationTokenExpiresAt - Date.now());
}

function setErrors(errorMessages: string[]) {
  errors.splice(0, errors.length);

  errors.push(...errorMessages);
}
</script>

<template>
  <main class="flex flex-col space-y-4">
    <h2 class="font-heading text-2xl font-semibold">Profile</h2>

    <ul
      v-if="errors.length"
      class="px-2 py-1 border-2 border-red-600 bg-red-50 rounded"
      data-test="profile-view-errors"
    >
      <li
        v-for="(errorMessage, index) in errors"
        :key="`${errorMessage}-${index}`"
        class="text-xs font-semibold text-gray-600 tracking-wide"
      >
        {{ errorMessage }}
      </li>
    </ul>

    <section class="flex flex-col space-y-1">
      <div class="flex justify-end">
        <PasswordConfirmationModal
          @password-confirmed="passwordConfirmed"
          v-show="!passwordIsConfirmed"
          data-test="password-confirmation-modal-component"
        />
      </div>

      <section
        class="p-4 flex flex-col space-y-2 rounded border-2"
        :class="[
          passwordIsConfirmed
            ? 'border-orange-400 bg-orange-50'
            : 'border-slate-500 bg-slate-200',
        ]"
      >
        <UpdateUserField
          :password-is-confirmed="passwordIsConfirmed"
          :field-initial-value="mainStore.authenticatedUser.username!"
          field-to-update="username"
          field-type="text"
          field-placeholder="Your new username"
          field-pattern=".{4,}"
          field-title="The username should be at least 4 characters long"
          field-autocomplete="username"
          @update-success="
            (newUsername) =>
              (mainStore.authenticatedUser.username = newUsername)
          "
          @update-failure="setErrors"
          data-test="update-username-field"
        >
          <template #label>Username:</template>
        </UpdateUserField>

        <UpdateUserField
          :password-is-confirmed="passwordIsConfirmed"
          field-to-update="password"
          field-type="password"
          field-placeholder="* * * * * * * *"
          field-pattern=".{8,}"
          field-title="The password should be at least 8 characters long"
          field-autocomplete="new-password"
          :clear-after-update="true"
          @update-failure="setErrors"
          data-test="update-password-field"
        >
          <template #label>Password:</template>
        </UpdateUserField>

        <button
          type="button"
          @click="logout('other-sessions')"
          class="py-1 text-white font-semibold rounded"
          :class="[
            passwordIsConfirmed ? 'bg-red-500 hover:shadow-md' : 'bg-gray-400',
          ]"
          :disabled="!passwordIsConfirmed"
          data-test="logout-other-sessions-button"
        >
          Log out of other sessions
        </button>

        <button
          type="button"
          @click="deleteAccount"
          class="py-1 text-white font-semibold rounded"
          :class="[
            passwordIsConfirmed ? 'bg-red-500 hover:shadow-md' : 'bg-gray-400',
          ]"
          :disabled="!passwordIsConfirmed"
          data-test="delete-account-button"
        >
          Delete Account
        </button>
      </section>
    </section>

    <button
      type="button"
      @click="logout('current-session')"
      class="py-1 bg-red-500 text-white font-semibold hover:shadow-md rounded"
      data-test="logout-current-session-button"
    >
      Log out
    </button>
  </main>
</template>
