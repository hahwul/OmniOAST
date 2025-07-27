<template>
    <div class="c-card">
        <div class="c-card__header">
            <h2 class="c-card__title">Polling List</h2>
        </div>
        <div class="c-card__body">
            <div v-if="pollingList.length === 0" class="c-empty-state">
                <p>No payloads are currently being polled.</p>
            </div>
            <div v-else>
                <table class="c-table">
                    <thead>
                        <tr>
                            <th>Provider</th>
                            <th>Payload</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="polling in pollingList" :key="polling.id">
                            <td>{{ polling.provider }}</td>
                            <td>{{ polling.payload }}</td>
                            <td>
                                <button
                                    class="c-button c-button--destructive"
                                    @click="stopPolling(polling.id)"
                                >
                                    Stop Polling
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useOastStore } from "@/stores/oastStore";

const oastStore = useOastStore();
const pollingList = computed(() => oastStore.pollingList);

const stopPolling = (pollingId: string) => {
    oastStore.removePolling(pollingId);
};
</script>

<style scoped>
.c-table {
    width: 100%;
    border-collapse: collapse;
}

.c-table th,
.c-table td {
    padding: 12px;
    border: 1px solid var(--c-border-color);
    text-align: left;
}

.c-table th {
    background-color: var(--c-background-color-secondary);
}

.c-empty-state {
    text-align: center;
    padding: 20px;
    color: var(--c-text-color-secondary);
}
</style>
