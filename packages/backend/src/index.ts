import type { DefineAPI } from "caido:plugin";

import type { BackendEvents, CaidoBackendSDK } from "../types";

import {
  getPollingTaskService,
  initPollingTaskService,
} from "./services/pollingTask";
import { getProviderService, initProviderService } from "./services/provider";
import { getSettingsService, initSettingsService } from "./services/settings";
import {
  type PollingTask,
  type Provider,
  type Settings,
} from "./validation/schemas";

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

  // PollingTask API
  createPollingTask: (
    task: Omit<PollingTask, "createdAt" | "updatedAt">,
  ) => Promise<PollingTask | null>;
  getPollingTask: (id: string) => Promise<PollingTask | null>;
  updatePollingTask: (
    id: string,
    updates: Partial<PollingTask>,
  ) => Promise<PollingTask | null>;
  deletePollingTask: (id: string) => Promise<boolean>;
  listPollingTasks: (
    filters?: Partial<{
      tabId: string;
      isActive: boolean;
      providerId: string;
    }>,
  ) => Promise<PollingTask[]>;
  updateTaskHealth: (
    id: string,
    healthStatus: "healthy" | "unhealthy" | "unknown",
  ) => Promise<PollingTask | null>;
  updateLastPolled: (id: string, timestamp: number) => Promise<PollingTask | null>;
  deactivateTask: (id: string) => Promise<PollingTask | null>;
  activateTask: (id: string) => Promise<PollingTask | null>;
  getActivePollingTasks: () => Promise<PollingTask[]>;
}>;

// Accept sdk as CaidoBackendSDK to ensure compatibility with provider service
export function init(sdk: CaidoBackendSDK) {
  initProviderService(sdk);
  initSettingsService(sdk);
  initPollingTaskService(sdk);
  const providerService = getProviderService();
  const settingsService = getSettingsService();
  const pollingTaskService = getPollingTaskService();

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

  // PollingTask API registration
  (sdk as any).api?.register?.("createPollingTask", (...args: any[]) => {
    const taskData = args[1];
    console.log("API createPollingTask received:", JSON.stringify(taskData));
    return pollingTaskService.createPollingTask(taskData);
  });

  (sdk as any).api?.register?.("getPollingTask", (...args: any[]) => {
    const id = args[1];
    console.log("API getPollingTask received id:", id);
    if (!id) {
      console.error("Invalid ID provided to getPollingTask");
      return null;
    }
    return pollingTaskService.getPollingTask(String(id));
  });

  (sdk as any).api?.register?.("updatePollingTask", (...args: any[]) => {
    let id, updates;
    if (args[1] && Array.isArray(args[1])) {
      [id, updates] = args[1];
    } else {
      id = args[1];
      updates = args[2];
    }

    console.log("API updatePollingTask received id:", id);
    console.log(
      "API updatePollingTask received updates:",
      JSON.stringify(updates),
    );

    if (!id) {
      console.error("Invalid ID provided to updatePollingTask");
      return null;
    }

    return pollingTaskService.updatePollingTask(String(id), updates);
  });

  (sdk as any).api?.register?.("deletePollingTask", (...args: any[]) => {
    const id = args[1];
    console.log("API deletePollingTask received id:", id);
    if (!id) {
      console.error("Invalid ID provided to deletePollingTask");
      return false;
    }
    return pollingTaskService.deletePollingTask(String(id));
  });

  (sdk as any).api?.register?.("listPollingTasks", (...args: any[]) => {
    const filters = args[1];
    console.log("API listPollingTasks received filters:", JSON.stringify(filters));
    return pollingTaskService.listPollingTasks(filters);
  });

  (sdk as any).api?.register?.("updateTaskHealth", (...args: any[]) => {
    let id, healthStatus;
    if (args[1] && Array.isArray(args[1])) {
      [id, healthStatus] = args[1];
    } else {
      id = args[1];
      healthStatus = args[2];
    }
    console.log("API updateTaskHealth received id:", id, "status:", healthStatus);
    return pollingTaskService.updateTaskHealth(String(id), healthStatus);
  });

  (sdk as any).api?.register?.("updateLastPolled", (...args: any[]) => {
    let id, timestamp;
    if (args[1] && Array.isArray(args[1])) {
      [id, timestamp] = args[1];
    } else {
      id = args[1];
      timestamp = args[2];
    }
    console.log("API updateLastPolled received id:", id, "timestamp:", timestamp);
    return pollingTaskService.updateLastPolled(String(id), Number(timestamp));
  });

  (sdk as any).api?.register?.("deactivateTask", (...args: any[]) => {
    const id = args[1];
    console.log("API deactivateTask received id:", id);
    return pollingTaskService.deactivateTask(String(id));
  });

  (sdk as any).api?.register?.("activateTask", (...args: any[]) => {
    const id = args[1];
    console.log("API activateTask received id:", id);
    return pollingTaskService.activateTask(String(id));
  });

  (sdk as any).api?.register?.("getActivePollingTasks", () => {
    console.log("API getActivePollingTasks called");
    return pollingTaskService.getActivePollingTasks();
  });
}
