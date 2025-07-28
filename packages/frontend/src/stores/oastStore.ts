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
  timestamp: string;
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
  lastPolled: number; // Timestamp
  interval: number; // Polling interval in milliseconds
  stop: () => void;
}

interface PollingListItem {
  id: string;
  payload: string;
  provider: string;
  lastPolled: number;
  interval: number;
}

/**
 * Store for managing OAST (Out-of-band Application Security Testing) data
 * Handles interactions and active provider state persistence
 */
export const useOastStore = defineStore("oast", () => {
  const sdk = useSDK();
  const tabs = ref([{ id: "default", name: "Tab 1" }]);
  const activeTabId = ref("default");
  const interactions = ref<Record<string, OastInteraction[]>>({ default: [] });
  const activeProviders = ref<Record<string, any>>({}); // Stores data for active providers by type
  const pollingList = ref<PollingListItem[]>([]);
  const pollingFunctions = ref<Record<string, () => void>>({});
  // Unread count for sidebar badge
  const unreadCount = ref(0);
  // OAST 탭 활성화 상태
  const isOastTabActive = ref(false);

  // Storage keys for persisting data between sessions
  const storageKeyOastData = "omnioast.oastData";
  const storageKeyActiveProviders = "omnioast.activeProviders";
  const storageKeyPollingList = "omnioast.pollingList";

  /**
   * Loads saved interactions and tabs from storage
   */
  const loadInteractions = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyOastData]) {
      const oastData = storage[storageKeyOastData];
      if (oastData.tabs && oastData.interactions && oastData.activeTabId) {
        tabs.value = oastData.tabs;
        interactions.value = oastData.interactions;
        activeTabId.value = oastData.activeTabId;
        
        if (tabs.value.length === 0) {
            tabs.value = [{ id: "default", name: "Tab 1" }];
            interactions.value = { default: [] };
            activeTabId.value = "default";
        }
        return;
      }
    }
    
    tabs.value = [{ id: "default", name: "Tab 1" }];
    interactions.value = { default: [] };
    activeTabId.value = "default";
  };

  /**
   * Saves current interactions and tabs to persistent storage
   */
  const saveInteractions = async () => {
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyOastData] = {
        tabs: tabs.value,
        interactions: interactions.value,
        activeTabId: activeTabId.value,
    };
    await sdk.storage.set(storage);
  };

  /**
   * Adds a new interaction to the store and persists it
   * @param interaction The new OAST interaction to add
   */
  const addInteraction = async (interaction: OastInteraction) => {
    if (!interactions.value[activeTabId.value]) {
      interactions.value[activeTabId.value] = [];
    }
    interactions.value[activeTabId.value].unshift(interaction);
    await saveInteractions();
    // OAST 탭이 활성화되어 있지 않을 때만 count 증가
    if (!isOastTabActive.value) {
      unreadCount.value += 1;
      // SidebarItem의 setCount 사용
      const sidebarItem = (window as any).oastSidebarItem;
      if (sidebarItem && typeof sidebarItem.setCount === "function") {
        sidebarItem.setCount(unreadCount.value);
      }
    }
  };

  /**
   * Clears all stored interactions for the active tab
   */
  const clearInteractions = async () => {
    if (interactions.value[activeTabId.value]) {
      interactions.value[activeTabId.value] = [];
      await saveInteractions();
    }
  };

  const addTab = async () => {
    const newTabId = `tab-${Date.now()}`;
    const newTabName = `Tab ${tabs.value.length + 1}`;
    tabs.value.push({ id: newTabId, name: newTabName });
    interactions.value[newTabId] = [];
    activeTabId.value = newTabId;
    await saveInteractions();
  };

  const removeTab = async (tabId: string) => {
    const tabIndex = tabs.value.findIndex(t => t.id === tabId);
    if (tabIndex > -1) {
        tabs.value.splice(tabIndex, 1);
        delete interactions.value[tabId];

        if (activeTabId.value === tabId) {
            if (tabs.value.length > 0) {
                activeTabId.value = tabs.value[Math.max(0, tabIndex - 1)].id;
            } else {
                addTab();
            }
        }
        await saveInteractions();
    }
  };

  const setActiveTab = async (tabId: string) => {
    activeTabId.value = tabId;
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
    // Update local state first
    const newActiveProviders = Object.fromEntries(
      Object.entries(activeProviders.value).filter(([key]) => key !== type)
    );
    activeProviders.value = newActiveProviders;

    // Update persistent storage
    const storage = (sdk.storage.get() || {}) as Record<string, any>; 
    
    // Ensure storage[storageKeyActiveProviders] is an object, or initialize it
    if (!storage[storageKeyActiveProviders] || typeof storage[storageKeyActiveProviders] !== 'object') {
      storage[storageKeyActiveProviders] = {};
    }
    
    // Now it's safe to delete the property
    delete (storage[storageKeyActiveProviders] as Record<string, any>)[type];
    await sdk.storage.set(storage);
  };

  /**
   * Loads saved polling list from storage
   */
  const loadPollingList = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyPollingList]) {
      const rawList = storage[storageKeyPollingList];
      if (Array.isArray(rawList)) {
        pollingList.value = rawList.filter(
          (item: any): item is PollingListItem => {
            return (
              typeof item.id === "string" &&
              typeof item.payload === "string" &&
              typeof item.provider === "string" &&
              typeof item.lastPolled === "number" &&
              typeof item.interval === "number"
            );
          },
        );
      }
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
    const newPollingItem: PollingListItem = {
      id: polling.id,
      payload: polling.payload,
      provider: polling.provider,
      lastPolled: polling.lastPolled,
      interval: polling.interval,
    };
    pollingList.value.push(newPollingItem);
    pollingFunctions.value[polling.id] = polling.stop;
    await savePollingList();
  };

  /**
   * Updates the last polled timestamp for a specific polling entry.
   * @param pollingId The ID of the polling entry to update.
   * @param timestamp The new timestamp.
   */
  const updatePollingLastPolled = async (
    pollingId: string,
    timestamp: number,
  ) => {
    const index = pollingList.value.findIndex((p) => p.id === pollingId);
    if (index !== -1) {
      const currentPolling = pollingList.value[index];
      if (currentPolling) { // Explicit check for undefined
        const updatedPolling: PollingListItem = {
          ...currentPolling,
          lastPolled: timestamp,
        };
        pollingList.value.splice(index, 1, updatedPolling);
        await savePollingList();
      }
    }
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

  /**
   * Clears the unread count and updates the sidebar badge
   */
  const clearUnreadCount = () => {
    unreadCount.value = 0;
    // SidebarItem의 setCount 사용
    const sidebarItem = (window as any).oastSidebarItem;
    if (sidebarItem && typeof sidebarItem.setCount === "function") {
      sidebarItem.setCount(0);
    }
  };

  /**
   * OAST 탭 활성화 상태를 설정
   */
  const setOastTabActive = (active: boolean) => {
    isOastTabActive.value = active;
  };

  return {
    tabs,
    activeTabId,
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
    updatePollingLastPolled,
    removePolling,
    clearUnreadCount,
    unreadCount,
    setOastTabActive,
    addTab,
    removeTab,
    setActiveTab,
  };
});