<template>
  <div class="p-4 h-full bg-surface-0 dark:bg-surface-800 rounded overflow-scroll">
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold">Polling List</h2>
    </div>

    <DataTable :value="pollingList" responsive-layout="scroll">
      <Column field="provider" header="Provider" :sortable="true"></Column>
      <Column field="payload" header="Payload"></Column>
      <Column field="lastPolled" header="Last Polled" :sortable="true">
        <template #body="slotProps">
          {{ new Date(slotProps.data.lastPolled).toLocaleString() }}
        </template>
      </Column>
      <Column field="interval" header="Interval (ms)" :sortable="true"></Column>
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
import { computed } from 'vue';
import { useOastStore } from '@/stores/oastStore';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Button from 'primevue/button';

const oastStore = useOastStore();
const pollingList = computed(() => oastStore.pollingList);

const stopPolling = (pollingId: string) => {
  oastStore.removePolling(pollingId);
};
</script>
