<script setup lang="ts">
import axios from "axios";
import { useRouter } from "vue-router";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  PASSWORD_IS_CONFIRMED,
  REFRESH_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { nonThrowableRequest } from "../lib/helpers";
import { useMainStore } from "../stores/main";
import PasswordConfirmationModal from "../components/PasswordConfirmationModal.vue";
import { onMounted, provide, ref } from "vue";
import UpdateUsername from "../components/update/UpdateUsername.vue";
import UpdatePassword from "../components/update/UpdatePassword.vue";

const router = useRouter();
const mainStore = useMainStore();

const passwordIsConfirmed = ref(false);

provide(PASSWORD_IS_CONFIRMED, passwordIsConfirmed);

onMounted(() => {
  const currentPasswordConfirmationTokenExpiresAt = Number(
    localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
  );

  if (currentPasswordConfirmationTokenExpiresAt <= Date.now()) {
    return;
  }

  passwordIsConfirmed.value = true;

  setTimeout(() => {
    passwordIsConfirmed.value = false;
  }, currentPasswordConfirmationTokenExpiresAt - Date.now());
});

function clearUserStateFromBrowser() {
  mainStore.authenticatedUser.id = null;
  mainStore.authenticatedUser.username = null;

  localStorage.removeItem(ACCESS_TOKEN_EXPIRES_AT);
  localStorage.removeItem(REFRESH_TOKEN_EXPIRES_AT);
  localStorage.removeItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT);

  clearTimeout(useMainStore().tokenTimers.accessToken ?? undefined);
  clearTimeout(useMainStore().tokenTimers.refreshToken ?? undefined);
}

/**
 * The value of `scope` should be equal to one of the values defined
 * on the server.
 */
async function logout(
  scope: "current-session" | "other-sessions" = "current-session"
) {
  const { errors } = await nonThrowableRequest(() =>
    axios.post<void>("/logout", { scope })
  );

  if (errors) {
    return;
  }

  clearUserStateFromBrowser();

  return router.push({ name: "login" });
}

async function deleteAccount() {
  const { errors: userDeletionErrors } = await nonThrowableRequest(() =>
    axios.delete<void>("/user")
  );

  if (userDeletionErrors) {
    return;
  }

  clearUserStateFromBrowser();

  return router.push({ name: "login" });
}

function passwordConfirmed(passwordConfirmationTokenExpiresAt: number) {
  passwordIsConfirmed.value = true;

  setTimeout(() => {
    passwordIsConfirmed.value = false;
  }, passwordConfirmationTokenExpiresAt - Date.now());
}
</script>

<template>
  <main class="flex flex-col space-y-4">
    <h2 class="font-heading text-2xl font-semibold">Profile</h2>

    <section class="flex flex-col space-y-1">
      <div class="flex justify-end">
        <PasswordConfirmationModal
          @password-confirmed="passwordConfirmed"
          v-show="!passwordIsConfirmed"
          title="Unlock"
        />
      </div>

      <section
        class="p-4 flex flex-col space-y-2 rounded border-2"
        :class="[
          passwordIsConfirmed
            ? 'border-red-500 bg-red-50'
            : 'border-slate-500 bg-slate-200',
        ]"
      >
        <UpdateUsername />
        <UpdatePassword />

        <button
          @click="logout('other-sessions')"
          class="py-1 text-white font-semibold rounded"
          :class="[
            passwordIsConfirmed ? 'bg-red-500 hover:shadow-md' : 'bg-gray-400',
          ]"
          :disabled="!passwordIsConfirmed"
          data-test="logout-other-sessions"
        >
          Log out of other sessions
        </button>

        <button
          @click="deleteAccount"
          class="py-1 text-white font-semibold rounded"
          :class="[
            passwordIsConfirmed ? 'bg-red-500 hover:shadow-md' : 'bg-gray-400',
          ]"
          :disabled="!passwordIsConfirmed"
          data-test="delete-account"
        >
          Delete Account
        </button>
      </section>
    </section>

    <button
      @click="logout('current-session')"
      class="py-1 bg-red-500 text-white font-semibold hover:shadow-md rounded"
      data-test="logout-current-session"
    >
      Log out
    </button>
  </main>
</template>
