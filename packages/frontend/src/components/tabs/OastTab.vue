<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { computed, type ComputedRef, onMounted, ref, watch } from "vue";

import type { Provider } from "../../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useClientService } from "@/services/interactsh";
import { useOastStore } from "@/stores/oastStore";

const { copy } = useClipboard();
const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();

const clientService = useClientService();

const props = defineProps<{ active: boolean }>();

const selectedProvider = ref<string | undefined>(undefined);
const availableProviders = ref<Provider[]>([]);

// Computed property to get the selected provider object by id
const selectedProviderObj: ComputedRef<Provider | undefined> = computed(
    () =>
        availableProviders.value.find((p) => p.id === selectedProvider.value) ||
        undefined,
);

const loadProviders = async () => {
    try {
        availableProviders.value = await sdk.backend.listProviders();
        console.log("Loaded providers:", availableProviders.value);
        // 자동 선택: provider 목록이 있고, 아직 선택된 값이 없으면 첫 번째 provider 선택
        if (
            availableProviders.value.length > 0 &&
            selectedProvider.value === undefined
        ) {
            const first = availableProviders.value[0]!;
            selectedProvider.value = first.id ?? undefined;
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
    const currentProvider = selectedProviderObj.value;

    console.log("Get Payload clicked for", currentProvider.name);

    if (currentProvider.url === undefined || currentProvider.url === "") {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Provider URL is missing",
            life: 3000,
        });
        return;
    }

    if (currentProvider.type === "interactsh") {
        try {
            await clientService.start(
                {
                    serverURL: currentProvider.url,
                    token: currentProvider.token || "",
                    keepAliveInterval: 5000, // 5초마다 폴링
                },
                (interaction) => {
                    oastStore.addInteraction({
                        method: interaction.protocol as string,
                        source: interaction.remote_address as string,
                        destination: interaction.full_url as string,
                        // --- FIX ---
                        // 'selectedProviderObj.value' 대신 타입이 보장된 'currentProvider' 사용

                        provider: selectedProviderObj.value.name,
                        // --- END FIX ---
                        timestamp: new Date(
                            interaction.timestamp as number,
                        ).toLocaleString(),
                    });
                },
            );

            const { url: payloadUrl } = clientService.generateUrl();
            copyToClipboard(payloadUrl, "Payload");
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
    clientService.poll();
}

function copyToClipboard(value: string, field: string) {
    copy(value);
    sdk.window.showToast("Copied to clipboard", { variant: "success" });

    return true;
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
