import type { SDK } from "caido:plugin";

export type BackendEvents = {};

export type CaidoBackendSDK = SDK<Request, BackendEvents>;

export interface OASTEvent {
  id: string;
  type: string; // e.g., "BOAST", "interactsh"
  timestamp: number;
  data: any; // Raw event data
  correlationId: string;
}
