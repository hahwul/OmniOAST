import { v4 as uuidv4 } from "uuid";

import type { CaidoBackendSDK } from "../../types";
import { type Settings, SettingsSchema } from "../validation/schemas";

type Database = Awaited<ReturnType<CaidoBackendSDK["meta"]["db"]>>;

export class SettingsService {
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
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        pollingInterval INTEGER NOT NULL,
        payloadPrefix TEXT,
        persistState INTEGER DEFAULT 1
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

  async createSettings(
    settings: Omit<Settings, "id"> | Record<string, any>,
  ): Promise<Settings | null> {
    try {
      this.console.log("createSettings input:", JSON.stringify(settings));

      // Ensure we have primitive values with safe defaults
      const newSettings = {
        id: uuidv4(),
        pollingInterval: Number(settings.pollingInterval || 30),
        payloadPrefix:
          settings.payloadPrefix !== undefined
            ? String(settings.payloadPrefix)
            : "",
        persistState: settings.persistState !== undefined
          ? Boolean(settings.persistState)
          : true,
      };

      this.console.log(
        "newSettings after conversion:",
        JSON.stringify(newSettings),
      );
      const validatedSettings = SettingsSchema.parse(newSettings);
      this.console.log("validatedSettings:", JSON.stringify(validatedSettings));

      const db = await this.getDb();

      const statement = await db.prepare(
        "INSERT INTO settings (id, pollingInterval, payloadPrefix, persistState) VALUES (?, ?, ?, ?)",
      );

      await statement.run(
        validatedSettings.id!,
        validatedSettings.pollingInterval,
        validatedSettings.payloadPrefix || "",
        validatedSettings.persistState ? 1 : 0,
      );

      return validatedSettings;
    } catch (error) {
      this.console.error("Error in createSettings:" + error);
      return null;
    }
  }

  async getSettings(id: string | undefined): Promise<Settings | null> {
    try {
      this.console.log("getSettings id:", id);
      if (!id) {
        this.console.error("Invalid ID provided to getSettings");
        return null;
      }
      const db = await this.getDb();
      const statement = await db.prepare("SELECT * FROM settings WHERE id = ?");

      const result = (await statement.get(id)) as any;
      this.console.log(
        "getSettings result:",
        result ? JSON.stringify(result) : "null",
      );

      if (!result) {
        return null;
      }

      // Convert each field to the appropriate primitive type with careful type checking
      const settingsData = {
        id: result.id ? String(result.id) : uuidv4(),
        pollingInterval:
          result.pollingInterval !== undefined
            ? Number(result.pollingInterval)
            : 30,
        payloadPrefix: result.payloadPrefix ? String(result.payloadPrefix) : "",
        persistState: result.persistState !== undefined
          ? Boolean(result.persistState)
          : true,
      };

      this.console.log(
        "getSettings settingsData:",
        JSON.stringify(settingsData),
      );
      const parsed = SettingsSchema.parse(settingsData);
      this.console.log("getSettings parsed:", JSON.stringify(parsed));
      return parsed;
    } catch (error) {
      this.console.error("Error in getSettings:" + error);
      return null;
    }
  }

  async getCurrentSettings(): Promise<Settings | null> {
    try {
      this.console.log("getCurrentSettings called");
      const db = await this.getDb();
      const statement = await db.prepare(
        "SELECT * FROM settings ORDER BY rowid DESC LIMIT 1",
      );

      const result = (await statement.get()) as any;
      this.console.log(
        "getCurrentSettings result:",
        result ? JSON.stringify(result) : "null",
      );

      if (!result) {
        // If no settings exist yet, create default settings
        this.console.log("No settings found, creating default settings");
        return this.createDefaultSettings();
      }

      // Ensure we're parsing primitive values, not objects
      const settingsData = {
        id: String(result.id),
        pollingInterval: Number(result.pollingInterval),
        payloadPrefix: result.payloadPrefix ? String(result.payloadPrefix) : "",
        persistState: result.persistState !== undefined
          ? Boolean(result.persistState)
          : true,
      };

      this.console.log(
        "getCurrentSettings settingsData:",
        JSON.stringify(settingsData),
      );
      const parsed = SettingsSchema.parse(settingsData);
      this.console.log("getCurrentSettings parsed:", JSON.stringify(parsed));
      return parsed;
    } catch (error) {
      this.console.error("Error in getCurrentSettings:" + error);
      return this.createDefaultSettings();
    }
  }

