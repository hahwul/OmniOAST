import { OASTService } from "./provider";
import { OASTEvent } from "../../types";
import type { CaidoBackendSDK } from "../../types";
import type { RequestSpec } from "caido:utils";

export class BoastService implements OASTService {
  private url: string;
  private secret: string;
  private id: string | null = null;
  private domain: string | null = null;
  private sdk: CaidoBackendSDK;

  constructor(url: string, secret: string, sdk: CaidoBackendSDK) {
    this.url = url;
    this.secret = secret;
    this.sdk = sdk;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    try {
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`);

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const bodyBytes = res.response.getBody();
      const bodyString = new TextDecoder().decode(bodyBytes);
      const data = JSON.parse(bodyString);

      if (!this.id && data.id) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`;
      }

      return data.events.map((event: any) => ({
        id: event.id,
        type: "BOAST",
        timestamp: new Date(event.timestamp),
        data: event,
        correlationId: event.id,
      }));

      // Assuming data.events is an array of events
      // Need to map BOAST event structure to OASTEvent
      return data.events.map((event: any) => ({
        id: event.id,
        type: "BOAST", // Assuming BOAST events have a type field or we set it
        timestamp: new Date(event.timestamp),
        data: event, // Store raw event data
        correlationId: event.id, // Use event ID as correlation ID for now
      }));
    } catch (error) {
      console.error("Error fetching BOAST events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.id;
  }

  public getDomain(): string | null {
    return this.domain;
  }
}
