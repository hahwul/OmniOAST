import { defineStore } from "pinia";
import { ref } from "vue";

import { useSDK } from "@/plugins/sdk";

interface OastInteraction {
  method: string;
  source: string;
  destination: string;
  provider: string;
  timestamp: string;
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
  const interactshSecret = ref<InteractshSecret | null>(null);

  const storageKeyInteractions = "omnioast.interactions";
  const storageKeyInteractshSecret = "omnioast.interactshSecret";

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

  const loadInteractshSecret = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyInteractshSecret]) {
      interactshSecret.value = storage[storageKeyInteractshSecret];
    }
  };

  const saveInteractshSecret = async (secret: InteractshSecret) => {
    interactshSecret.value = secret;
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyInteractshSecret] = secret;
    await sdk.storage.set(storage);
  };

  const clearInteractshSecret = async () => {
    interactshSecret.value = null;
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    delete storage[storageKeyInteractshSecret];
    await sdk.storage.set(storage);
  };

  // Initial load
  loadInteractions();
  loadInteractshSecret();

  return {
    interactions,
    interactshSecret,
    addInteraction,
    clearInteractions,
    saveInteractshSecret,
    clearInteractshSecret,
    loadInteractions,
    loadInteractshSecret,
  };
});
