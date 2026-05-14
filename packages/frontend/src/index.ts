import { Classic } from "@caido/primevue";
import { createPinia } from "pinia";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import DialogService from "primevue/dialogservice";
import ToastService from "primevue/toastservice";
import { createApp } from "vue";

import { SDKPlugin } from "./plugins/sdk";
import { useOastStore } from "./stores/oastStore";
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

  // Add a sidebar item.
  // Register BEFORE addPage so the badge handle exists when onEnter fires —
  // Caido may invoke onEnter synchronously on initial navigation.
  const oastSidebarItem = sdk.sidebar.registerItem("OmniOAST", "/omnioast", {
    icon: "fas fa-satellite-dish",
  });
  (window as { oastSidebarItem?: unknown }).oastSidebarItem = oastSidebarItem;

  // Pinia store is initialized once App's setup runs (during app.mount above),
  // so the store is safe to access here.
  const oastStore = useOastStore(pinia);

  // Add the page to the navigation. onEnter is Caido's canonical signal for
  // page entry — more reliable than DOM observers in App.vue.
  sdk.navigation.addPage("/omnioast", {
    body: root,
    onEnter: () => {
      oastStore.setPluginVisible(true);
      oastStore.clearUnreadCount();
    },
  });

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
      const pollAllTabsFunction = (
        window as { omnioastPollAllTabs?: () => void }
      ).omnioastPollAllTabs;
      if (typeof pollAllTabsFunction === "function") {
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
  sdk.shortcuts.register("omnioast.goToOmniOAST", ["cmd", "shift", "O"]);
  sdk.shortcuts.register("omnioast.pollAllTabs", []);
};
