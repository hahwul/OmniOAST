import { defineApp } from "./app";
import * as oastRepo from "./repositories/oast";
import type { CaidoSDK } from "./types";

export const init = (sdk: CaidoSDK) => {
  oastRepo.init(sdk);
  const app = defineApp(sdk);

  const root = document.createElement("div");
  Object.assign(root.style, {
    height: "100%",
    width: "100%",
  });

  console.log("Attempting to mount Vue app.");
  app.mount(root);

  sdk.navigation.addPage("/OmniOAST", {
    body: root,
  });

  sdk.sidebar.registerItem("OmniOAST", "/OmniOAST", {
    icon: "fas fa-satellite-dish",
  });
};
