import { createPinia } from "pinia";

import PrimeVue from "primevue/config";
import Tooltip from "primevue/tooltip";
import { createApp } from "vue";
import { Classic } from "@caido/primevue";
import "@fortawesome/fontawesome-free/css/fontawesome.min.css";
import "@fortawesome/fontawesome-free/css/regular.min.css";
import "@fortawesome/fontawesome-free/css/solid.min.css";

import { SDKPlugin } from "./plugins/sdk";
import type { CaidoSDK } from "./types";
import App from "./views/App.vue";
import "./styles/style.css";

export const defineApp = (sdk: CaidoSDK) => {
  const app = createApp(App);

  const pinia = createPinia();
  app.use(pinia);

  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  return app;
};
