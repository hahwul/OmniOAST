<script setup lang="ts">
import MenuBar from "primevue/menubar";
import { computed, ref } from "vue";

import Oast from "./Oast.vue";
import Providers from "./Providers.vue";
import Guide from "./Guide.vue";

const page = ref<"Oast" | "Providers" | "Guide">("Oast");
const items = [
    {
        label: "Oast",
        command: () => {
            page.value = "Oast";
        },
    },
    {
        label: "Providers",
        command: () => {
            page.value = "Providers";
        },
    },
    {
        label: "Guide",
        command: () => {
            page.value = "Guide";
        },
    },
];

const component = computed(() => {
    switch (page.value) {
        case "Oast":
            return Oast;
        case "Providers":
            return Providers;
        case "Guide":
            return Guide;
        default:
            return undefined;
    }
});

// const activeTabIndex = ref(0);
</script>

<template>
    <div id="plugin--omnioast" class="h-full">
        <div class="h-full flex flex-col gap-1">
            <MenuBar breakpoint="320px">
                <template #start>
                    <div class="flex">
                        <div
                            v-for="(item, index) in items"
                            :key="index"
                            class="px-3 py-2 cursor-pointer"
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
#plugin--omnioast {
    height: 100%;
}
</style>
