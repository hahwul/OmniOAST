<script setup lang="ts">
import ConfirmDialog from "primevue/confirmdialog";
import MenuBar from "primevue/menubar";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import About from "./About.vue";
import Oast from "./Oast.vue";
import Polling from "./Polling.vue";
import Providers from "./Providers.vue";
import Settings from "./Settings.vue";

import { usePollingManager } from "@/services/pollingManager";
import { useOastStore } from "@/stores/oastStore";

const page = ref<"OAST" | "Providers" | "Settings" | "About" | "Polling">(
  "OAST",
);
const oastStore = useOastStore();
const pollingManager = usePollingManager();

// 플러그인 내부 탭 전환 시 visibility 재확인
watch(page, () => {
  checkPluginVisibility();
});

onBeforeUnmount(() => {
  if (visibilityObserver) {
    visibilityObserver.disconnect();
    visibilityObserver = null;
  }
  if (intersectionObserver) {
    intersectionObserver.disconnect();
    intersectionObserver = null;
  }
});

// Detect whether the plugin page is visible in Caido
// When user navigates away from OmniOAST to another Caido page,
// the plugin root element becomes hidden (display:none or detached).
const pluginRoot = ref<HTMLElement | null>(null);
let visibilityObserver: MutationObserver | null = null;
let intersectionObserver: IntersectionObserver | null = null;

function checkPluginVisibility() {
  if (!pluginRoot.value) return;
  // Walk up to find the Caido page container and check visibility
  let el: HTMLElement | null = pluginRoot.value;
  let visible = true;
  while (el) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") {
      visible = false;
      break;
    }
    el = el.parentElement;
  }
  const isOnOastPage = visible && page.value === "OAST";
  oastStore.setOastTabActive(isOnOastPage);
  if (isOnOastPage) {
    oastStore.clearUnreadCount();
  }
}

onMounted(() => {
  // Attempt to resume background polling for persisted tasks
  pollingManager.resumeAll();

  // Find the plugin root element
  pluginRoot.value = document.getElementById("plugin--omnioast");

  // Observe DOM changes on ancestors to detect Caido page switches
  if (pluginRoot.value) {
    visibilityObserver = new MutationObserver(() => checkPluginVisibility());
    // Observe from the body for attribute/style changes on any ancestor
    visibilityObserver.observe(document.body, {
      attributes: true,
      attributeFilter: ["style", "class", "hidden"],
      subtree: true,
    });

    // IntersectionObserver reliably detects when the plugin becomes visible/hidden
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            checkPluginVisibility();
          } else {
            oastStore.setOastTabActive(false);
          }
        }
      },
      { threshold: 0.1 },
    );
    intersectionObserver.observe(pluginRoot.value);

    // Initial check
    checkPluginVisibility();
  }
});

const leftItems = [
  {
    label: "OAST",
    icon: "fas fa-satellite-dish",
    command: () => {
      page.value = "OAST";
    },
  },
  {
    label: "Providers",
    icon: "fa fa-server",
    command: () => {
      page.value = "Providers";
    },
  },
  {
    label: "Polling Tasks",
    icon: "fa fa-arrows-rotate",
    command: () => {
      page.value = "Polling";
    },
  },
];

const rightItems = [
  {
    label: "Settings",
    icon: "fa fa-cog",
    command: () => {
      page.value = "Settings";
    },
  },
  {
    label: "About",
    icon: "fa fa-info-circle",
    command: () => {
      page.value = "About";
    },
  },
];

const component = computed(() => {
  switch (page.value) {
    case "OAST":
      return Oast;
    case "Providers":
      return Providers;
    case "Polling":
      return Polling;
    case "Settings":
      return Settings;
    case "About":
      return About;
    default:
      return undefined;
  }
});
</script>

<template>
  <div id="plugin--omnioast" class="h-full">
    <div class="h-full flex flex-col gap-1">
      <MenuBar breakpoint="320px">
        <template #start>
          <div class="flex">
            <div
              v-for="(item, index) in leftItems"
              :key="index"
              class="px-3 py-2 cursor-pointer rounded-xl font-bold flex items-center gap-2 transition-all duration-300 ease-in-out"
              :class="{
                'text-primary-500 dark:text-primary-400': page === item.label,
                'hover:bg-surface-700': page !== item.label,
              }"
              @click="item.command"
            >
              <i :class="['fa', item.icon]"></i>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </template>
        <template #end>
          <div class="flex">
            <div
              v-for="(item, index) in rightItems"
              :key="index"
              v-tooltip.bottom="item.label"
              class="px-3 py-2 cursor-pointer rounded-xl font-bold flex items-center justify-center transition-all duration-300 ease-in-out"
              :class="{
                'text-primary-500 dark:text-primary-400': page === item.label,
                'hover:bg-surface-700': page !== item.label,
              }"
              @click="item.command"
            >
              <i :class="['fa', item.icon]"></i>
            </div>
          </div>
        </template>
      </MenuBar>
      <div class="flex-1 min-h-0">
        <component :is="component" />
      </div>
      <ConfirmDialog />
    </div>
  </div>
</template>

<style scoped>
#plugin--omnioast {
  height: 100%;
}
</style>
