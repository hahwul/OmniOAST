import { type Caido } from "@caido/sdk-frontend";

import {
  type PollingTask,
  type Provider,
  type Settings,
} from "../../backend/src/validation/schemas";

type API = {
  createProvider: (provider: {
    name: string;
    type: "interactsh" | "BOAST" | "webhooksite" | "postbin";
    url: string;
    token: string;
  }) => Promise<any>;
  getProvider: (id: string) => Promise<any>;
  updateProvider: (id: string, updates: Partial<any>) => Promise<any>;
  deleteProvider: (id: string) => Promise<boolean>;
  listProviders: () => Promise<any[]>;
  toggleProviderEnabled: (id: string, enabled: boolean) => Promise<any>;
  // getOASTService: (provider: Provider) => Promise<OASTService | null>;
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
};

type SidebarSDKPatched = {
  registerItem: (label: string, path: string, options?: any) => void;
  setCount: (label: string, count: number) => void;
  // Optionally add getCount if needed
};

export type FrontendSDK = Caido<API, {}> & {
  sidebar: SidebarSDKPatched;
};
