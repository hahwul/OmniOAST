import type { SDK } from "caido:plugin";

import type { API } from "../index";
import { getOASTHistory as getHistory } from "../stores/history";

import { type OASTHistory } from "../../../shared/src/types";

export const initHistoryService = (sdk: SDK<API>) => {
  // No-op for compatibility, can be used for future initialization if needed
};

// This is a placeholder. In a real application, you would fetch this from the OAST provider.
export const getOASTHistory = async (
  sdk: SDK<API>,
  providerId: string,
): Promise<OASTHistory[]> => {
  sdk.console.log(`Fetching history for provider ${providerId}`);
  return getHistory(sdk, providerId);
};
