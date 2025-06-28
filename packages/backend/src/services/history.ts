import type { SDK } from "caido:plugin";

import type { API } from "../index";
import { getOASTHistory as getHistory } from "../stores/history";

import { type OASTHistory } from "@/shared/types";

let sdkInstance: SDK<API>;

export const initHistoryService = (sdk: SDK<API>) => {
  sdkInstance = sdk;
};

// This is a placeholder. In a real application, you would fetch this from the OAST provider.
export const getOASTHistory = (providerId: string): OASTHistory[] => {
  sdkInstance.console.log(`Fetching history for provider ${providerId}`);
  return getHistory();
};
