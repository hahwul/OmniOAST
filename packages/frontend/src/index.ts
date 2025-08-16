import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import DialogService from "primevue/dialogservice";
import ToastService from "primevue/toastservice";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import "./styles/index.css";
import type { FrontendSDK } from "./types";
import App from "./views/App.vue";

// This is the entry point for the frontend plugin
export const init = (sdk: FrontendSDK) => {
  const app = createApp(App);
  const pinia = createPinia();

  // Load the PrimeVue component library
  app.use(PrimeVue, {
    unstyled: true,
    pt: Classic,
  });

  app.use(ConfirmationService);
  app.use(ToastService);
  app.use(DialogService);
  app.use(pinia);

  // Provide the FrontendSDK
  app.use(SDKPlugin, sdk);

  // Create the root element for the app
  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  // Set the ID of the root element
  // Replace this with the value of the prefixWrap plugin in caido.config.ts
  // This is necessary to prevent styling conflicts between plugins
  root.id = `plugin--omnioast`;

  // Mount the app to the root element
  app.mount(root);

  // Add the page to the navigation
  // Make sure to use a unique name for the page
  sdk.navigation.addPage("/omnioast", {
    body: root,
  });

  // Add a sidebar item
  const oastSidebarItem = sdk.sidebar.registerItem("OmniOAST", "/omnioast", {
    icon: "fas fa-satellite-dish",
  });
  (window as any).oastSidebarItem = oastSidebarItem;

  // Register commands
  // Command to navigate to OmniOAST page
  sdk.commands.register("omnioast.goToOmniOAST", {
    name: "Go to OmniOAST",
    run: () => {
      sdk.navigation.goTo("/omnioast");
    },
    group: "OmniOAST",
  });

  // Command to poll all tabs
  sdk.commands.register("omnioast.pollAllTabs", {
    name: "Polling All Tabs",
    run: () => {
      // Get the global polling function via window
      const pollAllTabsFunction = (window as any).omnioastPollAllTabs;
      if (pollAllTabsFunction && typeof pollAllTabsFunction === "function") {
        pollAllTabsFunction();
      } else {
        console.warn("Poll all tabs function not available");
      }
    },
    group: "OmniOAST",
  });

  // Register commands in command palette
  sdk.commandPalette.register("omnioast.goToOmniOAST");
  sdk.commandPalette.register("omnioast.pollAllTabs");

  // Register keyboard shortcuts
  sdk.shortcuts.register("omnioast.goToOmniOAST", ["ctrl+shift+o"]);
  sdk.shortcuts.register("omnioast.pollAllTabs", ["ctrl+shift+p"]);
};
