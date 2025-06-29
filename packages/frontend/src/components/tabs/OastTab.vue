<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import type { Provider } from "../../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useOastStore } from "@/stores/oastStore";

const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();

const selectedProvider = ref<Provider | null>(null);
const availableProviders = ref<Provider[]>([]);

const loadProviders = async () => {
  try {
    availableProviders.value = await sdk.backend.listProviders();
  } catch (error) {
    toast.add({
      severity: "error",
      summary: "Error",
      detail: "Failed to load providers",
      life: 3000,
    });
    alert("Failed to load providers:" + error);
  }
};

function getPayload() {
  if (!selectedProvider.value) {
    toast.add({
      severity: "warn",
      summary: "Warning",
      detail: "Please select a provider",
      life: 3000,
    });
    return;
  }
  console.log("Get Payload clicked for", selectedProvider.value.name);
  // TODO: Implement actual payload generation based on provider type
  // For now, just add a dummy interaction
  oastStore.addInteraction({
    method: "GET",
    source: "127.0.0.1",
    destination: "example.com",
    provider: selectedProvider.value.name,
    timestamp: new Date().toLocaleString(),
  });
}

function clearInteractions() {
  oastStore.clearInteractions();
  toast.add({
    severity: "success",
    summary: "Success",
    detail: "Interactions cleared",
    life: 3000,
  });
}

function pollInteractions() {
  console.log("Poll Interactions clicked");
  // TODO: Implement polling logic
}

onMounted(() => {
  loadProviders();
});
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex items-center p-4 space-x-2">
      <Dropdown
        v-model="selectedProvider"
        :options="availableProviders"
        option-label="name"
        placeholder="Select a Provider"
        class="w-full md:w-14rem"
      />
      <Button label="Get Payload" @click="getPayload" />
      <Button label="Clear" @click="clearInteractions" />
      <Button label="Poll" @click="pollInteractions" />
    </div>
    <div class="flex-grow p-4">
      <DataTable
        :value="oastStore.interactions"
        paginator
        :rows="10"
        :rows-per-page-options="[5, 10, 20, 50]"
        table-style="min-width: 50rem"
      >
        <Column field="method" header="Method"></Column>
        <Column field="source" header="Source"></Column>
        <Column field="destination" header="Destination"></Column>
        <Column field="provider" header="Provider"></Column>
        <Column field="timestamp" header="Timestamp"></Column>
      </DataTable>
    </div>
  </div>
</template>
