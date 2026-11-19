import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type Json, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

const RATE_LIMIT_DELAY_MS = 200;

// The parts of PostBin's responses that are read here. The bodies are not
// validated beyond the checks below.
type PostbinRequest = {
  reqId?: string | null;
  inserted?: number | null;
  method?: string | null;
  ip?: string | null;
  path?: Json;
  headers?: Json;
  query?: Json;
  body?: Json;
};

type PostbinBin = {
  binId?: string | null;
  expires: number;
};

export class PostbinService implements OASTService {
  private binId: string | null = null;
  private payloadUrl: string | null = null;
  private sdk: CaidoBackendSDK;
  private processedRequestIds: Set<string> = new Set();
  private rateLimitDelay: number;

  constructor(
    apiKey: string | undefined,
    sdk: CaidoBackendSDK,
    existingUrl?: string,
    rateLimitDelay = RATE_LIMIT_DELAY_MS,
  ) {
    this.sdk = sdk;
    this.rateLimitDelay = rateLimitDelay;

    // Extract bin ID from existing postb.in URL if provided
    if (existingUrl !== undefined && existingUrl !== "") {
      const match = existingUrl.match(/postb\.in\/([a-zA-Z0-9-]+)/i);
      if (match && match[1] !== undefined && match[1] !== "") {
        this.binId = match[1];
        this.payloadUrl = `https://www.postb.in/${this.binId}`;
      }
    }
  }

  public async getEvents(): Promise<OASTEvent[]> {
    if (this.binId === null || this.binId === "") {
      return [];
    }

    // Outside the try: shift removes requests from the bin, so the ones already
    // fetched must still be returned if a later shift fails.
    const events: OASTEvent[] = [];
    try {
      let requestCount = 0;

      // Keep shifting requests until we get a 404 (no more requests)
      while (requestCount < 100) {
        // Rate limit: add small delay between requests to avoid hammering the API
        if (requestCount > 0 && this.rateLimitDelay > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, this.rateLimitDelay),
          );
        }
        const url = `https://www.postb.in/api/bin/${this.binId}/req/shift`;

        const spec = new RequestSpec(url);
        const res: RequestResponse = await this.sdk.requests.send(spec);

        if (res.response.getCode() === 404) {
          // No more requests
          break;
        }

        if (res.response.getCode() >= 300) {
          throw new Error(`HTTP error! status: ${res.response.getCode()}`);
        }

        const body = res.response.getBody();
        if (!body) {
          break;
        }

        const request = body.toJson() as PostbinRequest | null;

        if (
          request &&
          request.reqId !== undefined &&
          request.reqId !== null &&
          request.reqId !== "" &&
          !this.processedRequestIds.has(request.reqId)
        ) {
          this.processedRequestIds.add(request.reqId);

          const event = {
            id: request.reqId,
            type: "postbin",
            destination: this.payloadUrl,
            timestamp:
              request.inserted !== undefined &&
              request.inserted !== null &&
              request.inserted !== 0
                ? new Date(request.inserted).getTime()
                : Date.now(),
            data: request,
            protocol: "HTTP",
            method:
              request.method !== undefined &&
              request.method !== null &&
              request.method !== ""
                ? request.method
                : "GET",
            source:
              request.ip !== undefined &&
              request.ip !== null &&
              request.ip !== ""
                ? request.ip
                : "unknown",
            correlationId: request.reqId,
            rawRequest: JSON.stringify(
              {
                method: request.method,
                path: request.path,
                headers: request.headers,
                query: request.query,
                body: request.body,
              },
              null,
              2,
            ),
            rawResponse: "",
          };

          events.push(event);
        }

        requestCount++;
      }

      return events;
    } catch (error) {
      this.sdk.console.error("Error fetching PostBin events:", error);
      return events;
    }
  }

  public getId(): string | null {
    return this.binId;
  }

  public getDomain(): string | null {
    return this.payloadUrl;
  }

  // Bins expire after 30 minutes. Only a definite 404 counts as gone, so a
  // network hiccup doesn't replace a bin that is still alive.
  private async binExists(): Promise<boolean> {
    try {
      const res: RequestResponse = await this.sdk.requests.send(
        new RequestSpec(`https://www.postb.in/api/bin/${this.binId}`),
      );
      return res.response.getCode() !== 404;
    } catch {
      return true;
    }
  }

  public async registerAndGetPayload(): Promise<{
    id: string;
    payloadUrl: string;
  } | null> {
    if (
      this.payloadUrl !== null &&
      this.payloadUrl !== "" &&
      this.binId !== null &&
      this.binId !== "" &&
      (await this.binExists())
    ) {
      return { id: this.binId, payloadUrl: this.payloadUrl };
    }

    try {
      const spec = new RequestSpec("https://www.postb.in/api/bin");
      spec.setMethod("POST");
      spec.setHeader("Content-Type", "application/json");

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as PostbinBin;

      if (
        data.binId === undefined ||
        data.binId === null ||
        data.binId === ""
      ) {
        throw new Error("PostBin registration response missing binId");
      }

      this.binId = data.binId;
      this.payloadUrl = `https://www.postb.in/${this.binId}`;

      this.sdk.console.log(
        `PostBin: Created new bin ${this.binId} (expires: ${new Date(data.expires)})`,
      );

      return { id: this.binId, payloadUrl: this.payloadUrl };
    } catch (err) {
      this.sdk.console.error("Error during PostBin registration:", err);
      return null;
    }
  }
}
