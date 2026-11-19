import { type Caido } from "@caido/sdk-frontend";

import {
  type Provider,
  type Settings,
} from "../../backend/src/validation/schemas";
import { type OASTEvent } from "../../backend/types";

// A provider as the backend returns it: the id it assigned is always set
type StoredProvider = Provider & { id: string };

type API = {
  // The backend validates the provider and resolves to null if it is invalid
  createProvider: (
    provider: Partial<Omit<Provider, "id">>,
  ) => Promise<StoredProvider | null>;
  getProvider: (id: string) => Promise<StoredProvider | null>;
  updateProvider: (
    id: string,
    updates: Partial<Provider>,
  ) => Promise<StoredProvider | null>;
  deleteProvider: (id: string) => Promise<boolean>;
  listProviders: () => Promise<StoredProvider[]>;
  toggleProviderEnabled: (
    id: string,
    enabled: boolean,
  ) => Promise<StoredProvider | null>;
  // getOASTService: (provider: Provider) => Promise<OASTService | null>;
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
};

type SidebarSDKPatched = {
  registerItem: (
    label: string,
    path: string,
    options?: Parameters<Caido["sidebar"]["registerItem"]>[2],
  ) => void;
  setCount: (label: string, count: number) => void;
  // Optionally add getCount if needed
};

export type FrontendSDK = Caido<API, Record<string, never>> & {
  sidebar: SidebarSDKPatched;
};

// A value sdk.storage can hold
export type JSONValue = ReturnType<FrontendSDK["storage"]["get"]>;
