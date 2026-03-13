import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock SDK before importing the store
const mockStorage: Record<string, any> = {};
vi.mock("@/plugins/sdk", () => ({
  useSDK: () => ({
    storage: {
      get: () => ({ ...mockStorage }),
      set: vi.fn(async (data: Record<string, any>) => {
        Object.assign(mockStorage, data);
      }),
    },
  }),
}));

vi.mock("uuid", () => ({
  v4: (() => {
    let counter = 0;
    return () => `mock-uuid-${++counter}`;
  })(),
}));

import { useOastStore } from "../stores/oastStore";

function resetStorage() {
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
}

describe("oastStore", () => {
  beforeEach(() => {
    resetStorage();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("Tab Management", () => {
    it("should create a default tab on initialization", () => {
      const store = useOastStore();
      expect(store.tabs.length).toBeGreaterThanOrEqual(1);
      expect(store.activeTabId).toBeTruthy();
    });

    it("should add a new tab and set it active", () => {
      const store = useOastStore();
      const initialCount = store.tabs.length;
      store.addTab();
      expect(store.tabs.length).toBe(initialCount + 1);
      const newTab = store.tabs[store.tabs.length - 1];
      expect(store.activeTabId).toBe(newTab!.id);
    });

    it("should auto-increment tab names avoiding duplicates", () => {
      const store = useOastStore();
      // First tab is "1"
      expect(store.tabs[0]!.name).toBe("1");
      store.addTab();
      expect(store.tabs[1]!.name).toBe("2");
      store.addTab();
      expect(store.tabs[2]!.name).toBe("3");
    });

    it("should remove a tab", () => {
      const store = useOastStore();
      store.addTab();
      const tabToRemove = store.tabs[0]!;
      const remainingTab = store.tabs[1]!;

      store.removeTab(tabToRemove.id);

      expect(store.tabs.length).toBe(1);
      expect(store.tabs[0]!.id).toBe(remainingTab.id);
    });

    it("should switch active tab when removing the active one", () => {
      const store = useOastStore();
      store.addTab();
      const firstTab = store.tabs[0]!;
      const secondTab = store.tabs[1]!;

      store.setActiveTab(firstTab.id);
      store.removeTab(firstTab.id);

      expect(store.activeTabId).toBe(secondTab.id);
    });

    it("should set active tab", () => {
      const store = useOastStore();
      store.addTab();
      const firstTab = store.tabs[0]!;

      store.setActiveTab(firstTab.id);
      expect(store.activeTabId).toBe(firstTab.id);
    });

    it("should update tab name", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.updateTabName(tab.id, "Renamed");
      expect(store.tabs[0]!.name).toBe("Renamed");
    });

    it("should update tab name in polling list too", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: Date.now(),
        interval: 5000,
        stop: () => {},
        tabId: tab.id,
        tabName: tab.name,
      });

      await store.updateTabName(tab.id, "NewName");
      expect(store.pollingList[0]!.tabName).toBe("NewName");
    });
  });

  describe("Computed Properties", () => {
    it("activeTab should return the current active tab", () => {
      const store = useOastStore();
      expect(store.activeTab).toBeTruthy();
      expect(store.activeTab!.id).toBe(store.activeTabId);
    });

    it("interactions should return active tab interactions", async () => {
      const store = useOastStore();
      expect(store.interactions).toEqual([]);

      await store.addInteraction({
        id: "int-1",
        type: "interactsh",
        timestamp: "2026-01-01",
        timestampNum: 1,
        provider: "test",
        correlationId: "corr-1",
        data: {},
      });

      expect(store.interactions.length).toBe(1);
      expect(store.interactions[0]!.id).toBe("int-1");
    });

    it("activeTab should be null when no tabs exist", () => {
      const store = useOastStore();
      // Remove all tabs
      while (store.tabs.length > 0) {
        store.removeTab(store.tabs[0]!.id);
      }
      expect(store.activeTab).toBeNull();
      expect(store.interactions).toEqual([]);
    });
  });

  describe("Interaction Management", () => {
    it("should add interaction with auto-incrementing index", async () => {
      const store = useOastStore();

      await store.addInteraction({
        id: "int-1",
        type: "interactsh",
        timestamp: "2026-01-01",
        timestampNum: 1,
        provider: "test",
        correlationId: "corr-1",
        data: {},
      });

      await store.addInteraction({
        id: "int-2",
        type: "interactsh",
        timestamp: "2026-01-02",
        timestampNum: 2,
        provider: "test",
        correlationId: "corr-2",
        data: {},
      });

      // Latest interactions should be first (unshift)
      expect(store.interactions[0]!.id).toBe("int-2");
      expect(store.interactions[1]!.id).toBe("int-1");
      // Indices should be auto-incremented
      expect(store.interactions[1]!.index).toBeLessThan(
        store.interactions[0]!.index,
      );
    });

    it("should add interaction to a specific tab", async () => {
      const store = useOastStore();
      store.addTab();
      const firstTab = store.tabs[0]!;
      const secondTab = store.tabs[1]!;

      // Add to second tab specifically
      await store.addInteraction(
        {
          id: "int-1",
          type: "interactsh",
          timestamp: "2026-01-01",
          timestampNum: 1,
          provider: "test",
          correlationId: "corr-1",
          data: {},
        },
        secondTab.id,
      );

      expect(firstTab.interactions.length).toBe(0);
      expect(secondTab.interactions.length).toBe(1);
    });

    it("should clear interactions for active tab only", async () => {
      const store = useOastStore();
      store.addTab();
      const firstTab = store.tabs[0]!;
      const secondTab = store.tabs[1]!;

      await store.addInteraction(
        { id: "a", type: "t", timestamp: "", timestampNum: 1, provider: "p", correlationId: "c", data: {} },
        firstTab.id,
      );
      await store.addInteraction(
        { id: "b", type: "t", timestamp: "", timestampNum: 1, provider: "p", correlationId: "c", data: {} },
        secondTab.id,
      );

      store.setActiveTab(firstTab.id);
      await store.clearInteractions();

      expect(firstTab.interactions.length).toBe(0);
      expect(secondTab.interactions.length).toBe(1);
    });

    it("should increment unread count when oast tab is not active", async () => {
      const store = useOastStore();
      store.setOastTabActive(false);

      await store.addInteraction({
        id: "int-1",
        type: "interactsh",
        timestamp: "2026-01-01",
        timestampNum: 1,
        provider: "test",
        correlationId: "corr-1",
        data: {},
      });

      expect(store.unreadCount).toBe(1);
    });

    it("should not increment unread count when oast tab is active", async () => {
      const store = useOastStore();
      store.setOastTabActive(true);

      await store.addInteraction({
        id: "int-1",
        type: "interactsh",
        timestamp: "2026-01-01",
        timestampNum: 1,
        provider: "test",
        correlationId: "corr-1",
        data: {},
      });

      expect(store.unreadCount).toBe(0);
    });

    it("should clear unread count", async () => {
      const store = useOastStore();
      store.setOastTabActive(false);

      await store.addInteraction({
        id: "int-1",
        type: "interactsh",
        timestamp: "",
        timestampNum: 1,
        provider: "p",
        correlationId: "c",
        data: {},
      });

      expect(store.unreadCount).toBe(1);
      store.clearUnreadCount();
      expect(store.unreadCount).toBe(0);
    });
  });

  describe("Polling Management", () => {
    it("should add polling and set status to running", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;
      const stopFn = vi.fn();

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: stopFn,
        tabId: tab.id,
        tabName: tab.name,
      });

      expect(store.pollingList.length).toBe(1);
      expect(store.pollingList[0]!.payload).toBe("test.oast.fun");
      expect(store.pollingStatus["poll-1"]).toBe("running");
    });

    it("should remove polling and call stop function", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;
      const stopFn = vi.fn();

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: stopFn,
        tabId: tab.id,
        tabName: tab.name,
      });

      await store.removePolling("poll-1");

      expect(store.pollingList.length).toBe(0);
      expect(stopFn).toHaveBeenCalled();
      expect(store.pollingStatus["poll-1"]).toBeUndefined();
    });

    it("should update polling last polled timestamp", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: () => {},
        tabId: tab.id,
        tabName: tab.name,
      });

      store.updatePollingLastPolled("poll-1", 9999);
      expect(store.pollingList[0]!.lastChecked).toBe(9999);
    });

    it("should update polling fields", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPolling({
        id: "poll-1",
        payload: "old.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: () => {},
        tabId: tab.id,
        tabName: tab.name,
      });

      await store.updatePolling("poll-1", {
        payload: "new.oast.fun",
        providerId: "prov-1",
      });

      expect(store.pollingList[0]!.payload).toBe("new.oast.fun");
      expect(store.pollingList[0]!.providerId).toBe("prov-1");
    });

    it("should pause polling without removing it", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;
      const stopFn = vi.fn();

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: stopFn,
        tabId: tab.id,
        tabName: tab.name,
      });

      await store.pausePolling("poll-1");

      expect(store.pollingList.length).toBe(1); // still in list
      expect(stopFn).toHaveBeenCalled();
      expect(store.pollingStatus["poll-1"]).toBe("stopped");
    });

    it("should set polling running status", () => {
      const store = useOastStore();

      store.setPollingRunning("poll-1", true);
      expect(store.pollingStatus["poll-1"]).toBe("running");

      store.setPollingRunning("poll-1", false);
      expect(store.pollingStatus["poll-1"]).toBe("stopped");
    });

    it("should register and replace stop function", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;
      const oldStop = vi.fn();
      const newStop = vi.fn();

      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: oldStop,
        tabId: tab.id,
        tabName: tab.name,
      });

      store.registerPollingStop("poll-1", newStop);
      await store.removePolling("poll-1");

      // New stop function should be called, not old one
      expect(newStop).toHaveBeenCalled();
      expect(oldStop).not.toHaveBeenCalled();
    });
  });

  describe("Tab Payloads & Providers", () => {
    it("should set and get tab payload", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.setTabPayload(tab.id, "my-payload.oast.fun");
      expect(store.tabPayloads[tab.id]).toBe("my-payload.oast.fun");
    });

    it("should set and get tab provider", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.setTabProvider(tab.id, "interactsh-public");
      expect(store.tabProviders[tab.id]).toBe("interactsh-public");
    });

    it("should add payload to history (most recent first)", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPayloadToHistory(tab.id, "payload-1");
      await store.addPayloadToHistory(tab.id, "payload-2");
      await store.addPayloadToHistory(tab.id, "payload-3");

      expect(store.tabPayloadHistory[tab.id]).toEqual([
        "payload-3",
        "payload-2",
        "payload-1",
      ]);
    });

    it("should move duplicate payload to front of history", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPayloadToHistory(tab.id, "a");
      await store.addPayloadToHistory(tab.id, "b");
      await store.addPayloadToHistory(tab.id, "a"); // duplicate

      expect(store.tabPayloadHistory[tab.id]).toEqual(["a", "b"]);
    });

    it("should limit payload history to 20 entries", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      for (let i = 0; i < 25; i++) {
        await store.addPayloadToHistory(tab.id, `payload-${i}`);
      }

      expect(store.tabPayloadHistory[tab.id]!.length).toBe(20);
      // Most recent should be first
      expect(store.tabPayloadHistory[tab.id]![0]).toBe("payload-24");
    });

    it("should remove payload from history", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPayloadToHistory(tab.id, "a");
      await store.addPayloadToHistory(tab.id, "b");
      await store.removePayloadFromHistory(tab.id, "a");

      expect(store.tabPayloadHistory[tab.id]).toEqual(["b"]);
    });

    it("should remove payload and associated polling tasks", async () => {
      const store = useOastStore();
      const tab = store.tabs[0]!;

      await store.addPayloadToHistory(tab.id, "test.oast.fun");
      await store.addPolling({
        id: "poll-1",
        payload: "test.oast.fun",
        provider: "interactsh",
        lastChecked: 1000,
        interval: 5000,
        stop: vi.fn(),
        tabId: tab.id,
        tabName: tab.name,
      });

      await store.removePayloadAndTasks(tab.id, "test.oast.fun");

      expect(store.pollingList.length).toBe(0);
      expect(store.tabPayloadHistory[tab.id]).toEqual([]);
    });
  });

  describe("Provider Data", () => {
    it("should save and clear provider data", async () => {
      const store = useOastStore();

      await store.saveProviderData("interactsh", { url: "oast.fun" });
      expect(store.activeProviders["interactsh"]).toEqual({ url: "oast.fun" });

      await store.clearProviderData("interactsh");
      expect(store.activeProviders["interactsh"]).toBeUndefined();
    });
  });

  describe("Storage Persistence", () => {
    it("should load tabs from storage", () => {
      const savedTabs = [
        { id: "saved-tab", name: "Saved", interactions: [] },
      ];
      mockStorage["omnioast.tabs"] = savedTabs;
      mockStorage["omnioast.activeTabId"] = "saved-tab";

      setActivePinia(createPinia());
      const store = useOastStore();

      expect(store.tabs.length).toBe(1);
      expect(store.tabs[0]!.name).toBe("Saved");
      expect(store.activeTabId).toBe("saved-tab");
    });

    it("should load polling list from storage with validation", () => {
      mockStorage["omnioast.pollingList"] = [
        {
          id: "p1",
          payload: "x",
          provider: "interactsh",
          lastChecked: 100,
          interval: 5000,
          tabId: "t1",
          tabName: "Tab1",
        },
        {
          // Invalid item - missing required fields
          id: "p2",
        },
      ];

      setActivePinia(createPinia());
      const store = useOastStore();

      // Only valid item should be loaded
      expect(store.pollingList.length).toBe(1);
      expect(store.pollingList[0]!.id).toBe("p1");
    });

    it("should migrate legacy lastPolled to lastChecked", () => {
      mockStorage["omnioast.pollingList"] = [
        {
          id: "p1",
          payload: "x",
          provider: "interactsh",
          lastPolled: 999, // legacy field
          interval: 5000,
          tabId: "t1",
          tabName: "Tab1",
        },
      ];

      setActivePinia(createPinia());
      const store = useOastStore();

      expect(store.pollingList[0]!.lastChecked).toBe(999);
    });

    it("should load interaction counter from storage", async () => {
      mockStorage["omnioast.interactionCounter"] = 42;
      mockStorage["omnioast.tabs"] = [
        { id: "t1", name: "1", interactions: [] },
      ];
      mockStorage["omnioast.activeTabId"] = "t1";

      setActivePinia(createPinia());
      const store = useOastStore();

      await store.addInteraction({
        id: "int-1",
        type: "t",
        timestamp: "",
        timestampNum: 1,
        provider: "p",
        correlationId: "c",
        data: {},
      });

      // Should continue from 42, so first new index is 43
      expect(store.interactions[0]!.index).toBe(43);
    });

    it("should validate interactsh session in polling list", () => {
      mockStorage["omnioast.pollingList"] = [
        {
          id: "p1",
          payload: "x",
          provider: "interactsh",
          lastChecked: 100,
          interval: 5000,
          tabId: "t1",
          tabName: "Tab1",
          session: {
            type: "interactsh",
            serverURL: "https://oast.fun",
            token: "",
            correlationID: "abc",
            secretKey: "def",
          },
        },
        {
          id: "p2",
          payload: "y",
          provider: "interactsh",
          lastChecked: 200,
          interval: 5000,
          tabId: "t2",
          tabName: "Tab2",
          session: {
            type: "invalid", // wrong type
            serverURL: "https://oast.fun",
          },
        },
      ];

      setActivePinia(createPinia());
      const store = useOastStore();

      // Only valid session item should load
      expect(store.pollingList.length).toBe(1);
      expect(store.pollingList[0]!.id).toBe("p1");
    });
  });
});
