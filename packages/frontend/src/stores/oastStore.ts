import { defineStore } from "pinia";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";

/**
 * Interface representing an Out-of-band Application Security Testing interaction
 * Captures details about callbacks received by OAST providers
 */
interface OastInteraction {
  id: string;
  type: string; // e.g., "BOAST", "interactsh"
  timestamp: number;
  provider: string; // Name of the provider
  correlationId: string;
  // Optional fields for specific interaction types
  protocol?: string;
  method?: string;
  source?: string;
  destination?: string;
  rawRequest?: string;
  rawResponse?: string;
  data: any; // Raw event data from OASTEvent
}

/**
 * Interface representing a polling OAST payload
 */
interface Polling {
  id: string;
  payload: string;
  provider: string;
  stop: () => void;
}

/**
 * Store for managing OAST (Out-of-band Application Security Testing) data
 * Handles interactions and active provider state persistence
 */
export const useOastStore = defineStore("oast", () => {
  const sdk = useSDK();
  const interactions = ref<OastInteraction[]>([]);
  const activeProviders = ref<Record<string, any>>({}); // Stores data for active providers by type
  const pollingList = ref<Omit<Polling, 'stop'>[]>([]);
  const pollingFunctions = ref<Record<string, () => void>>({});

  // Storage keys for persisting data between sessions
  const storageKeyInteractions = "omnioast.interactions";
  const storageKeyActiveProviders = "omnioast.activeProviders";
  const storageKeyPollingList = "omnioast.pollingList";


  /**
   * Loads saved interactions from storage
   */
  const loadInteractions = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyInteractions]) {
      interactions.value = storage[storageKeyInteractions];
    }
  };

  /**
   * Saves current interactions to persistent storage
   */
  const saveInteractions = async () => {
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyInteractions] = interactions.value;
    await sdk.storage.set(storage);
  };

  /**
   * Adds a new interaction to the store and persists it
   * @param interaction The new OAST interaction to add
   */
  const addInteraction = async (interaction: OastInteraction) => {
    interactions.value.unshift(interaction);
    await saveInteractions();
  };

  /**
   * Clears all stored interactions
   */
  const clearInteractions = async () => {
    interactions.value = [];
    await saveInteractions();
  };

  /**
   * Loads saved provider data from storage
   */
  const loadProviderData = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyActiveProviders]) {
      activeProviders.value = storage[storageKeyActiveProviders];
    }
  };

  /**
   * Saves provider data to persistent storage
   * @param type Provider type identifier
   * @param data Provider-specific data to save
   */
  const saveProviderData = async (type: string, data: any) => {
    activeProviders.value[type] = data;
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyActiveProviders] = activeProviders.value;
    await sdk.storage.set(storage);
  };

  /**
   * Clears stored data for a specific provider type
   * @param type Provider type to clear data for
   */
  const clearProviderData = async (type: string) => {
    delete activeProviders.value[type];
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    delete storage[storageKeyActiveProviders];
    await sdk.storage.set(storage);
  };

  /**
   * Loads saved polling list from storage
   */
  const loadPollingList = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyPollingList]) {
      pollingList.value = storage[storageKeyPollingList];
    }
  };

  /**
   * Saves current polling list to persistent storage
   */
  const savePollingList = async () => {
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyPollingList] = pollingList.value;
    await sdk.storage.set(storage);
  };

  /**
   * Adds a new polling to the store and persists it
   * @param polling The new OAST polling to add
   */
  const addPolling = async (polling: Polling) => {
    const { stop, ...rest } = polling;
    pollingList.value.push(rest);
    pollingFunctions.value[polling.id] = stop;
    await savePollingList();
  };

  /**
   * Removes a polling from the store and persists it
   * @param pollingId The ID of the polling to remove
   */
  const removePolling = async (pollingId: string) => {
    const stopFn = pollingFunctions.value[pollingId];
    if (stopFn) {
      stopFn();
      delete pollingFunctions.value[pollingId];
    }
    pollingList.value = pollingList.value.filter((p) => p.id !== pollingId);
    await savePollingList();
  };

  // Initial load of stored data when the store is created
  loadInteractions();
  loadProviderData();
  loadPollingList();

  return {
    interactions,
    activeProviders,
    pollingList,
    addInteraction,
    clearInteractions,
    saveProviderData,
    clearProviderData,
    loadInteractions,
    loadProviderData,
    addPolling,
    removePolling,
  };
});
