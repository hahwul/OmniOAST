import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

export class CustomHttpService implements OASTService {
  private pollUrl: string;
  private sdk: CaidoBackendSDK;
  private apiKey?: string;
  private seenIds: Set<string> = new Set();

  constructor(
    apiKey: string | undefined,
    sdk: CaidoBackendSDK,
    pollUrl: string,
  ) {
    this.apiKey = apiKey;
    this.sdk = sdk;
    this.pollUrl = pollUrl;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    if (!this.pollUrl) {
      this.sdk.console.log("CustomHTTP: No polling URL configured");
      return [];
    }

    try {
      this.sdk.console.log(`CustomHTTP: Polling events from ${this.pollUrl}`);

      const spec = new RequestSpec(this.pollUrl);
      if (this.apiKey) {
        spec.setHeader("Authorization", `Bearer ${this.apiKey}`);
      }

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        return [];
      }

      const raw = body.toJson() as any;

      // Support both { data: [...] } wrapper and plain array
      const items: any[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.requests)
            ? raw.requests
            : Array.isArray(raw?.events)
              ? raw.events
              : [];

      const events: OASTEvent[] = [];
      for (const item of items) {
        const id = String(
          item.id || item.uuid || item.reqId || item._id || crypto.randomUUID(),
        );

        if (this.seenIds.has(id)) continue;
        this.seenIds.add(id);

        events.push({
          id,
          type: "customhttp",
          destination: this.pollUrl,
          timestamp: item.timestamp
            ? new Date(item.timestamp).getTime()
            : item.created_at
              ? new Date(item.created_at).getTime()
              : Date.now(),
          data: item,
          protocol: String(item.protocol || "HTTP"),
          method: String(item.method || ""),
          source: String(item.ip || item.source || item.remote_address || ""),
          correlationId: id,
          rawRequest: item.rawRequest || item.raw_request || item.body || JSON.stringify(item, null, 2),
          rawResponse: item.rawResponse || item.raw_response || "",
        } as OASTEvent & Record<string, any>);
      }

      return events;
    } catch (error) {
      this.sdk.console.error("Error fetching CustomHTTP events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.pollUrl;
  }

  public getDomain(): string | null {
    return this.pollUrl;
  }
}
