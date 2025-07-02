import { type Caido } from "@caido/sdk-frontend";
import { type Provider } from "../../backend/src/validation/schemas";

type API = {
  createProvider: (provider: {
    name: string;
    type: "interactsh" | "BOAST";
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
};

export type FrontendSDK = Caido<API, {}>;
