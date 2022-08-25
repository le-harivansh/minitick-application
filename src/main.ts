import axios from "axios";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

import generateApplicationRoutes from "./routes";
import ClaxApplication from "./ClaxApplication.vue";
import { retryUnauthorizedRequestsAfterRefreshingAccessToken } from "./lib/axios-interceptors";

import "./assets/main.css";

axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;
axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  undefined,
  retryUnauthorizedRequestsAfterRefreshingAccessToken()
);

const application = createApp(ClaxApplication);

const pinia = createPinia();
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: generateApplicationRoutes(pinia),
});

application.use(pinia);
application.use(router);

application.mount("#application");
