import axios from "axios";
import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";

import generateApplicationRoutes from "./routes";
import ClaxApplication from "./ClaxApplication.vue";
import { retryUnauthorizedRequestsAfterRefreshingAccessToken } from "./lib/axios/interceptors";
import { initializeUserInStoreIfAuthenticated } from "./lib/bootstrap";

import "./assets/main.css";

axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;
axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  undefined,
  retryUnauthorizedRequestsAfterRefreshingAccessToken()
);

const application = createApp(ClaxApplication);

application.use(createPinia());

await initializeUserInStoreIfAuthenticated();

application.use(
  createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: generateApplicationRoutes(),
  })
);

application.mount("#application");
