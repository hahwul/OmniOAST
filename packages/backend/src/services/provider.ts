import { v4 as uuidv4 } from "uuid";

import type { CaidoBackendSDK } from "../../types";
import { type Provider, ProviderSchema } from "../validation/schemas";

import { BoastService } from "./boast";
import { PostbinService } from "./postbin";
import { WebhooksiteService } from "./webhooksite";

export interface OASTService {
  getEvents(): Promise<any[]>;
  getId(): string | null;
  getDomain(): string | null;
  registerAndGetPayload?(): Promise<{ id: string; payloadUrl: string } | null>;
}

type Database = Awaited<ReturnType<CaidoBackendSDK["meta"]["db"]>>;

export class ProviderService {
  private sdk: CaidoBackendSDK;
  private db: Database | null = null;
  private console: Console;

  constructor(sdk: CaidoBackendSDK) {
    this.sdk = sdk;
    this.console = console;
  }

  private async initDb(): Promise<Database> {
    const db = await this.sdk.meta.db();
    await db.exec(`
      CREATE TABLE IF NOT EXISTS providers (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        url TEXT NOT NULL,
        token TEXT,
        enabled INTEGER NOT NULL
      );
    `);
    this.db = db;
    return db;
  }

  private async getDb(): Promise<Database> {
    if (this.db) {
      return this.db;
    }
    return this.initDb();
  }

  async createProvider(
    provider: Omit<Provider, "id" | "enabled">,
  ): Promise<Provider | null> {
    try {
      const newProvider = { id: uuidv4(), enabled: true, ...provider };
      const validatedProvider = ProviderSchema.parse(newProvider);
      const db = await this.getDb();

      const statement = await db.prepare(
        "INSERT INTO providers (id, name, type, url, token, enabled) VALUES (?, ?, ?, ?, ?, ?)",
      );

      await statement.run(
        validatedProvider.id!,
        validatedProvider.name,
        validatedProvider.type,
        validatedProvider.url,
        validatedProvider.token ?? null,
        validatedProvider.enabled ? 1 : 0,
      );

      return validatedProvider;
    } catch (error) {
      this.console.error("Error in createProvider:" + error);
      return null;
    }
  }

  async getProvider(id: string | { id: string }): Promise<Provider | null> {
    try {
      const safeId =
        typeof id === "object" && id !== null && "id" in id
          ? String(id.id)
          : String(id);
      const db = await this.getDb();
      const statement = await db.prepare(
        "SELECT * FROM providers WHERE id = ?",
      );

      const result = (await statement.get(safeId)) as any;

      if (!result) {
        return null;
      }

      const parsed = ProviderSchema.parse({
        ...result,
        enabled: !!result.enabled,
      });
      return parsed;
    } catch (error) {
      this.console.error("Error in getProvider:" + error);
      return null;
    }
  }

  async updateProvider(
    id: string,
    updates: Partial<Provider>,
  ): Promise<Provider | null> {
    try {
      this.console.log(
        "updateProvider id:" + id + " updates:" + JSON.stringify(updates),
      );
      const existingProvider = await this.getProvider(id);
      this.console.log("existingProvider:" + JSON.stringify(existingProvider));
      if (!existingProvider) {
        this.console.log("Provider not found for update!");
        return null;
      }

      const updatedProvider = { ...existingProvider, ...updates, id };
      const validatedProvider = ProviderSchema.parse(updatedProvider);
      this.console.log(
        "validatedProvider:" + JSON.stringify(validatedProvider),
      );
      const db = await this.getDb();

      const statement = await db.prepare(
        "UPDATE providers SET name = ?, type = ?, url = ?, token = ?, enabled = ? WHERE id = ?",
      );

      const result = await statement.run(
        validatedProvider.name,
        validatedProvider.type,
        validatedProvider.url,
        validatedProvider.token ?? null,
        validatedProvider.enabled ? 1 : 0,
        id,
      );
      this.console.log("updateProvider result:" + JSON.stringify(result));

      return validatedProvider;
    } catch (error) {
      this.console.error("Error in updateProvider:" + error);
      return null;
    }
  }

  async deleteProvider(id: string): Promise<boolean> {
    try {
      const db = await this.getDb();
      const statement = await db.prepare("DELETE FROM providers WHERE id = ?");
      const result = await statement.run(id);
      this.console.log("deleteProvider result:" + JSON.stringify(result));
      return result.changes > 0;
    } catch (error) {
      this.console.error("Error in deleteProvider:" + error);
      return false;
    }
  }

  async listProviders(): Promise<Provider[]> {
    try {
      const db = await this.getDb();
      const statement = await db.prepare("SELECT * FROM providers");

      const results = await statement.all<any[]>();
      this.console.log("listProviders results:" + JSON.stringify(results));

      return results.map((provider: any) =>
        ProviderSchema.parse({
          ...provider,
          id: String(provider.id),
          enabled: !!provider.enabled,
        }),
      );
    } catch (error) {
      this.console.error("Error in listProviders:" + error);
      return [];
    }
  }

  async toggleProviderEnabled(
    id: string,
    enabled: boolean,
  ): Promise<Provider | null> {
    try {
      return await this.updateProvider(id, { enabled });
    } catch (error) {
      this.console.error("Error in toggleProviderEnabled:" + error);
      return null;
    }
  }

  public getOASTService(provider: Provider): OASTService | null {
    this.console.log(provider);
    switch (provider.type) {
      case "BOAST":
        return new BoastService(provider.url, provider.token || "", this.sdk);
      case "webhooksite":
        return new WebhooksiteService(provider.token, this.sdk, provider.url);
      case "postbin":
        return new PostbinService(provider.token, this.sdk, provider.url);
      default:
        this.console.error(`Unknown provider type: ${provider.type}`);
        return null;
    }
  }
}

let providerService: ProviderService | null = null;

export function initProviderService(sdk: CaidoBackendSDK): void {
  if (providerService) {
    console.warn("Provider service already initialized.");
    return;
  }
  providerService = new ProviderService(sdk);
}

export function getProviderService(): ProviderService {
  if (!providerService) {
    throw new Error(
      "Provider service not initialized. Call initProviderService first.",
    );
  }
  return providerService;
}
