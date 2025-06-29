import type { SDK } from "caido:plugin";
import { OASTService } from "./src/services/provider";

export type BackendEvents = {};

export type CaidoBackendSDK = SDK<any, BackendEvents>;

export type { OASTService };

export interface OASTEvent {
  id: string;
  type: string; // e.g., "BOAST", "interactsh"
  timestamp: number;
  data: any; // Raw event data
  correlationId: string;
}
