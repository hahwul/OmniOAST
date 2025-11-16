import { ref } from "vue";

import type { PollingTask } from "../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";

/**
 * Interface for an active polling session
 */
interface ActivePollingSession {
  pollingId: string;
  intervalId?: number;
  stopFunction?: () => void;
  isRunning: boolean;
  lastPoll: number;
}

/**
 * Polling Task Manager
 * Centralized management of polling tasks with health checking and auto-restart
 */
export function usePollingTaskManager() {
  const sdk = useSDK();

  // In-memory map of active polling sessions
  const activeSessions = ref<Map<string, ActivePollingSession>>(new Map());
  
  // Health check interval (check every 30 seconds)
  const HEALTH_CHECK_INTERVAL = 30000;
  
  // Maximum time without a poll before considering unhealthy (2x polling interval + buffer)
  const UNHEALTHY_THRESHOLD_MULTIPLIER = 2.5;

  // Health check timer
  let healthCheckTimer: number | null = null;

  /**
   * Register a new polling task in the database (if persistent polling is enabled)
   */
  async function registerPollingTask(task: {
    id: string;
    tabId: string;
    tabName: string;
    providerId: string;
    providerName: string;
    providerType: string;
    payload: string;
    interval: number;
  }): Promise<void> {
    try {
      const settings = await sdk.backend.getCurrentSettings();
      
      // Only persist to database if persistent polling is enabled
      if (settings?.enablePersistentPolling) {
        await sdk.backend.createPollingTask({
          id: task.id,
          tabId: task.tabId,
          tabName: task.tabName,
          providerId: task.providerId,
          providerName: task.providerName,
          providerType: task.providerType,
          payload: task.payload,
          interval: task.interval,
          lastPolled: Date.now(),
          isActive: true,
          healthStatus: "unknown",
        });
        console.log("Polling task registered in database:", task.id);
      }
    } catch (error) {
      console.error("Failed to register polling task:", error);
    }
  }

  /**
   * Start an active polling session
   */
  function startPollingSession(
    pollingId: string,
    stopFunction: () => void,
    intervalId?: number,
  ): void {
    activeSessions.value.set(pollingId, {
      pollingId,
      stopFunction,
      intervalId,
      isRunning: true,
      lastPoll: Date.now(),
    });
    console.log("Polling session started:", pollingId);
  }

  /**
   * Update the last poll timestamp for a polling session
   */
  async function updatePollingTimestamp(pollingId: string): Promise<void> {
    const session = activeSessions.value.get(pollingId);
    if (session) {
      session.lastPoll = Date.now();
      activeSessions.value.set(pollingId, session);
    }

    // Update in database if persistent polling is enabled
    try {
      const settings = await sdk.backend.getCurrentSettings();
      if (settings?.enablePersistentPolling) {
        await sdk.backend.updateLastPolled(pollingId, Date.now());
      }
    } catch (error) {
      console.error("Failed to update polling timestamp:", error);
    }
  }

  /**
   * Stop a polling session
   */
  async function stopPollingSession(pollingId: string): Promise<void> {
    const session = activeSessions.value.get(pollingId);
    if (session) {
      // Stop the polling
      if (session.stopFunction) {
        session.stopFunction();
      }
      
      // Remove from active sessions
      activeSessions.value.delete(pollingId);
      console.log("Polling session stopped:", pollingId);
    }

    // Deactivate in database
    try {
      const settings = await sdk.backend.getCurrentSettings();
      if (settings?.enablePersistentPolling) {
        await sdk.backend.deactivateTask(pollingId);
      }
    } catch (error) {
      console.error("Failed to deactivate polling task:", error);
    }
  }

  /**
   * Check if a polling session is healthy
   */
  function isSessionHealthy(
    session: ActivePollingSession,
    task: PollingTask,
  ): boolean {
    const now = Date.now();
    const timeSinceLastPoll = now - session.lastPoll;
    const unhealthyThreshold = task.interval * UNHEALTHY_THRESHOLD_MULTIPLIER;

    return session.isRunning && timeSinceLastPoll < unhealthyThreshold;
  }

  /**
   * Perform health check on all active polling sessions
   */
  async function performHealthCheck(): Promise<void> {
    try {
      const settings = await sdk.backend.getCurrentSettings();
      if (!settings?.enablePersistentPolling) {
        // Health check only runs when persistent polling is enabled
        return;
      }

      const activeTasks = await sdk.backend.getActivePollingTasks();
      
      for (const task of activeTasks) {
        const session = activeSessions.value.get(task.id);
        
        let healthStatus: "healthy" | "unhealthy" | "unknown" = "unknown";
        
        if (session) {
          healthStatus = isSessionHealthy(session, task) ? "healthy" : "unhealthy";
        } else {
          // Session doesn't exist in memory but is marked as active in DB
          healthStatus = "unhealthy";
        }

        // Update health status in database
        if (task.healthStatus !== healthStatus) {
          await sdk.backend.updateTaskHealth(task.id, healthStatus);
          console.log(`Polling task ${task.id} health updated to: ${healthStatus}`);
        }

        // Auto-restart unhealthy tasks
        if (healthStatus === "unhealthy") {
          console.warn(`Polling task ${task.id} is unhealthy. Manual restart required.`);
          // Note: Auto-restart would require access to provider and tab context
          // This would need to be implemented at a higher level (in Oast.vue)
        }
      }
    } catch (error) {
      console.error("Health check failed:", error);
    }
  }

  /**
   * Start the health check timer
   */
  function startHealthCheck(): void {
    if (healthCheckTimer) {
      return; // Already running
    }

    console.log("Starting polling task health check");
    healthCheckTimer = window.setInterval(
      performHealthCheck,
      HEALTH_CHECK_INTERVAL,
    );
    
    // Run initial health check
    performHealthCheck();
  }

  /**
   * Stop the health check timer
   */
  function stopHealthCheck(): void {
    if (healthCheckTimer) {
      window.clearInterval(healthCheckTimer);
      healthCheckTimer = null;
      console.log("Stopped polling task health check");
    }
  }

  /**
   * Restore active polling tasks from database
   * Returns the list of tasks that need to be restarted
   */
  async function restorePollingTasks(): Promise<PollingTask[]> {
    try {
      const settings = await sdk.backend.getCurrentSettings();
      if (!settings?.enablePersistentPolling) {
        console.log("Persistent polling is disabled, skipping restore");
        return [];
      }

      const activeTasks = await sdk.backend.getActivePollingTasks();
      console.log(`Found ${activeTasks.length} active polling tasks to restore`);
      
      return activeTasks;
    } catch (error) {
      console.error("Failed to restore polling tasks:", error);
      return [];
    }
  }

  /**
   * Delete a polling task from the database
   */
  async function deletePollingTask(pollingId: string): Promise<void> {
    try {
      await sdk.backend.deletePollingTask(pollingId);
      console.log("Polling task deleted from database:", pollingId);
    } catch (error) {
      console.error("Failed to delete polling task:", error);
    }
  }

  /**
   * Get the health status of a polling task
   */
  function getPollingTaskHealth(pollingId: string): {
    isActive: boolean;
    healthStatus: "healthy" | "unhealthy" | "unknown";
  } {
    const session = activeSessions.value.get(pollingId);
    
    if (!session) {
      return { isActive: false, healthStatus: "unknown" };
    }

    return {
      isActive: session.isRunning,
      healthStatus: session.isRunning ? "healthy" : "unhealthy",
    };
  }

  return {
    registerPollingTask,
    startPollingSession,
    updatePollingTimestamp,
    stopPollingSession,
    startHealthCheck,
    stopHealthCheck,
    performHealthCheck,
    restorePollingTasks,
    deletePollingTask,
    getPollingTaskHealth,
    activeSessions,
  };
}
