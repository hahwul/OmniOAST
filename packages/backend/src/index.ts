import type { DefineAPI, SDK } from "caido:plugin";
import { 
  getOASTProviders, 
  addOASTProvider, 
  updateOASTProvider, 
  deleteOASTProvider, 
  initOASTService
} from "./services/oast";
import { getOASTHistory, initHistoryService } from "./services/history";


import type { OASTProvider, OASTHistory } from "@/shared/types";

export type API = DefineAPI<{
  getOASTProviders: {
    args: [];
    returns: OASTProvider[];
  };
  addOASTProvider: {
    args: [provider: OASTProvider];
    returns: OASTProvider;
  };
  updateOASTProvider: {
    args: [provider: OASTProvider];
    returns: OASTProvider;
  };
  deleteOASTProvider: {
    args: [id: string];
    returns: { id: string };
  };
  
  getOASTHistory: {
    args: [providerId: string];
    returns: OASTHistory[];
  };
}>;

export function init(sdk: SDK<API>) {
  initOASTService(sdk);
  initHistoryService(sdk);

  // OAST Provider endpoints
  sdk.api.register("getOASTProviders", getOASTProviders);
  sdk.api.register("addOASTProvider", addOASTProvider);
  sdk.api.register("updateOASTProvider", updateOASTProvider);
  sdk.api.register("deleteOASTProvider", deleteOASTProvider);
  
  // OAST History endpoints
  sdk.api.register("getOASTHistory", getOASTHistory);
}
