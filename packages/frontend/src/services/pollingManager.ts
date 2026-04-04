import { v4 as uuidv4 } from "uuid";

import type { Provider } from "../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useClientService as useInteractshClient } from "@/services/interactsh";
import { useOastStore } from "@/stores/oastStore";
import { formatTimestamp, toNumericTimestamp } from "@/utils/time";

type IntervalHandle = ReturnType<typeof setTimeout>;

interface RunningTask {
  id: string;
  intervalId?: IntervalHandle;
  type: Provider["type"];
  providerId: string | undefined;
}

const runningTasks: Record<string, RunningTask> = {};

/**
 * Creates an interactsh interaction callback for use with the client.
 * Extracts the common logic that was duplicated across resume paths.
 */
function createInteractshCallback(
  oastStore: ReturnType<typeof useOastStore>,
  pollingId: string,
  providerName: string,
  tabId: string,
) {
  return (interaction: Record<string, unknown>) => {
    const method = (interaction as any)["q-type"]
      ? String((interaction as any)["q-type"])
      : typeof (interaction as any)["raw-request"] === "string"
        ? (interaction as any)["raw-request"].split(" ")[0] || ""
        : "";

    oastStore.addInteraction(
      {
        id: uuidv4(),
        type: "interactsh",
        correlationId: String((interaction as any)["full-id"]),
        data: interaction,
        protocol: String((interaction as any).protocol),
        method,
        source: String((interaction as any)["remote-address"]),
        destination: String((interaction as any)["full-id"]),
        provider: providerName,
        timestamp: formatTimestamp((interaction as any).timestamp),
        timestampNum: toNumericTimestamp((interaction as any).timestamp),
        rawRequest: String((interaction as any)["raw-request"]),
        rawResponse: String((interaction as any)["raw-response"]),
      },
      tabId,
    );
    oastStore.updatePollingLastPolled(pollingId, Date.now());
  };
}

