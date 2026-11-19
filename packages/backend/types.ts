import type { SDK } from "caido:plugin";
import type { API } from "./src/index";
import { OASTService } from "./src/services/provider";

export type BackendEvents = {};

export type CaidoBackendSDK = SDK<API, BackendEvents>;

export type { OASTService };

// A parsed JSON value, e.g. a provider's response body
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json | undefined };

export type OASTEvent = {
  id: string;
  type: string; // e.g., "BOAST", "interactsh"
  timestamp: number;
  data: Json; // Raw event data
  correlationId: string;
  destination?: string | null;
  protocol?: string;
  method?: string | null;
  source?: string | null;
  rawRequest?: string;
  rawResponse?: string;
};
