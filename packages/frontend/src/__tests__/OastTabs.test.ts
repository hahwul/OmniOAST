import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/plugins/sdk", () => ({
  useSDK: () => ({
    storage: { get: () => ({}), set: vi.fn(async () => {}) },
    window: { showToast: vi.fn() },
  }),
}));

vi.mock("primevue/useconfirm", () => ({
  useConfirm: () => ({ require: vi.fn() }),
}));

import { useOastStore } from "../stores/oastStore";
import OastTabs from "../views/OastTabs.vue";

describe("OastTabs rename", () => {
  let store: ReturnType<typeof useOastStore>;

  // Mounts the tab bar with its first tab ("1") in edit mode
  const startRename = async () => {
    const wrapper = mount(OastTabs);
    await wrapper.find(".tab-item").trigger("dblclick");
    return { wrapper, input: wrapper.find("input") };
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useOastStore();
  });

  it("saves the trimmed name on Enter", async () => {
    const { wrapper, input } = await startRename();

    await input.setValue("  recon  ");
    await input.trigger("keyup.enter");
    await flushPromises();

    expect(store.tabs[0]!.name).toBe("recon");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  it("does not save on Escape, although removing the input blurs it", async () => {
    const { wrapper, input } = await startRename();

    await input.setValue("renamed");
    await input.trigger("keyup.esc");
    // Chromium fires blur on a focused element while it is being removed
    input.element.dispatchEvent(new Event("blur"));
    await flushPromises();

    expect(store.tabs[0]!.name).toBe("1");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  it("keeps the old name and leaves edit mode when the name is emptied", async () => {
    const { wrapper, input } = await startRename();

    await input.setValue("   ");
    await input.trigger("blur");
    await flushPromises();

    expect(store.tabs[0]!.name).toBe("1");
    expect(wrapper.find("input").exists()).toBe(false);
  });

  it("keeps what was typed when the input is double-clicked", async () => {
    const { wrapper, input } = await startRename();

    await input.setValue("typed so far");
    await input.trigger("dblclick"); // e.g. selecting a word; bubbles to the tab

    expect(wrapper.find("input").element.value).toBe("typed so far");
  });
});
