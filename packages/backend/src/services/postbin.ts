import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

export class PostbinService implements OASTService {
  private binId: string | null = null;
  private payloadUrl: string | null = null;
  private sdk: CaidoBackendSDK;
  private processedRequestIds: Set<string> = new Set();

  constructor(
    apiKey: string | undefined,
    sdk: CaidoBackendSDK,
    existingUrl?: string,
  ) {
    this.sdk = sdk;
    this.sdk.console.log(
      `PostBin: Constructor called with URL: ${existingUrl}`,
    );

    // Extract bin ID from existing postb.in URL if provided
    if (existingUrl) {
      const match = existingUrl.match(/postb\.in\/([a-zA-Z0-9\-]+)/i);
      this.sdk.console.log(`PostBin: URL match result:`, match);
      if (match && match[1]) {
        this.binId = match[1];
        this.payloadUrl = `https://www.postb.in/${this.binId}`;
        this.sdk.console.log(`PostBin: Using existing bin ${this.binId}`);
      } else {
        this.sdk.console.log(`PostBin: No bin ID found in URL: ${existingUrl}`);
      }
    }
  }

  public async getEvents(): Promise<OASTEvent[]> {
    this.sdk.console.log(`PostBin: getEvents called, binId: ${this.binId}`);

    if (!this.binId) {
      this.sdk.console.log("PostBin: No bin ID available for polling");
      return [];
    }

    try {
      const events: OASTEvent[] = [];
      let requestCount = 0;

      // Keep shifting requests until we get a 404 (no more requests)
      while (requestCount < 100) {
        // Safety limit
        const url = `https://www.postb.in/api/bin/${this.binId}/req/shift`;
        this.sdk.console.log(`PostBin: Shifting request from ${url}`);

        const spec = new RequestSpec(url);
        const res: RequestResponse = await this.sdk.requests.send(spec);

        this.sdk.console.log(
          `PostBin: Response status: ${res.response.getCode()}`,
        );

        if (res.response.getCode() === 404) {
          // No more requests
          this.sdk.console.log("PostBin: No more requests (404)");
          break;
        }

        if (res.response.getCode() >= 300) {
          this.sdk.console.error(
            `PostBin: HTTP error! status: ${res.response.getCode()}`,
          );
          throw new Error(`HTTP error! status: ${res.response.getCode()}`);
        }

        const body = res.response.getBody();
        if (!body) {
          this.sdk.console.log("PostBin: Empty response body");
          break;
        }

        const request = body.toJson() as any;
        this.sdk.console.log(`PostBin: Received request:`, request);

        if (
          request &&
          request.reqId &&
          !this.processedRequestIds.has(request.reqId)
        ) {
          this.processedRequestIds.add(request.reqId);

          const event = {
            id: request.reqId,
            type: "postbin",
            destination: this.payloadUrl,
            timestamp: request.inserted
              ? new Date(request.inserted).getTime()
              : Date.now(),
            data: request,
            protocol: "HTTP",
            method: request.method || "GET",
            source: request.ip || "unknown",
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
          this.sdk.console.log(`PostBin: Added event:`, event);
        }

        requestCount++;
      }

      this.sdk.console.log(`PostBin: Retrieved ${events.length} new events`);
      return events;
    } catch (error) {
      this.sdk.console.error("Error fetching PostBin events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.binId;
  }

  public getDomain(): string | null {
    return this.payloadUrl;
  }

  public async registerAndGetPayload(): Promise<{
    id: string;
    payloadUrl: string;
  } | null> {
    if (this.payloadUrl && this.binId) {
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

      const data = body.toJson() as any;

      if (!data.binId) {
        throw new Error("PostBin registration response missing binId");
      }

      this.binId = data.binId;
      this.payloadUrl = `https://www.postb.in/${this.binId}`;

      this.sdk.console.log(
        `PostBin: Created new bin ${this.binId} (expires: ${new Date(data.expires)})`,
      );

      return { id: this.binId!, payloadUrl: this.payloadUrl };
    } catch (err) {
      this.sdk.console.error("Error during PostBin registration:", err);
      return null;
    }
  }
}