  async createDefaultSettings(): Promise<Settings | null> {
    const defaultSettings = {
      pollingInterval: 30,
      payloadPrefix: "",
      persistState: true,
    };
    return this.createSettings(defaultSettings);
  }

  async updateSettings(
    id: string | undefined,
    updates: Partial<Settings> | Record<string, any>,
  ): Promise<Settings | null> {
    try {
      this.console.log("updateSettings id:", id);
      this.console.log("updateSettings updates:", JSON.stringify(updates));

      if (!id) {
        this.console.error("Invalid ID provided to updateSettings");
        return null;
      }

      const existingSettings = await this.getSettings(id);
      if (!existingSettings) {
        this.console.log("Settings not found for update!");
        return null;
      }

      this.console.log("existingSettings:", JSON.stringify(existingSettings));

      // Create a clean object with primitive values and safe access
      const updatedSettings = {
        id,
        pollingInterval:
          updates && updates.pollingInterval !== undefined
            ? Number(updates.pollingInterval)
            : existingSettings.pollingInterval,
        payloadPrefix:
          updates && updates.payloadPrefix !== undefined
            ? String(updates.payloadPrefix)
            : existingSettings.payloadPrefix || "",
        persistState:
          updates && updates.persistState !== undefined
            ? Boolean(updates.persistState)
            : existingSettings.persistState !== undefined
              ? existingSettings.persistState
              : true,
      };

      this.console.log(
        "updatedSettings before validation:",
        JSON.stringify(updatedSettings),
      );
      const validatedSettings = SettingsSchema.parse(updatedSettings);
      this.console.log(
        "validatedSettings after validation:",
        JSON.stringify(validatedSettings),
      );

      const db = await this.getDb();

      const statement = await db.prepare(
        "UPDATE settings SET pollingInterval = ?, payloadPrefix = ?, persistState = ? WHERE id = ?",
      );

      await statement.run(
        validatedSettings.pollingInterval,
        validatedSettings.payloadPrefix || "",
        validatedSettings.persistState ? 1 : 0,
        id,
      );

      return validatedSettings;
    } catch (error) {
      this.console.error("Error in updateSettings:" + error);
      return null;
    }
  }

  async deleteSettings(id: string | undefined): Promise<boolean> {
    try {
      if (!id) {
        this.console.error("Invalid ID provided to deleteSettings");
        return false;
      }
      const db = await this.getDb();
      const statement = await db.prepare("DELETE FROM settings WHERE id = ?");
      const result = await statement.run(id);
      return result.changes > 0;
    } catch (error) {
      this.console.error("Error in deleteSettings:" + error);
      return false;
    }
  }

  async listSettings(): Promise<Settings[]> {
    try {
      const db = await this.getDb();
      const statement = await db.prepare("SELECT * FROM settings");

      const results = await statement.all<any[]>();

      return results.map((settings: any) =>
        SettingsSchema.parse({
          id: String(settings.id),
          pollingInterval: Number(settings.pollingInterval),
          payloadPrefix: settings.payloadPrefix || "",
          persistState: settings.persistState !== undefined
            ? Boolean(settings.persistState)
            : true,
        }),
      );
    } catch (error) {
      this.console.error("Error in listSettings:" + error);
      return [];
    }
  }
}

let settingsService: SettingsService | null = null;

export function initSettingsService(sdk: CaidoBackendSDK): void {
  if (settingsService) {
    console.warn("Settings service already initialized.");
    return;
  }
  settingsService = new SettingsService(sdk);
}

export function getSettingsService(): SettingsService {
  if (!settingsService) {
    throw new Error(
      "Settings service not initialized. Call initSettingsService first.",
    );
  }
  return settingsService;
}
