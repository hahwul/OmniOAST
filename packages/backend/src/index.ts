import type { DefineAPI } from "caido:plugin";

import type { BackendEvents, CaidoBackendSDK, OASTEvent } from "../types";

import { getProviderService, initProviderService } from "./services/provider";
import { getSettingsService, initSettingsService } from "./services/settings";
import { type Provider, type Settings } from "./validation/schemas";

export type { BackendEvents };

export type API = DefineAPI<{
  createProvider: (
    provider: Omit<Provider, "id" | "enabled">,
  ) => Promise<Provider | null>;
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
  getOASTEvents: (provider: Provider) => Promise<OASTEvent[]>;

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

// What each handler is called with: the SDK, then the caller's arguments.
// Handlers that take an id also accept the arguments packed into one array.
type CreateProviderArgs = [unknown, Omit<Provider, "id" | "enabled">];
type UpdateProviderArgs = [
  unknown,
  string | [string, Partial<Provider>],
  Partial<Provider>,
];
type DeleteProviderArgs = [unknown, string | [string]];
type ToggleArgs = [unknown, string | [string, boolean], boolean];
type ProviderArgs = [unknown, Provider];
type CreateSettingsArgs = [unknown, Omit<Settings, "id">];
type IdArgs = [unknown, string];
type UpdateSettingsArgs = [
  unknown,
  string | [string, Partial<Settings>?],
  Partial<Settings>?,
];

// Accept sdk as CaidoBackendSDK to ensure compatibility with provider service
export function init(sdk: CaidoBackendSDK) {
  initProviderService(sdk);
  initSettingsService(sdk);
  const providerService = getProviderService();
  const settingsService = getSettingsService();

  sdk.api?.register?.("createProvider", (...args: CreateProviderArgs) => {
    // Provider data is located at args[1]
    const provider = args[1];
    return providerService.createProvider(provider);
  });
  sdk.api?.register?.("getProvider", (_sdk: unknown, id: string) =>
    providerService.getProvider(id),
  );
  sdk.api?.register?.("updateProvider", (...args: UpdateProviderArgs) => {
    // If args[1] is an array, it has [id, updates] structure
    let id, updates;
    if (Array.isArray(args[1])) {
      [id, updates] = args[1];
    } else {
      id = args[1];
      updates = args[2];
    }
    return providerService.updateProvider(id, updates);
  });
  sdk.api?.register?.("deleteProvider", (...args: DeleteProviderArgs) => {
    let id;
    if (Array.isArray(args[1])) {
      [id] = args[1];
    } else {
      id = args[1];
    }
    return providerService.deleteProvider(id);
  });
  sdk.api?.register?.("listProviders", () => providerService.listProviders());
  sdk.api?.register?.("toggleProviderEnabled", (...args: ToggleArgs) => {
    let id, enabled;
    if (Array.isArray(args[1])) {
      [id, enabled] = args[1];
    } else {
      id = args[1];
      enabled = args[2];
    }
    return providerService.toggleProviderEnabled(id, enabled);
  });

  // Expose OAST service related functionality
  sdk.api?.register?.(
    "registerAndGetPayload",
    async (...args: ProviderArgs) => {
      const provider = args[1];
      const service = providerService.getOASTService(provider);
      if (!service || !service.registerAndGetPayload) return null;
      return await service.registerAndGetPayload();
    },
  );

  sdk.api?.register?.("getOASTEvents", async (...args: ProviderArgs) => {
    const provider = args[1];
    const service = providerService.getOASTService(provider);
    if (!service) return [];
    const data = await service.getEvents();
    return data;
  });

  // Settings API registration
  sdk.api?.register?.("createSettings", (...args: CreateSettingsArgs) => {
    // Settings data is located at args[1]
    const settingsInput = args[1];

    // Ensure we have primitive values
    const settings: Partial<Settings> = {
      pollingInterval: Number(settingsInput.pollingInterval || 30),
      payloadPrefix: settingsInput.payloadPrefix
        ? String(settingsInput.payloadPrefix)
        : "",
    };

    return settingsService.createSettings(settings);
  });
  sdk.api?.register?.("getSettings", (...args: IdArgs) => {
    const id = args[1];
    if (!id) {
      return null;
    }
    return settingsService.getSettings(String(id));
  });

  sdk.api?.register?.("getCurrentSettings", () => {
    return settingsService.getCurrentSettings();
  });
  sdk.api?.register?.("updateSettings", (...args: UpdateSettingsArgs) => {
    // If args[1] is an array, it has [id, updates] structure
    let id, updates;
    if (Array.isArray(args[1])) {
      [id, updates] = args[1];
    } else {
      id = args[1];
      updates = args[2];
    }

    if (!id) {
      return null;
    }

    const updateData = updates;

    // Ensure we have primitive values
    const safeUpdates: Partial<Settings> = {};
    if (updateData && typeof updateData === "object") {
      if (updateData.pollingInterval !== undefined) {
        safeUpdates.pollingInterval = Number(updateData.pollingInterval);
      }
      if (updateData.payloadPrefix !== undefined) {
        safeUpdates.payloadPrefix = String(updateData.payloadPrefix);
      }
    }

    return settingsService.updateSettings(String(id), safeUpdates);
  });
  sdk.api?.register?.("deleteSettings", (...args: IdArgs) => {
    const id = args[1];
    if (!id) {
      return false;
    }
    return settingsService.deleteSettings(String(id));
  });
  sdk.api?.register?.("listSettings", () => settingsService.listSettings());
}
