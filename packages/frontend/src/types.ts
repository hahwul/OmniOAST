import { type Caido } from "@caido/sdk-frontend";

import {
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
};

type SidebarSDKPatched = {
  registerItem: (label: string, path: string, options?: any) => void;
  setCount: (label: string, count: number) => void;
  // Optionally add getCount if needed
};

export type FrontendSDK = Caido<API, {}> & {
  sidebar: SidebarSDKPatched;
};
