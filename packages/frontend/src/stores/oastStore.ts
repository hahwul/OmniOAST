import { v4 as uuidv4 } from "uuid";
import { defineStore } from "pinia";
import { ref, computed } from "vue";

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
  id:string;
  payload: string;
  provider: string;
  lastPolled: number; // Timestamp
  interval: number; // Polling interval in milliseconds
  stop: () => void;
  tabId: string;
  tabName: string;
}

interface PollingListItem {
  id: string;
  payload: string;
  provider: string;
  lastPolled: number;
  interval: number;
  tabId: string;
  tabName: string;
}

/**
 * Interface representing a single OAST tab state
 */
interface OastTab {
  id: string;
  name: string;
  interactions: OastInteraction[];
}

/**
 * Store for managing OAST (Out-of-band Application Security Testing) data
 * Handles interactions and active provider state persistence
 */
export const useOastStore = defineStore("oast", () => {
  const sdk = useSDK();
  const tabs = ref<OastTab[]>([]);
  const activeTabId = ref<string | null>(null);

  const activeProviders = ref<Record<string, any>>({}); // Stores data for active providers by type
  const pollingList = ref<PollingListItem[]>([]);
  const pollingFunctions = ref<Record<string, () => void>>({});
  // Unread count for sidebar badge
  const unreadCount = ref(0);
  // OAST 탭 활성화 상태
  const isOastTabActive = ref(false);

  // Storage keys for persisting data between sessions
  const storageKeyTabs = "omnioast.tabs";
  const storageKeyActiveTabId = "omnioast.activeTabId";
  const storageKeyActiveProviders = "omnioast.activeProviders";
  const storageKeyPollingList = "omnioast.pollingList";

  const activeTab = computed(() => {
    if (!activeTabId.value) return null;
    return tabs.value.find((t) => t.id === activeTabId.value) || null;
  });

  const interactions = computed(() => {
    return activeTab.value ? activeTab.value.interactions : [];
  });

  /**
   * Loads saved tabs and active tab from storage
   */
  const loadTabs = () => {
    const storage = sdk.storage.get() as Record<string, any> | null;
    if (storage && storage[storageKeyTabs]) {
      tabs.value = storage[storageKeyTabs];
      activeTabId.value = storage[storageKeyActiveTabId] || null;

      if (tabs.value.length > 0 && !activeTabId.value) {
        activeTabId.value = tabs.value[0].id;
      }
    }

    if (tabs.value.length === 0) {
      addTab();
    }
  };

  /**
   * Saves current tabs and active tab to persistent storage
   */
  const saveTabs = async () => {
    const storage = (sdk.storage.get() as Record<string, any>) || {};
    storage[storageKeyTabs] = tabs.value;
    storage[storageKeyActiveTabId] = activeTabId.value;
    await sdk.storage.set(storage);
  };

  /**
   * Adds a new tab
   */
  const addTab = () => {
    const newTab: OastTab = {
      id: uuidv4(),
      name: `Tab ${tabs.value.length + 1}`,
      interactions: [],
    };
    tabs.value.push(newTab);
    activeTabId.value = newTab.id;
    saveTabs();
  };

  /**
   * Removes a tab
   * @param tabId The ID of the tab to remove
   */
  const removeTab = (tabId: string) => {
    const index = tabs.value.findIndex((t) => t.id === tabId);
    if (index > -1) {
      tabs.value.splice(index, 1);
      if (activeTabId.value === tabId) {
        activeTabId.value = tabs.value.length > 0 ? tabs.value[0].id : null;
      }
      saveTabs();
    }
  };

  /**
   * Sets the active tab
   * @param tabId The ID of the tab to set as active
   */
  const setActiveTab = (tabId: string) => {
    activeTabId.value = tabId;
    saveTabs();
  };

  /**
   * Adds a new interaction to the active tab and persists it
   * @param interaction The new OAST interaction to add
   */
  const addInteraction = async (interaction: OastInteraction, tabId?: string) => {
    const targetTab = tabId ? tabs.value.find((t) => t.id === tabId) : activeTab.value;

    if (targetTab) {
      targetTab.interactions.unshift(interaction);
      await saveTabs();

      if (!isOastTabActive.value) {
        unreadCount.value += 1;
        const sidebarItem = (window as any).oastSidebarItem;
        if (sidebarItem && typeof sidebarItem.setCount === "function") {
          sidebarItem.setCount(unreadCount.value);
        }
      }
    }
  };

  /**
   * Clears all stored interactions for the active tab
   */
  const clearInteractions = async () => {
    if (activeTab.value) {
      activeTab.value.interactions = [];
      await saveTabs();
    }
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
      const rawList = storage[storageKeyPollingList];
      if (Array.isArray(rawList)) {
        pollingList.value = rawList.filter(
          (item: any): item is PollingListItem => {
            return (
              typeof item.id === "string" &&
              typeof item.payload === "string" &&
              typeof item.provider === "string" &&
              typeof item.lastPolled === "number" &&
              typeof item.interval === "number" &&
              typeof item.tabId === "string" &&
              typeof item.tabName === "string"
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
      tabId: polling.tabId,
      tabName: polling.tabName,
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
      const currentPolling = pollingList.value[index] as PollingListItem;
      const updatedPolling: PollingListItem = {
        ...currentPolling,
        lastPolled: timestamp,
      };
      pollingList.value.splice(index, 1, updatedPolling);
      await savePollingList();
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
  loadTabs();
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
    activeTab,
    interactions,
    activeProviders,
    pollingList,
    addTab,
    removeTab,
    setActiveTab,
    addInteraction,
    clearInteractions,
    saveProviderData,
    clearProviderData,
    loadProviderData,
    addPolling,
    updatePollingLastPolled,
    removePolling,
    clearUnreadCount,
    unreadCount,
    setOastTabActive,
  };
});