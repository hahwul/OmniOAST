import { OASTService } from "./provider";
import { OASTEvent } from "../../types";

export class BoastService implements OASTService {
  private url: string;
  private secret: string;
  private id: string | null = null;
  private domain: string | null = null;

  constructor(url: string, secret: string) {
    this.url = url;
    this.secret = secret;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    try {
      const headers = {
        Authorization: `Secret ${this.secret}`,
      };

      const response = await fetch(this.url, { headers });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (!this.id && data.id) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`;
      }

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
