import type { CaidoBackendSDK } from "../../types";
import {
  type PollingTask,
  PollingTaskSchema,
} from "../validation/schemas";

type Database = Awaited<ReturnType<CaidoBackendSDK["meta"]["db"]>>;

export class PollingTaskService {
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
      CREATE TABLE IF NOT EXISTS polling_tasks (
        id TEXT PRIMARY KEY,
        tabId TEXT NOT NULL,
        tabName TEXT NOT NULL,
        providerId TEXT NOT NULL,
        providerName TEXT NOT NULL,
        providerType TEXT NOT NULL,
        payload TEXT NOT NULL,
        interval INTEGER NOT NULL,
        lastPolled INTEGER NOT NULL,
        isActive INTEGER NOT NULL DEFAULT 1,
        lastHealthCheck INTEGER,
        healthStatus TEXT NOT NULL DEFAULT 'unknown',
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
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

  async createPollingTask(
    task: Omit<PollingTask, "createdAt" | "updatedAt">,
  ): Promise<PollingTask | null> {
    try {
      this.console.log("createPollingTask input:", JSON.stringify(task));

      const now = Date.now();
      const newTask = {
        ...task,
        isActive: task.isActive !== undefined ? task.isActive : true,
        healthStatus: task.healthStatus || "unknown",
        createdAt: now,
        updatedAt: now,
      };

      this.console.log(
        "newTask after conversion:",
        JSON.stringify(newTask),
      );
      const validatedTask = PollingTaskSchema.parse(newTask);
      this.console.log("validatedTask:", JSON.stringify(validatedTask));

      const db = await this.getDb();

      const statement = await db.prepare(
        `INSERT INTO polling_tasks (
          id, tabId, tabName, providerId, providerName, providerType,
          payload, interval, lastPolled, isActive, lastHealthCheck,
          healthStatus, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      );

      await statement.run(
        validatedTask.id,
        validatedTask.tabId,
        validatedTask.tabName,
        validatedTask.providerId,
        validatedTask.providerName,
        validatedTask.providerType,
        validatedTask.payload,
        validatedTask.interval,
        validatedTask.lastPolled,
        validatedTask.isActive ? 1 : 0,
        validatedTask.lastHealthCheck || null,
        validatedTask.healthStatus,
        validatedTask.createdAt,
        validatedTask.updatedAt,
      );

      return validatedTask;
    } catch (error) {
      this.console.error("Error in createPollingTask:" + error);
      return null;
    }
  }

  async getPollingTask(id: string): Promise<PollingTask | null> {
    try {
      this.console.log("getPollingTask id:", id);
      if (!id) {
        this.console.error("Invalid ID provided to getPollingTask");
        return null;
      }
      const db = await this.getDb();
      const statement = await db.prepare(
        "SELECT * FROM polling_tasks WHERE id = ?",
      );

      const result = (await statement.get(id)) as any;
      this.console.log(
        "getPollingTask result:",
        result ? JSON.stringify(result) : "null",
      );

      if (!result) {
        return null;
      }

      const taskData = {
        id: String(result.id),
        tabId: String(result.tabId),
        tabName: String(result.tabName),
        providerId: String(result.providerId),
        providerName: String(result.providerName),
        providerType: String(result.providerType),
        payload: String(result.payload),
        interval: Number(result.interval),
        lastPolled: Number(result.lastPolled),
        isActive: Boolean(result.isActive),
        lastHealthCheck: result.lastHealthCheck
          ? Number(result.lastHealthCheck)
          : undefined,
        healthStatus: String(result.healthStatus) as
          | "healthy"
          | "unhealthy"
          | "unknown",
        createdAt: Number(result.createdAt),
        updatedAt: Number(result.updatedAt),
      };

      this.console.log("getPollingTask taskData:", JSON.stringify(taskData));
      const parsed = PollingTaskSchema.parse(taskData);
      this.console.log("getPollingTask parsed:", JSON.stringify(parsed));
      return parsed;
    } catch (error) {
      this.console.error("Error in getPollingTask:" + error);
      return null;
    }
  }

  async updatePollingTask(
    id: string,
    updates: Partial<PollingTask>,
  ): Promise<PollingTask | null> {
    try {
      this.console.log("updatePollingTask id:", id);
      this.console.log(
        "updatePollingTask updates:",
        JSON.stringify(updates),
      );

      if (!id) {
        this.console.error("Invalid ID provided to updatePollingTask");
        return null;
      }

      const existingTask = await this.getPollingTask(id);
      if (!existingTask) {
        this.console.log("PollingTask not found for update!");
        return null;
      }

      this.console.log("existingTask:", JSON.stringify(existingTask));

      const updatedTask = {
        ...existingTask,
        ...updates,
        id,
        updatedAt: Date.now(),
      };

      this.console.log(
        "updatedTask before validation:",
        JSON.stringify(updatedTask),
      );
      const validatedTask = PollingTaskSchema.parse(updatedTask);
      this.console.log(
        "validatedTask after validation:",
        JSON.stringify(validatedTask),
      );

      const db = await this.getDb();

      const statement = await db.prepare(
        `UPDATE polling_tasks SET 
          tabId = ?, tabName = ?, providerId = ?, providerName = ?,
          providerType = ?, payload = ?, interval = ?, lastPolled = ?,
          isActive = ?, lastHealthCheck = ?, healthStatus = ?, updatedAt = ?
        WHERE id = ?`,
      );

      await statement.run(
        validatedTask.tabId,
        validatedTask.tabName,
        validatedTask.providerId,
        validatedTask.providerName,
        validatedTask.providerType,
        validatedTask.payload,
        validatedTask.interval,
        validatedTask.lastPolled,
        validatedTask.isActive ? 1 : 0,
        validatedTask.lastHealthCheck || null,
        validatedTask.healthStatus,
        validatedTask.updatedAt,
        id,
      );

      return validatedTask;
    } catch (error) {
      this.console.error("Error in updatePollingTask:" + error);
      return null;
    }
  }

  async deletePollingTask(id: string): Promise<boolean> {
    try {
      if (!id) {
        this.console.error("Invalid ID provided to deletePollingTask");
        return false;
      }
      const db = await this.getDb();
      const statement = await db.prepare(
        "DELETE FROM polling_tasks WHERE id = ?",
      );
      const result = await statement.run(id);
      return result.changes > 0;
    } catch (error) {
      this.console.error("Error in deletePollingTask:" + error);
      return false;
    }
  }

  async listPollingTasks(
    filters?: Partial<{
      tabId: string;
      isActive: boolean;
      providerId: string;
    }>,
  ): Promise<PollingTask[]> {
    try {
      const db = await this.getDb();
      let query = "SELECT * FROM polling_tasks WHERE 1=1";
      const params: any[] = [];

      if (filters?.tabId) {
        query += " AND tabId = ?";
        params.push(filters.tabId);
      }

      if (filters?.isActive !== undefined) {
        query += " AND isActive = ?";
        params.push(filters.isActive ? 1 : 0);
      }

      if (filters?.providerId) {
        query += " AND providerId = ?";
        params.push(filters.providerId);
      }

      const statement = await db.prepare(query);
      const results = await statement.all<any[]>(...params);

      return results.map((task: any) =>
        PollingTaskSchema.parse({
          id: String(task.id),
          tabId: String(task.tabId),
          tabName: String(task.tabName),
          providerId: String(task.providerId),
          providerName: String(task.providerName),
          providerType: String(task.providerType),
          payload: String(task.payload),
          interval: Number(task.interval),
          lastPolled: Number(task.lastPolled),
          isActive: Boolean(task.isActive),
          lastHealthCheck: task.lastHealthCheck
            ? Number(task.lastHealthCheck)
            : undefined,
          healthStatus: String(task.healthStatus) as
            | "healthy"
            | "unhealthy"
            | "unknown",
          createdAt: Number(task.createdAt),
          updatedAt: Number(task.updatedAt),
        }),
      );
    } catch (error) {
      this.console.error("Error in listPollingTasks:" + error);
      return [];
    }
  }

  async updateTaskHealth(
    id: string,
    healthStatus: "healthy" | "unhealthy" | "unknown",
  ): Promise<PollingTask | null> {
    return this.updatePollingTask(id, {
      healthStatus,
      lastHealthCheck: Date.now(),
    });
  }

  async updateLastPolled(
    id: string,
    timestamp: number,
  ): Promise<PollingTask | null> {
    return this.updatePollingTask(id, {
      lastPolled: timestamp,
    });
  }

  async deactivateTask(id: string): Promise<PollingTask | null> {
    return this.updatePollingTask(id, {
      isActive: false,
    });
  }

  async activateTask(id: string): Promise<PollingTask | null> {
    return this.updatePollingTask(id, {
      isActive: true,
    });
  }

  async getActivePollingTasks(): Promise<PollingTask[]> {
    return this.listPollingTasks({ isActive: true });
  }
}

let pollingTaskService: PollingTaskService | null = null;

export function initPollingTaskService(sdk: CaidoBackendSDK): void {
  if (pollingTaskService) {
    console.warn("PollingTask service already initialized.");
    return;
  }
  pollingTaskService = new PollingTaskService(sdk);
}

export function getPollingTaskService(): PollingTaskService {
  if (!pollingTaskService) {
    throw new Error(
      "PollingTask service not initialized. Call initPollingTaskService first.",
    );
  }
  return pollingTaskService;
}
