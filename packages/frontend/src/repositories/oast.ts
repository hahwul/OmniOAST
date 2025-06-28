import { call, initSDK } from "../plugins/sdk";
import type { CaidoSDK } from "../types";

import { type OASTProvider } from "@/shared/types";

export const init = (sdk: CaidoSDK) => {
  initSDK(sdk);
};

export const getOASTProviders = () => {
  return call("getOASTProviders");
};

export const addOASTProvider = (provider: OASTProvider) => {
  return call("addOASTProvider", provider);
};

export const updateOASTProvider = (provider: OASTProvider) => {
  return call("updateOASTProvider", provider);
};

export const deleteOASTProvider = (id: string) => {
  return call("deleteOASTProvider", id);
};

export const getOASTHistory = (providerId: string) => {
  return call("getOASTHistory", providerId);
};
