import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type Json, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

// The UI searches and renders raw request/response as text; endpoints often
// return parsed JSON bodies.
const asText = (value: unknown): string =>
  typeof value === "string" ? value : JSON.stringify(value, null, 2);

// The endpoint is user-defined, so there is no schema: these are the fields
// looked for, and none of them is validated.
type Scalar = string | number | boolean | null;

type CustomHttpItem = {
  id?: Scalar;
  uuid?: Scalar;
  reqId?: Scalar;
  _id?: Scalar;
  timestamp?: string | number | null;
  created_at?: string | number | null;
  protocol?: Scalar;
  method?: Scalar;
  ip?: Scalar;
  source?: Scalar;
  remote_address?: Scalar;
  rawRequest?: Json;
  raw_request?: Json;
  body?: Json;
  rawResponse?: Json;
  raw_response?: Json;
};

type CustomHttpResponse =
  | CustomHttpItem[]
  | {
      data?: CustomHttpItem[];
      requests?: CustomHttpItem[];
      events?: CustomHttpItem[];
    }
  | null;

type Falsy = undefined | null | false | 0 | "";

// Truthiness of a parsed JSON value, spelled out. A field may hold any JSON
// (a numeric id, an empty string, null, ...), and JSON has no NaN.
const isTruthy = <T extends Json | undefined>(
  value: T,
): value is Exclude<T, Falsy> =>
  value !== undefined &&
  value !== null &&
  value !== false &&
  value !== 0 &&
  value !== "";

// The first truthy value, as `a || b || c` picks it; undefined if there is none
const firstTruthy = <T extends Json | undefined>(
  ...values: T[]
): Exclude<T, Falsy> | undefined => {
  for (const value of values) {
    if (isTruthy(value)) return value;
  }
  return undefined;
};

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
      return [];
    }

    try {
      const spec = new RequestSpec(this.pollUrl);
      if (this.apiKey !== undefined && this.apiKey !== "") {
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

      const raw = body.toJson() as CustomHttpResponse;

      // Support both { data: [...] } wrapper and plain array
      const items: CustomHttpItem[] = Array.isArray(raw)
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
        // Content-derived fallback keeps the id stable across polls; a new
        // service is created per poll, so the frontend's id dedup is what counts.
        const id = String(
          firstTruthy(item.id, item.uuid, item.reqId, item._id) ??
            JSON.stringify(item),
        );

        if (this.seenIds.has(id)) continue;
        this.seenIds.add(id);

        events.push({
          id,
          type: "customhttp",
          destination: this.pollUrl,
          timestamp: isTruthy(item.timestamp)
            ? new Date(item.timestamp).getTime()
            : isTruthy(item.created_at)
              ? new Date(item.created_at).getTime()
              : Date.now(),
          data: item,
          protocol: String(firstTruthy(item.protocol) ?? "HTTP"),
          method: String(firstTruthy(item.method) ?? ""),
          source: String(
            firstTruthy(item.ip, item.source, item.remote_address) ?? "",
          ),
          correlationId: id,
          rawRequest: asText(
            firstTruthy(item.rawRequest, item.raw_request, item.body) ?? item,
          ),
          rawResponse: asText(
            firstTruthy(item.rawResponse, item.raw_response) ?? "",
          ),
        });
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
