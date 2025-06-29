<script setup lang="ts">
import TabPanel from "primevue/tabpanel";
import TabView from "primevue/tabview";
import Toast from "primevue/toast";
import { ref } from "vue";

import { GuideTab, OastTab, ProvidersTab } from "@/components/tabs";

const activeTabIndex = ref(0);
</script>

<template>
  <TabView v-model:active-index="activeTabIndex" class="h-full">
    <TabPanel header="OAST">
      <OastTab :active="activeTabIndex === 0" />
    </TabPanel>
    <TabPanel header="Providers">
      <ProvidersTab />
    </TabPanel>
    <TabPanel header="Guide">
      <GuideTab />
    </TabPanel>
  </TabView>
  <Toast />
</template>
