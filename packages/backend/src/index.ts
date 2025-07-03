import type { DefineAPI } from "caido:plugin";

import type { BackendEvents, CaidoBackendSDK } from "../types";

import { getProviderService, initProviderService } from "./services/provider";
import { getSettingsService, initSettingsService } from "./services/settings";
import { type Provider, type Settings } from "./validation/schemas";

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
  // Expose OAST service related functionality
  registerAndGetPayload: (
    provider: Provider,
  ) => Promise<{ id: string; payloadUrl: string } | null>;
  getOASTEvents: (provider: Provider) => Promise<any[]>;

  // Settings API
  createSettings: (settings: Omit<Settings, "id">) => Promise<Settings | null>;
  getSettings: (id: string) => Promise<Settings | null>;
  getCurrentSettings: () => Promise<Settings | null>;
  updateSettings: (
    id: string,
    updates: Partial<Settings>,
  ) => Promise<Settings | null>;
  deleteSettings: (id: string) => Promise<boolean>;
  listSettings: () => Promise<Settings[]>;
}>;

// Accept sdk as CaidoBackendSDK to ensure compatibility with provider service
export function init(sdk: CaidoBackendSDK) {
  initProviderService(sdk);
  initSettingsService(sdk);
  const providerService = getProviderService();
  const settingsService = getSettingsService();

  (sdk as any).api?.register?.("createProvider", (...args: any[]) => {
    // Provider data is located at args[1]
    const provider = args[1];
    return providerService.createProvider(provider);
  });
  (sdk as any).api?.register?.("getProvider", (id: string) =>
    providerService.getProvider(id),
  );
  (sdk as any).api?.register?.("updateProvider", (...args: any[]) => {
    // If args[1] is an array, it has [id, updates] structure
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

  // Expose OAST service related functionality
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

  // Settings API registration
  (sdk as any).api?.register?.("createSettings", (...args: any[]) => {
    // Settings data is located at args[1]
    const settingsData = args[1];
    console.log("API createSettings received:", JSON.stringify(settingsData));

    // Type assertion and validation
    const settingsInput = settingsData as Record<string, any>;

    // Ensure we have primitive values
    const settings: Partial<Settings> = {
      pollingInterval: Number(settingsInput.pollingInterval || 30),
      maxPollingPeriod: String(settingsInput.maxPollingPeriod || "session"),
      payloadPrefix: settingsInput.payloadPrefix
        ? String(settingsInput.payloadPrefix)
        : "",
    };

    return settingsService.createSettings(settings);
  });
  (sdk as any).api?.register?.("getSettings", (...args: any[]) => {
    const id = args[1];
    console.log("API getSettings received id:", id);
    if (!id) {
      console.error("Invalid ID provided to getSettings");
      return null;
    }
    return settingsService.getSettings(String(id));
  });

  (sdk as any).api?.register?.("getCurrentSettings", () => {
    console.log("API getCurrentSettings called");
    return settingsService.getCurrentSettings();
  });
  (sdk as any).api?.register?.("updateSettings", (...args: any[]) => {
    // If args[1] is an array, it has [id, updates] structure
    let id, updates;
    if (args[1] && Array.isArray(args[1])) {
      [id, updates] = args[1];
    } else {
      id = args[1];
      updates = args[2];
    }

    console.log("API updateSettings received id:", id);
    console.log(
      "API updateSettings received updates:",
      JSON.stringify(updates),
    );

    if (!id) {
      console.error("Invalid ID provided to updateSettings");
      return null;
    }

    // Type assertion to avoid TypeScript errors
    const updateData = updates as Record<string, any>;

    // Ensure we have primitive values
    const safeUpdates: Partial<Settings> = {};
    if (updateData && typeof updateData === "object") {
      if (updateData.pollingInterval !== undefined) {
        safeUpdates.pollingInterval = Number(updateData.pollingInterval);
      }
      if (updateData.maxPollingPeriod !== undefined) {
        safeUpdates.maxPollingPeriod = String(updateData.maxPollingPeriod);
      }
      if (updateData.payloadPrefix !== undefined) {
        safeUpdates.payloadPrefix = String(updateData.payloadPrefix);
      }
    }

    return settingsService.updateSettings(String(id), safeUpdates);
  });
  (sdk as any).api?.register?.("deleteSettings", (...args: any[]) => {
    const id = args[1];
    console.log("API deleteSettings received id:", id);
    if (!id) {
      console.error("Invalid ID provided to deleteSettings");
      return false;
    }
    return settingsService.deleteSettings(String(id));
  });
  (sdk as any).api?.register?.("listSettings", () =>
    settingsService.listSettings(),
  );
}
