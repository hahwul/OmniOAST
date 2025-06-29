<script setup lang="ts">
import TabPanel from "primevue/tabpanel";
import TabView from "primevue/tabview";
import Toast from "primevue/toast";

import { GuideTab, OastTab, ProvidersTab } from "@/components/tabs";
</script>

<template>
  <TabView class="h-full">
    <TabPanel header="OAST">
      <OastTab />
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
