import type { Pinia } from "pinia";
import type { RouteRecordRaw } from "vue-router";
import { useMainStore } from "./stores/main";

export default function generateApplicationRoutes(
  applicationStore: Pinia
): RouteRecordRaw[] {
  const mainStore = useMainStore(applicationStore);

  function redirectToHomeIfAuthenticated() {
    if (
      !!mainStore.authenticatedUser.id ||
      !!mainStore.authenticatedUser.username
    ) {
      return { name: "home" };
    }
  }

  function redirectToLoginIfUnauthenticated() {
    if (
      !mainStore.authenticatedUser.id &&
      !mainStore.authenticatedUser.username
    ) {
      return { name: "login" };
    }
  }

  return [
    {
      path: "/register",
      name: "register",
      component: () => import("@/views/RegisterView.vue"),
      beforeEnter: redirectToHomeIfAuthenticated,
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      beforeEnter: redirectToHomeIfAuthenticated,
    },
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
      beforeEnter: redirectToLoginIfUnauthenticated,
    },
  ];
}
