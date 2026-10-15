import { v4 as uuidv4 } from "uuid";

import type { Provider } from "../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useClientService as useInteractshClient } from "@/services/interactsh";
import { useOastStore } from "@/stores/oastStore";
import { formatTimestamp, toNumericTimestamp } from "@/utils/time";

type IntervalHandle = ReturnType<typeof setTimeout>;
type OastStore = ReturnType<typeof useOastStore>;
type PollingItem = OastStore["pollingList"][number];
type InteractshOptions = Parameters<
  ReturnType<typeof useInteractshClient>["start"]
>[0];

interface RunningTask {
  id: string;
  intervalId?: IntervalHandle;
  type: Provider["type"];
  providerId: string | undefined;
}

const runningTasks: Record<string, RunningTask> = {};

/**
 * Creates an interactsh interaction callback for use with the client.
 * Shared by background polling and the manual one-shot poll in Oast.vue.
 */
export function createInteractshCallback(
  oastStore: OastStore,
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
        // Dedup against the task's own tab: providers like webhook.site return
        // their full history on every poll, and the active tab may be another one.
        const tabInteractions =
          oastStore.tabs.find((t) => t.id === tabId)?.interactions ?? [];
        for (const event of events) {
          const exists = tabInteractions.some((i) => i.id === event.id);
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

  const clearTask = (pollingId: string) => {
    const task = runningTasks[pollingId];
    if (task?.intervalId) clearTimeout(task.intervalId);
    delete runningTasks[pollingId];
  };

  // Starts an interactsh client for a polling task and registers its timer and
  // stop function. Throws if the client fails to start.
  const startInteractsh = async (
    item: PollingItem,
    providerName: string,
    providerId: string | undefined,
    options: InteractshOptions,
  ) => {
    const pollingId = item.id;
    const client = useInteractshClient();
    await client.start(
      { ...options, keepAliveInterval: item.interval },
      createInteractshCallback(oastStore, pollingId, providerName, item.tabId),
    );

    // A fresh start gets a new correlation ID: persist the new session + payload
    if (!options.sessionInfo) {
      const si = await client.getSessionInfo();
      const { url } = client.generateUrl();
      await oastStore.updatePolling(pollingId, {
        session: si ? { type: "interactsh", ...si } : undefined,
        providerId,
        payload: url || item.payload,
      });
    }

    // Record last-checked periodically regardless of new events
    const tick = () => {
      oastStore.updatePollingLastPolled(pollingId, Date.now());
      const task = runningTasks[pollingId];
      if (task) task.intervalId = setTimeout(tick, item.interval);
    };
    runningTasks[pollingId] = {
      id: pollingId,
      intervalId: setTimeout(tick, item.interval),
      type: "interactsh",
      providerId,
    };

    // Pausing only stops polling so callbacks keep queueing on the server;
    // removing the task (deregister=true) also deregisters the session.
    const stopFn = async (deregister?: boolean) => {
      try {
        if (deregister) await client.stop();
        else client.stopPolling();
      } catch (_) {}
      clearTask(pollingId);
      oastStore.setPollingRunning(pollingId, false);
    };
    oastStore.registerPollingStop(pollingId, stopFn);
    oastStore.setPollingRunning(pollingId, true);
  };

  const resume = async (pollingId: string) => {
    const item = oastStore.pollingList.find((p) => p.id === pollingId);
    if (!item) return false;

    // Fast path for Interactsh: resume directly from stored session without provider lookup
    if (item.session && item.session.type === "interactsh") {
      try {
        await startInteractsh(item, item.provider, item.providerId, {
          serverURL: item.session.serverURL,
          token: item.session.token,
          sessionInfo: {
            serverURL: item.session.serverURL,
            token: item.session.token,
            privateKey: item.session.privateKey || "",
            correlationID: item.session.correlationID,
            secretKey: item.session.secretKey,
            publicKey: item.session.publicKey,
          },
        });
        return true;
      } catch (e) {
        console.error(
          "Resume Interactsh with stored session failed; will try provider",
          e,
        );
        clearTask(pollingId);
      }
    }

    // Resolve provider by ID first, fallback to name
    const providers = await sdk.backend.listProviders();
    const provider =
      providers.find((p: Provider) => p.id === item.providerId) ??
      providers.find((p: Provider) => p.name === item.provider);
    if (!provider) {
      oastStore.setPollingRunning(pollingId, false);
      sdk.window.showToast("Provider not found for this task", {
        variant: "error",
      });
      return false;
    }

    if (provider.type === "interactsh") {
      // Fresh session from provider settings, retried once for transient failures
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await startInteractsh(item, provider.name, provider.id, {
            serverURL: provider.url,
            token: provider.token || "",
          });
          return true;
        } catch (e) {
          console.error(
            `Fresh Interactsh start failed (attempt ${attempt})`,
            e,
          );
          clearTask(pollingId);
        }
      }
      sdk.window.showToast("Failed to resume Interactsh", { variant: "error" });
      oastStore.setPollingRunning(pollingId, false);
      return false;
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

    // Registered before the first (possibly slow) tick so a pause during it sticks
    oastStore.registerPollingStop(pollingId, () => {
      clearTask(pollingId);
      oastStore.setPollingRunning(pollingId, false);
    });
    oastStore.setPollingRunning(pollingId, true);

    // First immediate tick then recursive timeout
    await doTick();
    return true;
  };

  // Concurrent so one slow first poll (a PostBin drain can take 20s+) doesn't
  // hold up the rest; allSettled so one failure doesn't abort the others.
  const resumeAll = async () => {
    await Promise.allSettled(
      oastStore.pollingList
        .filter((item) => oastStore.pollingStatus[item.id] !== "running")
        .map((item) => resume(item.id)),
    );
  };

  return {
    resumeAll,
    resume,
    pollOnce,
  };
}
