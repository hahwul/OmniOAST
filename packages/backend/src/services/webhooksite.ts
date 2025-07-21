import { OASTService } from "./provider";
import { OASTEvent } from "../../types";
import { RequestSpec, RequestResponse } from "caido:utils";
import type { CaidoBackendSDK } from "../../types";

export class WebhooksiteService implements OASTService {
  private tokenId: string | null = null;
  private payloadUrl: string | null = null;
  private sdk: CaidoBackendSDK;
  private apiKey?: string;

  constructor(
    apiKey: string | undefined,
    sdk: CaidoBackendSDK,
    existingUrl?: string,
  ) {
    this.apiKey = apiKey;
    this.sdk = sdk;

    // Extract token ID from existing webhook.site URL if provided
    if (existingUrl) {
      const match = existingUrl.match(/webhook\.site\/([a-f0-9\-]{36})/i);
      if (match && match[1]) {
        this.tokenId = match[1];
        this.payloadUrl = `https://webhook.site/${this.tokenId}`;
        this.sdk.console.log(
          `Webhook.site: Using existing token ${this.tokenId}`,
        );
      }
    }
  }

  public async getEvents(): Promise<OASTEvent[]> {
    if (!this.tokenId) {
      this.sdk.console.log("Webhook.site: No token ID available for polling");
      return [];
    }

    try {
      const url = `https://webhook.site/token/${this.tokenId}/requests?sorting=newest`;
      this.sdk.console.log(`Webhook.site: Polling events from ${url}`);

      const spec = new RequestSpec(url);
      if (this.apiKey) {
        spec.setHeader("Api-Key", this.apiKey);
      }

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        this.sdk.console.log("Webhook.site: Empty response body");
        return [];
      }

      const data = body.toJson() as any;
      this.sdk.console.log(`Webhook.site: Received data:`, data);

      if (!data.data || !Array.isArray(data.data)) {
        this.sdk.console.log(
          "Webhook.site: No events in response or invalid format",
        );
        return [];
      }

      const events = data.data.map((event: any) => ({
        id: event.uuid,
        type: "webhooksite",
        destination: this.payloadUrl,
        timestamp: new Date(event.created_at || event.updated_at || Date.now()),
        data: event,
        protocol: "HTTP",
        method: event.method,
        source: event.ip,
        correlationId: event.uuid,
        rawRequest: event.content || JSON.stringify(event),
        rawResponse: "",
      }));

      this.sdk.console.log(`Webhook.site: Mapped ${events.length} events`);
      return events;
    } catch (error) {
      this.sdk.console.error("Error fetching webhook.site events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.tokenId;
  }

  public getDomain(): string | null {
    return this.payloadUrl;
  }

  public async registerAndGetPayload(): Promise<{
    id: string;
    payloadUrl: string;
  } | null> {
    if (this.payloadUrl && this.tokenId) {
      return { id: this.tokenId, payloadUrl: this.payloadUrl };
    }

    try {
      const spec = new RequestSpec("https://webhook.site/token");
      spec.setMethod("POST");
      spec.setHeader("Content-Type", "application/json");
      if (this.apiKey) {
        spec.setHeader("Api-Key", this.apiKey);
      }
      spec.setBody(
        JSON.stringify({
          default_status: 200,
          default_content: "Hello world!",
          default_content_type: "text/html",
        }),
      );

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as any;

      if (!data.uuid) {
        throw new Error("Webhook.site registration response missing uuid");
      }

      this.tokenId = data.uuid;
      this.payloadUrl = `https://webhook.site/${this.tokenId}`;

      return { id: this.tokenId!, payloadUrl: this.payloadUrl! };
    } catch (err) {
      this.sdk.console.error("Error during webhook.site registration:", err);
      return null;
    }
  }
}
