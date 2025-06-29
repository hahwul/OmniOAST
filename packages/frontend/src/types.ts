import { type Caido } from "@caido/sdk-frontend";
// import { type API } from "backend";

// API 타입을 직접 명시
type API = {
  createProvider: (provider: {
    name: string;
    type: string;
    url: string;
    token: string;
  }) => Promise<any>;
  getProvider: (id: string) => Promise<any>;
  updateProvider: (id: string, updates: Partial<any>) => Promise<any>;
  deleteProvider: (id: string) => Promise<boolean>;
  listProviders: () => Promise<any[]>;
  toggleProviderEnabled: (id: string, enabled: boolean) => Promise<any>;
};

export type FrontendSDK = Caido<API, {}>;
