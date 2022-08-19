import axios from "axios";
import { createApp } from "vue";
import { createPinia } from "pinia";

import ClaxApplication from "./ClaxApplication.vue";
import routes from "./routes";

import "./assets/main.css";
import { createRouter, createWebHistory } from "vue-router";

// [ axios ]

axios.defaults.baseURL = import.meta.env.VITE_SERVER_URL;

// [ vue application ]

const application = createApp(ClaxApplication);

application.use(createPinia());

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

application.use(router);

application.mount("#application");
