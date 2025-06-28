import { OASTHistory } from "@/shared/types";
import { getOASTHistory as getHistory } from "../stores/history";
import type { SDK } from "caido:plugin";
import type { API } from "../index";

let sdkInstance: SDK<API>;

export const initHistoryService = (sdk: SDK<API>) => {
  sdkInstance = sdk;
};

// This is a placeholder. In a real application, you would fetch this from the OAST provider.
export const getOASTHistory = async (
  providerId: string,
): Promise<OASTHistory[]> => {
  sdkInstance.console.log(`Fetching history for provider ${providerId}`);
  return await getHistory();
};
