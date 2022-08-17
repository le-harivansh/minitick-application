import { createApp } from "vue";
import { createPinia } from "pinia";

import Application from "./ClaxApplication.vue";
import router from "./router";

import "./assets/main.css";

const application = createApp(Application);

application.use(createPinia());
application.use(router);

application.mount("#application");
