import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

// webhook.site sends UTC as "YYYY-MM-DD HH:mm:ss" with no zone; new Date()
// would read that as local time and shift every interaction by the UTC offset.
const parseWebhooksiteDate = (value: string | undefined): number => {
  if (value === undefined || value === "") return Date.now();
  return new Date(
    /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
      ? `${value.replace(" ", "T")}Z`
      : value,
  ).getTime();
};

// The parts of webhook.site's responses that are read here. The bodies are not
// validated beyond the checks below.
type WebhooksiteRequest = {
  uuid: string;
  created_at?: string;
  updated_at?: string;
  method?: string | null;
  ip?: string | null;
  content?: string | null;
};

type WebhooksiteRequests = {
  data?: WebhooksiteRequest[] | null;
  is_last_page?: boolean;
};

// 50 requests a page (larger per_page values are capped to that), newest first.
// ponytail: refetches every page each poll; pass a date_from if big tokens get slow
const MAX_PAGES = 10;

type WebhooksiteToken = {
  uuid?: string | null;
};

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
    if (existingUrl !== undefined && existingUrl !== "") {
      const match = existingUrl.match(/webhook\.site\/([a-f0-9-]{36})/i);
      if (match && match[1] !== undefined && match[1] !== "") {
        this.tokenId = match[1];
        this.payloadUrl = `https://webhook.site/${this.tokenId}`;
      }
    }
  }

  public async getEvents(): Promise<OASTEvent[]> {
    if (this.tokenId === null || this.tokenId === "") {
      return [];
    }

    // Every page, not just the first: more than one page of requests can
    // arrive between two polls. Kept if a later page fails.
    const requests: WebhooksiteRequest[] = [];
    try {
      for (let page = 1; page <= MAX_PAGES; page++) {
        const url = `https://webhook.site/token/${this.tokenId}/requests?sorting=newest&page=${page}`;

        const spec = new RequestSpec(url);
        if (this.apiKey !== undefined && this.apiKey !== "") {
          spec.setHeader("Api-Key", this.apiKey);
        }

        const res: RequestResponse = await this.sdk.requests.send(spec);

        if (res.response.getCode() >= 300) {
          throw new Error(`HTTP error! status: ${res.response.getCode()}`);
        }

        const body = res.response.getBody();
        if (!body) {
          this.sdk.console.log("Webhook.site: Empty response body");
          break;
        }

        const data = body.toJson() as WebhooksiteRequests;

        if (!data.data || !Array.isArray(data.data)) {
          break;
        }
        requests.push(...data.data);
        if (data.is_last_page !== false || data.data.length === 0) break;
      }
    } catch (error) {
      this.sdk.console.error("Error fetching webhook.site events:", error);
    }

    return requests.map((event) => ({
      id: event.uuid,
      type: "webhooksite",
      destination: this.payloadUrl,
      timestamp: parseWebhooksiteDate(event.created_at ?? event.updated_at),
      data: event,
      protocol: "HTTP",
      method: event.method,
      source: event.ip,
      correlationId: event.uuid,
      rawRequest:
        event.content !== undefined &&
        event.content !== null &&
        event.content !== ""
          ? event.content
          : JSON.stringify(event),
      rawResponse: "",
    }));
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
    if (
      this.payloadUrl !== null &&
      this.payloadUrl !== "" &&
      this.tokenId !== null &&
      this.tokenId !== ""
    ) {
      return { id: this.tokenId, payloadUrl: this.payloadUrl };
    }

    try {
      const spec = new RequestSpec("https://webhook.site/token");
      spec.setMethod("POST");
      spec.setHeader("Content-Type", "application/json");
      if (this.apiKey !== undefined && this.apiKey !== "") {
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

      const data = body.toJson() as WebhooksiteToken;

      if (data.uuid === undefined || data.uuid === null || data.uuid === "") {
        throw new Error("Webhook.site registration response missing uuid");
      }

      this.tokenId = data.uuid;
      this.payloadUrl = `https://webhook.site/${this.tokenId}`;

      return { id: this.tokenId, payloadUrl: this.payloadUrl };
    } catch (err) {
      this.sdk.console.error("Error during webhook.site registration:", err);
      return null;
    }
  }
}
