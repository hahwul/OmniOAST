<template>
  <div
    class="p-4 h-full bg-surface-0 dark:bg-surface-800 rounded overflow-scroll"
  >
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Polling List</h2>
      <Button
        label="Refresh Health"
        icon="fa fa-heartbeat"
        class="p-button-secondary p-button-sm"
        @click="refreshHealth"
      />
    </div>

    <DataTable :value="pollingList" responsive-layout="scroll">
      <Column field="tabName" header="Tab" :sortable="true"></Column>
      <Column field="provider" header="Provider" :sortable="true"></Column>
      <Column field="payload" header="Payload"></Column>
      <Column field="lastPolled" header="Last Polled" :sortable="true">
        <template #body="slotProps">
          {{ new Date(slotProps.data.lastPolled).toLocaleString() }}
        </template>
      </Column>
      <Column field="interval" header="Interval (ms)" :sortable="true"></Column>
      <Column header="Status" :sortable="true">
        <template #body="slotProps">
          <span
            :class="{
              'text-green-500': getHealthStatus(slotProps.data.id).healthStatus === 'healthy',
              'text-red-500': getHealthStatus(slotProps.data.id).healthStatus === 'unhealthy',
              'text-gray-500': getHealthStatus(slotProps.data.id).healthStatus === 'unknown',
            }"
          >
            <i
              :class="{
                'fa fa-check-circle': getHealthStatus(slotProps.data.id).healthStatus === 'healthy',
                'fa fa-exclamation-circle': getHealthStatus(slotProps.data.id).healthStatus === 'unhealthy',
                'fa fa-question-circle': getHealthStatus(slotProps.data.id).healthStatus === 'unknown',
              }"
            ></i>
            {{ getHealthStatus(slotProps.data.id).healthStatus }}
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

import { usePollingTaskManager } from "@/composables/pollingTaskManager";
import { useOastStore } from "@/stores/oastStore";

const oastStore = useOastStore();
const pollingTaskManager = usePollingTaskManager();
const pollingList = computed(() => oastStore.pollingList);

const stopPolling = (pollingId: string) => {
  oastStore.removePolling(pollingId);
};

const getHealthStatus = (pollingId: string) => {
  return pollingTaskManager.getPollingTaskHealth(pollingId);
};

const refreshHealth = async () => {
  await pollingTaskManager.performHealthCheck();
};
</script>
