<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref, watch } from "vue";
import { performRegistration } from "@/services/interactsh";

import type { Provider } from "../../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useOastStore } from "@/stores/oastStore";

const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();

const props = defineProps<{ active: boolean }>();

const selectedProvider = ref<string | null>(null);
const availableProviders = ref<Provider[]>([]);

// Computed property to get the selected provider object by id
const selectedProviderObj = computed(
    () =>
        availableProviders.value.find((p) => p.id === selectedProvider.value) ||
        null,
);

const loadProviders = async () => {
    try {
        availableProviders.value = await sdk.backend.listProviders();
        console.log("Loaded providers:" + availableProviders.value);
        // 자동 선택: provider 목록이 있고, 아직 선택된 값이 없으면 첫 번째 provider 선택
        if (availableProviders.value.length > 0 && !selectedProvider.value) {
            const first = availableProviders.value[0]!;
            selectedProvider.value = first.id ?? null;
        }
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to load providers",
            life: 3000,
        });
    }
};

async function getPayload() {
    if (!selectedProviderObj.value) {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Please select a provider",
            life: 3000,
        });
        return;
    }
    console.log("Get Payload clicked for" + selectedProviderObj.value.name);

    if (!selectedProviderObj.value.url) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Provider URL is missing",
            life: 3000,
        });
        return;
    }

    if (selectedProviderObj.value.type === "interactsh") {
        try {
            // const serverURL = selectedProviderObj.value.url;
            const result = await performRegistration({
                "public-key": "dummy-public-key", // Replace with actual public key logic
                "secret-key": "dummy-secret-key", // Replace with actual secret key logic
                "correlation-id": "dummy-correlation-id", // Replace with actual correlation ID logic
            });

            await navigator.clipboard.writeText(JSON.stringify(result));
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Registration result copied to clipboard",
                life: 3000,
            });
        } catch (error) {
            console.error("Registration failed:", error);
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to register interactsh provider",
                life: 3000,
            });
        }
    } else {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Provider type is not interactsh",
            life: 3000,
        });
    }
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
watch(
    () => props.active,
    (val) => {
        if (val) loadProviders();
    },
);
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="flex items-center p-4 space-x-2">
            <Dropdown
                v-model="selectedProvider"
                :options="availableProviders"
                option-label="name"
                option-value="id"
                placeholder="Select a Provider"
                class="w-96 md:w-14rem"
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
