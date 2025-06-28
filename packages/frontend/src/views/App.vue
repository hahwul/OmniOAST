<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";

import Config from "./Config.vue";
import Help from "./Help.vue";
import History from "./History.vue";
console.log("App.vue script setup initialized");

const page = ref<"History" | "Config" | "Help">("History");
const items = [
  {
    label: "History",
    command: () => {
      page.value = "History";
    },
  },
  {
    label: "Config",
    command: () => {
      page.value = "Config";
    },
  },
  {
    label: "Help",
    command: () => {
      page.value = "Help";
    },
  },
];

const component = computed(() => {
  switch (page.value) {
    case "History":
      return History;
    case "Config":
      return Config;
    case "Help":
      return Help;
    default:
      return History;
  }
});
</script>

<template>
  <div id="plugin--OmniOAST">
    <div class="h-full flex flex-col gap-1">
      <MenuBar breakpoint="320px">
        <template #start>
          <div class="flex">
            <div
              v-for="(item, index) in items"
              :key="index"
              class="px-3 py-2 cursor-pointer text-gray-300 rounded transition-all duration-200 ease-in-out"
              :class="{
                'bg-zinc-800/40': page === item.label,
                'hover:bg-gray-800/10': page !== item.label,
              }"
              @click="item.command"
            >
              {{ item.label }}
            </div>
          </div>
        </template>
      </MenuBar>
      <div class="flex-1 min-h-0">
        <component :is="component" />
      </div>
    </div>
  </div>
</template>

<style scoped>
#plugin--OmniOAST {
  height: 100%;
}
</style>
