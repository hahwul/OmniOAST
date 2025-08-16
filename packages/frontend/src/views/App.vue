<script setup lang="ts">
import ConfirmDialog from "primevue/confirmdialog";
import MenuBar from "primevue/menubar";
import { computed, ref, watch } from "vue";

import About from "./About.vue";
import Oast from "./Oast.vue";
import Polling from "./Polling.vue";
import Providers from "./Providers.vue";
import Settings from "./Settings.vue";

import { useOastStore } from "@/stores/oastStore";

const page = ref<"OAST" | "Providers" | "Settings" | "About" | "Polling">(
  "OAST",
);
const oastStore = useOastStore();

// OAST 탭 진입 시 unreadCount 초기화
watch(page, (newPage) => {
  oastStore.setOastTabActive(newPage === "OAST");
  if (newPage === "OAST") {
    oastStore.clearUnreadCount();
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
