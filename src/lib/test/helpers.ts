import { defineComponent } from "vue";
import type { RouteRecordRaw } from "vue-router";

export const stubbedRoutes: readonly RouteRecordRaw[] = [
  {
    path: "/register",
    name: "register",
    component: () => Promise.resolve(defineComponent({})),
  },
  {
    path: "/login",
    name: "login",
    component: () => Promise.resolve(defineComponent({})),
  },
  {
    path: "/",
    name: "home",
    component: () => Promise.resolve(defineComponent({})),
  },
  {
    path: "/profile",
    name: "profile",
    component: () => Promise.resolve(defineComponent({})),
  },
];
