import { defineStore } from "pinia";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";
import { OASTEvent } from "../../backend/types";

interface OastInteraction {
  id: string;
  type: string; // e.g., "BOAST", "interactsh"
  timestamp: number;
  provider: string; // Name of the provider
  correlationId: string;
  // Optional fields for specific interaction types
  method?: string;
  source?: string;
  destination?: string;
  rawRequest?: string;
  rawResponse?: string;
  data: any; // Raw event data from OASTEvent
}

interface InteractshSecret {
  secret: string;
  domain: string;
  correlationId: string;
  lastFetched: number;
}

export const useOastStore = defineStore("oast", () => {
  const sdk = useSDK();
  const interactions = ref<OastInteraction[]>([]);
  const activeProviders = ref<Record<string, any>>({}); // Stores data for active providers by type

  const storageKeyInteractions = "omnioast.interactions";
  const storageKeyActiveProviders = "omnioast.activeProviders";

  const loadInteractions = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyInteractions]) {
      interactions.value = storage[storageKeyInteractions];
    }
  };

  const saveInteractions = async () => {
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyInteractions] = interactions.value;
    await sdk.storage.set(storage);
  };

  const addInteraction = async (interaction: OastInteraction) => {
    interactions.value.unshift(interaction);
    await saveInteractions();
  };

  const clearInteractions = async () => {
    interactions.value = [];
    await saveInteractions();
  };

  const loadProviderData = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyActiveProviders]) {
      activeProviders.value = storage[storageKeyActiveProviders];
    }
  };

  const saveProviderData = async (type: string, data: any) => {
    activeProviders.value[type] = data;
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyActiveProviders] = activeProviders.value;
    await sdk.storage.set(storage);
  };

  const clearProviderData = async (type: string) => {
    delete activeProviders.value[type];
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    delete storage[storageKeyActiveProviders];
    await sdk.storage.set(storage);
  };

  // Initial load
  loadInteractions();
  loadProviderData();

  return {
    interactions,
    activeProviders,
    addInteraction,
    clearInteractions,
    saveProviderData,
    clearProviderData,
    loadInteractions,
    loadProviderData,
  };
});
