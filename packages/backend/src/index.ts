import type { DefineAPI, SDK } from "caido:plugin";

import type { OASTHistory, OASTProvider } from "../../shared/src/types";

import { getOASTHistory, initHistoryService } from "./services/history";
import { getOASTProviders, saveOASTProviders } from "./stores/oast";

export type API = DefineAPI<{
  getOASTProviders: (sdk: SDK) => Promise<OASTProvider[]>;
  addOASTProvider: (sdk: SDK, provider: OASTProvider) => Promise<OASTProvider>;
  updateOASTProvider: (
    sdk: SDK,
    provider: OASTProvider,
  ) => Promise<OASTProvider>;
  deleteOASTProvider: (sdk: SDK, id: string) => Promise<{ id: string }>;
  getOASTHistory: (sdk: SDK, providerId: string) => Promise<OASTHistory[]>;
}>;

export function init(sdk: SDK<API>) {
  initHistoryService(sdk);

  // OAST Provider endpoints (all must use (sdk, ...args) signature)
  sdk.api.register("getOASTProviders", getOASTProviders);

  sdk.api.register("addOASTProvider", async (sdk, provider) => {
    const providers = await getOASTProviders(sdk);
    const normalizedProvider = {
      ...provider,
      token: provider.token ?? "",
      type: provider.type ?? "interactsh",
    };
    providers.push(normalizedProvider);
    await saveOASTProviders(sdk, providers);
    const allProviders = await getOASTProviders(sdk);
    const saved = allProviders.find((p: OASTProvider) => p.id === provider.id);
    return saved ?? normalizedProvider;
  });

  sdk.api.register("updateOASTProvider", async (sdk, provider) => {
    let providers = await getOASTProviders(sdk);
    providers = providers.map((p: OASTProvider) =>
      p.id === provider.id
        ? {
            ...provider,
            type: provider.type ?? "interactsh",
          }
        : p,
    );
    await saveOASTProviders(sdk, providers);
    return {
      ...provider,
      type: provider.type ?? "interactsh",
    };
  });

  sdk.api.register("deleteOASTProvider", async (sdk, id) => {
    let providers = await getOASTProviders(sdk);
    providers = providers.filter((p: OASTProvider) => p.id !== id);
    await saveOASTProviders(sdk, providers);
    return { id };
  });

  // OAST History endpoints (must use (sdk, ...args) signature)
  sdk.api.register("getOASTHistory", getOASTHistory);
}
