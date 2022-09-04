import type { RouteRecordRaw } from "vue-router";
import { useMainStore } from "./stores/main";

export default function generateApplicationRoutes(): RouteRecordRaw[] {
  const mainStore = useMainStore();

  function redirectToHomeIfAuthenticated() {
    if (
      !!mainStore.authenticatedUser.id &&
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
    {
      path: "/profile",
      name: "profile",
      component: () => import("@/views/ProfileView.vue"),
      beforeEnter: redirectToLoginIfUnauthenticated,
    },
  ];
}
