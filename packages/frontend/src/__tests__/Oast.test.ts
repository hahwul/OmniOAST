import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import DataTable from "primevue/datatable";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { h } from "vue";

const backend = {
  listProviders: vi.fn(),
  getCurrentSettings: vi.fn(),
  registerAndGetPayload: vi.fn(),
  updateProvider: vi.fn(),
};
const showToast = vi.fn();

vi.mock("@/plugins/sdk", () => ({
  useSDK: () => ({
    backend,
    window: { showToast },
    storage: { get: () => ({}), set: vi.fn(async () => {}) },
    ui: {
      httpRequestEditor: () => ({
        getElement: () => document.createElement("div"),
      }),
      httpResponseEditor: () => ({
        getElement: () => document.createElement("div"),
      }),
    },
  }),
}));

const resume = vi.fn();
vi.mock("@/services/pollingManager", () => ({
  usePollingManager: () => ({ resume, pollOnce: vi.fn() }),
  createInteractshCallback: vi.fn(),
}));

const interactsh = {
  start: vi.fn(),
  stop: vi.fn(),
  generateUrl: vi.fn(),
  getSessionInfo: vi.fn(),
};
vi.mock("@/services/interactsh", () => ({
  useClientService: () => interactsh,
}));

import { useOastStore } from "../stores/oastStore";
import Oast from "../views/Oast.vue";

const webhook = {
  id: "prov-1",
  name: "Webhook",
  type: "webhooksite",
  url: "https://webhook.site",
  enabled: true,
};

// A promise the test settles when it wants to
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("Oast view", () => {
  let store: ReturnType<typeof useOastStore>;

  // Mounts the view with `provider` selected for the active tab
  const mountOast = async (provider: { id: string } = webhook) => {
    backend.listProviders.mockResolvedValue([provider]);
    await store.setTabProvider(store.activeTabId!, provider.id);
    const wrapper = mount(Oast, {
      global: {
        stubs: {
          OastTabs: true,
          Dropdown: true,
          DataTable: true,
          Column: true,
          Dialog: true,
          Button: {
            props: ["label"],
            emits: ["click"],
            render() {
              return h(
                "button",
                { onClick: () => this.$emit("click") },
                this.label,
              );
            },
          },
        },
        directives: { tooltip: {} },
      },
    });
    await flushPromises();
    const click = (label: string) =>
      wrapper
        .findAll("button")
        .find((b) => b.text() === label)!
        .trigger("click");
    return { wrapper, click };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    store = useOastStore();
    backend.getCurrentSettings.mockResolvedValue({
      pollingInterval: 10,
      payloadPrefix: "",
    });
    backend.registerAndGetPayload.mockResolvedValue({
      id: "tok",
      payloadUrl: "https://webhook.site/tok",
    });
    backend.updateProvider.mockResolvedValue(webhook);
    resume.mockResolvedValue(true);
  });

  describe("Get Payload", () => {
    it("reports settings that cannot be loaded instead of failing silently", async () => {
      backend.getCurrentSettings.mockRejectedValue(new Error("backend down"));
      const { click } = await mountOast();

      await click("Get Payload");
      await flushPromises();

      expect(showToast).toHaveBeenCalledWith("Failed to load settings", {
        variant: "error",
      });
      expect(backend.registerAndGetPayload).not.toHaveBeenCalled();
    });

    it("reports a polling task that cannot be started", async () => {
      resume.mockRejectedValue(new Error("backend down"));
      const { click } = await mountOast();

      await click("Get Payload");
      await flushPromises();

      expect(showToast).toHaveBeenCalledWith("Failed to start polling", {
        variant: "error",
      });
    });

    it("uses the documented 30 s interval when there are no settings", async () => {
      backend.getCurrentSettings.mockResolvedValue(null);
      const { click } = await mountOast();

      await click("Get Payload");
      await flushPromises();

      expect(store.pollingList[0]!.interval).toBe(30000);
    });

    it("registers once when the button is clicked again mid-registration", async () => {
      const registration = deferred<{ id: string; payloadUrl: string }>();
      backend.registerAndGetPayload.mockReturnValue(registration.promise);
      const { click } = await mountOast();

      await click("Get Payload");
      await flushPromises();
      await click("Get Payload");
      registration.resolve({ id: "tok", payloadUrl: "https://x/tok" });
      await flushPromises();

      expect(backend.registerAndGetPayload).toHaveBeenCalledTimes(1);
      expect(store.pollingList).toHaveLength(1);

      // And the button works again afterwards
      await click("Get Payload");
      await flushPromises();
      expect(backend.registerAndGetPayload).toHaveBeenCalledTimes(2);
    });

    it("leaves nothing behind for a tab closed while its provider registers", async () => {
      const registration = deferred<void>();
      interactsh.start.mockReturnValue(registration.promise);
      interactsh.stop.mockResolvedValue(undefined);
      interactsh.generateUrl.mockReturnValue({ url: "abc.oast.fun" });
      interactsh.getSessionInfo.mockResolvedValue(undefined);
      const { click } = await mountOast({
        id: "prov-2",
        name: "Interactsh",
        type: "interactsh",
        url: "https://oast.fun",
        enabled: true,
      } as { id: string });
      const tabId = store.activeTabId!;

      await click("Get Payload");
      await flushPromises(); // waiting on the registration
      await store.removeTab(tabId);
      registration.resolve();
      await flushPromises();

      expect(store.pollingList).toEqual([]);
      expect(store.tabPayloads[tabId]).toBeUndefined();
      expect(store.tabPayloadHistory[tabId]).toBeUndefined();
      expect(resume).not.toHaveBeenCalled();
      // The session it registered is of no use to anyone
      expect(interactsh.stop).toHaveBeenCalled();
    });
  });

  it("says which tasks the Poll button could not poll", async () => {
    const { click } = await mountOast();
    await store.addPolling({
      id: "task-1",
      payload: "gone.example",
      provider: "Deleted provider",
      providerId: "prov-gone",
      lastChecked: 0,
      interval: 30000,
      tabId: store.activeTabId!,
      tabName: "1",
    });

    await click("Poll");
    await flushPromises();

    expect(showToast).toHaveBeenCalledWith(
      "Polling 1 task(s) for this tab...",
      { variant: "info" },
    );
    expect(showToast).toHaveBeenCalledWith(
      "Not polled, provider disabled or deleted: Deleted provider",
      { variant: "warning" },
    );
  });

  it("drops the selected interaction when the tab changes", async () => {
    const { wrapper } = await mountOast();
    // The placeholder is hidden (v-show) while an interaction is selected
    const placeholderHidden = () =>
      wrapper
        .findAll("div")
        .find((d) => d.text() === "No selected interaction.")!
        .attributes("style")
        ?.includes("display: none") ?? false;

    wrapper
      .findComponent(DataTable)
      .vm.$emit("row-select", { data: { id: "i1", rawRequest: "GET /" } });
    await flushPromises();
    expect(placeholderHidden()).toBe(true);

    store.addTab();
    await flushPromises();
    expect(placeholderHidden()).toBe(false);
  });
});
