<template>
  <div class="p-4">
    <h1 class="text-2xl font-bold mb-4">OAST Interaction History</h1>

    <div class="mb-4">
      <Dropdown v-model="selectedProvider" :options="providers" optionLabel="name" placeholder="Select an OAST Provider" class="w-full md:w-14rem" />
    </div>

    <DataTable :value="history" v-if="history.length > 0">
      <Column field="timestamp" header="Timestamp"></Column>
      <Column field="remoteAddress" header="Remote Address"></Column>
      <Column field="request" header="Request"></Column>
      <Column field="response" header="Response"></Column>
    </DataTable>
    <div v-else class="text-center text-gray-500">
      No history available for the selected provider.
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { OASTProvider, OASTHistory } from '@/shared/types';
import * as oastRepo from '../repositories/oast';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Dropdown from 'primevue/dropdown';

const providers = ref<OASTProvider[]>([]);
const selectedProvider = ref<OASTProvider | null>(null);
const history = ref<OASTHistory[]>([]);

onMounted(async () => {
  providers.value = await oastRepo.getOASTProviders();
});

watch(selectedProvider, async (newProvider) => {
  if (newProvider) {
    history.value = await oastRepo.getOASTHistory(newProvider.id);
  } else {
    history.value = [];
  }
});
</script>