export function usePollingManager() {
  const oastStore = useOastStore();
  const sdk = useSDK();

  const pollOnce = async (provider: Provider, tabId: string) => {
    try {
      const events = await sdk.backend.getOASTEvents(provider);
      if (events && events.length > 0) {
        for (const event of events) {
          const exists = oastStore.interactions.some((i) => i.id === event.id);
          if (!exists) {
            oastStore.addInteraction(
              {
                id: event.id,
                type: String(provider.type),
                correlationId: event.correlationId,
                data: event,
                protocol: event.protocol,
                method: event.method,
                source: event.source,
                destination: event.destination,
                provider: provider.name,
                timestamp: formatTimestamp(event.timestamp),
                timestampNum: toNumericTimestamp(event.timestamp),
                rawRequest: event.rawRequest,
                rawResponse: event.rawResponse,
              },
              tabId,
            );
          }
        }
      }
    } catch (e) {
      console.error("PollingManager.pollOnce error", e);
      throw e;
    }
  };

  const resume = async (pollingId: string) => {
    const item = oastStore.pollingList.find((p) => p.id === pollingId);
    if (!item) return false;

    // Fast path for Interactsh: resume directly from stored session without provider lookup
    if (item.session && item.session.type === "interactsh") {
      try {
        const client = useInteractshClient();
        await client.start(
          {
            serverURL: item.session.serverURL,
            token: item.session.token,
            keepAliveInterval: item.interval,
            sessionInfo: {
              serverURL: item.session.serverURL,
              token: item.session.token,
              privateKey: item.session.privateKey || "",
              correlationID: item.session.correlationID,
              secretKey: item.session.secretKey,
              publicKey: item.session.publicKey,
            },
          } as any,
          createInteractshCallback(oastStore, pollingId, item.provider, item.tabId),
        );

        // Record last-checked periodically regardless of new events
        const tick = () => {
          oastStore.updatePollingLastPolled(pollingId, Date.now());
          const task = runningTasks[pollingId];
          if (task) {
            task.intervalId = setTimeout(tick, item.interval);
          }
        };

        const intervalId = setTimeout(tick, item.interval);

        runningTasks[pollingId] = {
          id: pollingId,
          intervalId,
          type: "interactsh",
          providerId: item.providerId,
        };

        const stopFn = async () => {
          try {
            await client.stop();
          } catch (_) {}
          const task = runningTasks[pollingId];
          if (task?.intervalId) clearTimeout(task.intervalId);
          delete runningTasks[pollingId];
          oastStore.setPollingRunning(pollingId, false);
        };
        oastStore.registerPollingStop(pollingId, stopFn);
        oastStore.setPollingRunning(pollingId, true);
        return true;
      } catch (e) {
        console.error(
          "Resume Interactsh with stored session failed; will try provider",
          e,
        );
        // Clean up any partially registered task before falling through
        const partialTask = runningTasks[pollingId];
        if (partialTask?.intervalId) clearTimeout(partialTask.intervalId);
        delete runningTasks[pollingId];
        // fall through to provider-based resume
      }
    }

    // Resolve provider by ID first, fallback to name
    const providers = await sdk.backend.listProviders();
    const provider = providers.find(
      (p: Provider) => p.id === item.providerId || p.name === item.provider,
    );
    if (!provider) {
      oastStore.setPollingRunning(pollingId, false);
      sdk.window.showToast("Provider not found for this task", {
        variant: "error",
      });
      return false;
    }

    if (provider.type === "interactsh") {
      try {
        const client = useInteractshClient();
        // Start fresh session using provider settings
        await client.start(
          {
            serverURL: provider.url,
            token: provider.token || "",
            keepAliveInterval: item.interval,
          } as any,
          createInteractshCallback(oastStore, pollingId, provider.name, item.tabId),
        );

        // Update the polling item with new session and payload URL
        if (client.getSessionInfo) {
          const si = await client.getSessionInfo();
          const { url } = client.generateUrl();
          await oastStore.updatePolling(pollingId, {
            session: si
              ? {
                  type: "interactsh",
                  serverURL: si.serverURL,
                  token: si.token,
                  correlationID: si.correlationID,
                  secretKey: si.secretKey,
                  privateKey: si.privateKey,
                  publicKey: si.publicKey,
                }
              : undefined,
            providerId: provider.id,
            payload: url || item.payload,
          });
        }

        runningTasks[pollingId] = {
          id: pollingId,
          type: provider.type,
          providerId: provider.id,
        };

        const stopFn = async () => {
          try {
            await client.stop();
          } catch (_) {}
          delete runningTasks[pollingId];
          oastStore.setPollingRunning(pollingId, false);
        };

        oastStore.registerPollingStop(pollingId, stopFn);
        oastStore.setPollingRunning(pollingId, true);
        return true;
      } catch (e) {
        console.error(
          "Resume interactsh with session failed, retrying fresh",
          e,
        );
        // Clean up any partially registered task before retrying
        const partialTask = runningTasks[pollingId];
        if (partialTask?.intervalId) clearTimeout(partialTask.intervalId);
        delete runningTasks[pollingId];
        // Fallback: try fresh start without session
        try {
          const client = useInteractshClient();
          await client.start(
            {
              serverURL: provider.url,
              token: provider.token || "",
              keepAliveInterval: item.interval,
            },
            createInteractshCallback(oastStore, pollingId, provider.name, item.tabId),
          );

          // Update polling item with new session + payload
          if (client.getSessionInfo) {
            const si = await client.getSessionInfo();
            const { url } = client.generateUrl();
            await oastStore.updatePolling(pollingId, {
              session: si
                ? {
                    type: "interactsh",
                    serverURL: si.serverURL,
                    token: si.token,
                    correlationID: si.correlationID,
                    secretKey: si.secretKey,
                    privateKey: si.privateKey,
                    publicKey: si.publicKey,
                  }
                : undefined,
              providerId: provider.id,
              payload: url || item.payload,
            });
          }

          const tick = () => {
            oastStore.updatePollingLastPolled(pollingId, Date.now());
            const task = runningTasks[pollingId];
            if (task) {
              task.intervalId = setTimeout(tick, item.interval);
            }
          };
          const intervalId = setTimeout(tick, item.interval);

          runningTasks[pollingId] = {
            id: pollingId,
            intervalId,
            type: provider.type,
            providerId: provider.id,
          };

          const stopFn = async () => {
            try {
              await client.stop();
            } catch (_) {}
            const task = runningTasks[pollingId];
            if (task?.intervalId) clearTimeout(task.intervalId);
            delete runningTasks[pollingId];
            oastStore.setPollingRunning(pollingId, false);
          };
          oastStore.registerPollingStop(pollingId, stopFn);
          oastStore.setPollingRunning(pollingId, true);
          return true;
        } catch (e2) {
          console.error("Fresh resume failed", e2);
          sdk.window.showToast("Failed to resume Interactsh", {
            variant: "error",
          });
          oastStore.setPollingRunning(pollingId, false);
          return false;
        }
      }
    }

    // Start interval polling for non-interactsh providers
    let consecutiveFailures = 0;
    const MAX_BACKOFF_MULTIPLIER = 8; // Cap at 8x the base interval

    const doTick = async () => {
      try {
        await pollOnce(provider, item.tabId);
        consecutiveFailures = 0; // Reset on success
      } catch {
        consecutiveFailures++;
      }
      await oastStore.updatePollingLastPolled(pollingId, Date.now());

      const task = runningTasks[pollingId];
      if (task) {
        const backoffMultiplier = Math.min(
          Math.pow(2, consecutiveFailures),
          MAX_BACKOFF_MULTIPLIER,
        );
        task.intervalId = setTimeout(doTick, item.interval * backoffMultiplier);
      }
    };

    runningTasks[pollingId] = {
      id: pollingId,
      type: provider.type,
      providerId: provider.id,
    };

    // First immediate tick then recursive timeout
    await doTick();

    const stopFn = () => {
      const task = runningTasks[pollingId];
      if (task?.intervalId) clearTimeout(task.intervalId);
      delete runningTasks[pollingId];
      oastStore.setPollingRunning(pollingId, false);
    };

    oastStore.registerPollingStop(pollingId, stopFn);
    oastStore.setPollingRunning(pollingId, true);
    return true;
  };

  const stop = (pollingId: string) => {
    const task = runningTasks[pollingId];
    if (task?.intervalId) clearTimeout(task.intervalId);
    delete runningTasks[pollingId];
    oastStore.setPollingRunning(pollingId, false);
  };

  const resumeAll = async () => {
    // Try to resume all non-interactsh tasks. Interactsh marked stopped.
    for (const item of oastStore.pollingList) {
      if (oastStore.pollingStatus[item.id] === "running") continue;
      await resume(item.id);
    }
  };

  return {
    resumeAll,
    resume,
    stop,
  };
}
