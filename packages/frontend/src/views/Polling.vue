<template>
  <div
    class="p-4 h-full bg-surface-0 dark:bg-surface-800 rounded overflow-scroll"
  >
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Polling List</h2>
    </div>

    <DataTable :value="pollingList" responsive-layout="scroll">
      <Column field="tabName" header="Tab" :sortable="true"></Column>
      <Column field="provider" header="Provider" :sortable="true"></Column>
      <Column field="providerId" header="Provider ID" :sortable="true"></Column>
      <Column field="payload" header="Payload"></Column>
      <Column field="lastChecked" header="Last Checked" :sortable="true">
        <template #body="slotProps">
          {{ new Date(slotProps.data.lastChecked).toLocaleString() }}
        </template>
      </Column>
      <Column field="interval" header="Interval (ms)" :sortable="true"></Column>
      <Column field="status" header="Status">
        <template #body="slotProps">
          <span
            :class="{
              'text-green-500': statusMap[slotProps.data.id] === 'running',
              'text-red-400': statusMap[slotProps.data.id] !== 'running',
            }"
          >
            {{ statusMap[slotProps.data.id] === 'running' ? 'Running' : 'Stopped' }}
          </span>
        </template>
      </Column>
      <Column :exportable="false" style="min-width: 8rem">
        <template #body="slotProps">
          <Button
            icon="fa fa-stop-circle"
            class="p-button-rounded p-button-warning"
            @click="stopPolling(slotProps.data.id)"
          />
          <Button
            v-if="statusMap[slotProps.data.id] !== 'running'"
            icon="fa fa-play-circle"
            class="ml-2 p-button-rounded p-button-success"
            @click="resumePolling(slotProps.data.id)"
          />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { computed } from "vue";

import { useOastStore } from "@/stores/oastStore";
import { useSDK } from "@/plugins/sdk";
import { usePollingManager } from "@/services/pollingManager";

const oastStore = useOastStore();
const pollingList = computed(() => oastStore.pollingList);
// Use the ref directly to avoid double-ref in template
const statusMap = oastStore.pollingStatus;
const pollingManager = usePollingManager();
const sdk = useSDK();

const stopPolling = (pollingId: string) => {
  oastStore.removePolling(pollingId);
};

const resumePolling = async (pollingId: string) => {
  const ok = await pollingManager.resume(pollingId);
  if (!ok) {
    sdk.window.showToast("Failed to resume polling task", { variant: "error" });
  } else {
    sdk.window.showToast("Polling task resumed", { variant: "success" });
  }
};
</script>
