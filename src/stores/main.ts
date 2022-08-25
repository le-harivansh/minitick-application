import { defineStore } from "pinia";
import { reactive } from "vue";

export const useMainStore = defineStore("main", () => {
  const authenticatedUser = reactive({
    id: null as string | null,
    username: null as string | null,
  });

  const tokenTimers = reactive({
    accessToken: null as NodeJS.Timeout | null,
    refreshToken: null as NodeJS.Timeout | null,
  });

  return {
    authenticatedUser,
    tokenTimers,
  };
});
