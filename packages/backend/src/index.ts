import type { DefineAPI } from "caido:plugin";

import type { BackendEvents, CaidoBackendSDK } from "../types";

import { getProviderService, initProviderService } from "./services/provider";
import { type Provider } from "./validation/schemas";

export type { BackendEvents };

export type API = DefineAPI<{
  createProvider: (provider: Omit<Provider, "id" | "enabled">) => Promise<any>;
  getProvider: (id: string) => Promise<Provider | null>;
  updateProvider: (
    id: string,
    updates: Partial<Provider>,
  ) => Promise<Provider | null>;
  deleteProvider: (id: string) => Promise<boolean>;
  listProviders: () => Promise<Provider[]>;
  toggleProviderEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<Provider | null>;
  // OASTService 관련 기능 노출
  registerAndGetPayload: (
    provider: Provider,
  ) => Promise<{ id: string; payloadUrl: string } | null>;
  getOASTEvents: (provider: Provider) => Promise<any[]>;
}>;

// Accept sdk as CaidoBackendSDK for provider service compatibility
export function init(sdk: CaidoBackendSDK) {
  initProviderService(sdk);
  const providerService = getProviderService();

  (sdk as any).api?.register?.("createProvider", (...args: any[]) => {
    // provider 데이터는 args[1]에 위치
    const provider = args[1];
    return providerService.createProvider(provider);
  });
  (sdk as any).api?.register?.("getProvider", (id: string) =>
    providerService.getProvider(id),
  );
  (sdk as any).api?.register?.("updateProvider", (...args: any[]) => {
    // args[1]이 배열이면 [id, updates] 구조
    let id, updates;
    if (args[1] && Array.isArray(args[1])) {
      [id, updates] = args[1];
    } else {
      id = args[1];
      updates = args[2];
    }
    return providerService.updateProvider(id, updates);
  });
  (sdk as any).api?.register?.("deleteProvider", (...args: any[]) => {
    let id;
    if (args[1] && Array.isArray(args[1])) {
      [id] = args[1];
    } else {
      id = args[1];
    }
    return providerService.deleteProvider(id);
  });
  (sdk as any).api?.register?.("listProviders", () =>
    providerService.listProviders(),
  );
  (sdk as any).api?.register?.("toggleProviderEnabled", (...args: any[]) => {
    let id, enabled;
    if (args[1] && Array.isArray(args[1])) {
      [id, enabled] = args[1];
    } else {
      id = args[1];
      enabled = args[2];
    }
    return providerService.toggleProviderEnabled(id, enabled);
  });

  // OASTService 관련 기능 노출
  (sdk as any).api?.register?.(
    "registerAndGetPayload",
    async (...args: any[]) => {
      const provider = args[1];
      const service = providerService.getOASTService(provider);
      if (!service || !service.registerAndGetPayload) return null;
      return await service.registerAndGetPayload();
    },
  );

  (sdk as any).api?.register?.("getOASTEvents", async (...args: any[]) => {
    const provider = args[1];
    const service = providerService.getOASTService(provider);
    if (!service) return [];
    const data = await service.getEvents();
    return data;
  });
}
