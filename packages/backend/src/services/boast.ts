import { type RequestResponse, RequestSpec } from "caido:utils";

import { type CaidoBackendSDK, type OASTEvent } from "../../types";

import { type OASTService } from "./provider";

// The parts of a BOAST /events response that are read here. The body is not
// validated beyond the checks below.
type BoastEvent = {
  id: string;
  time?: string | null;
  receiver?: string;
  queryType?: string;
  remoteAddress?: string;
  dump?: string;
};

type BoastResponse = {
  id?: string | null;
  canary?: string | null;
  events?: BoastEvent[] | null;
};

export class BoastService implements OASTService {
  private url: string;
  private secret: string;
  private id: string | null = null;
  private domain: string | null = null;
  private sdk: CaidoBackendSDK;
  private payloadUrl: string | null = null;

  constructor(url: string, secret: string, sdk: CaidoBackendSDK) {
    this.url = url;
    this.secret = secret;
    this.sdk = sdk;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    try {
      // Create RequestSpec for Caido SDK and set headers
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`); // Send request through sdk.requests.send()

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as BoastResponse;
      if (
        (this.id === null || this.id === "") &&
        data.id !== undefined &&
        data.id !== null &&
        data.id !== ""
      ) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`; // Generate payloadUrl here as well
        this.payloadUrl = `http://${this.domain}`;
      }

      // A fresh BOAST session reports `"events": null`
      return (data.events ?? []).map((event) => ({
        id: event.id,
        type: "BOAST",
        destination: this.domain,
        timestamp:
          event.time !== undefined && event.time !== null && event.time !== ""
            ? new Date(event.time).getTime()
            : Date.now(),
        data: event,
        protocol: event.receiver,
        method: event.queryType,
        source: event.remoteAddress,
        correlationId: event.id,
        rawRequest: event.dump,
        rawResponse: "",
      }));
    } catch (error) {
      this.sdk.console.error("Error fetching BOAST events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.id;
  }

  public getDomain(): string | null {
    return this.domain;
  } // Generate and return payloadUrl on first call

  public async registerAndGetPayload(): Promise<{
    id: string;
    payloadUrl: string;
  } | null> {
    // Return error if Secret(token) is empty
    if (!this.secret || this.secret.trim() === "") {
      this.sdk.console.error(
        "BOAST provider requires a non-empty token (Secret) for registration.",
      );
      throw new Error("BOAST provider requires a non-empty token (Secret).");
    } // Return immediately if payloadUrl already exists

    if (
      this.payloadUrl !== null &&
      this.payloadUrl !== "" &&
      this.id !== null &&
      this.id !== ""
    ) {
      return { id: this.id, payloadUrl: this.payloadUrl };
    }
    try {
      // Create RequestSpec for Caido SDK and set headers
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`);
      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as BoastResponse;

      if (
        data.id === undefined ||
        data.id === null ||
        data.id === "" ||
        data.canary === undefined ||
        data.canary === null ||
        data.canary === ""
      ) {
        throw new Error("BOAST registration response missing id or canary");
      }

      this.id = data.id;
      const urlObj = new URL(this.url); // Create canary-based payloadUrl (http/https based on original url)
      this.payloadUrl = `${data.id}.${urlObj.hostname}`;

      return { id: this.id, payloadUrl: this.payloadUrl };
    } catch (err) {
      this.sdk.console.error("Error during BOAST registration:", err);
      return null;
    }
  }
}
