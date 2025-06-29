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

// selectedProvider의 id를 기반으로 전체 Provider 객체를 찾는 계산된 속성
const selectedProviderObj: ComputedRef<Provider | undefined> = computed(
    () =>
        availableProviders.value.find((p) => p.id === selectedProvider.value) ||
        undefined,
);

const loadProviders = async () => {
    try {
        availableProviders.value = await sdk.backend.listProviders();
        // provider 목록이 있고, 아직 선택된 값이 없으면 첫 번째 provider를 자동으로 선택합니다.
        if (
            availableProviders.value.length > 0 &&
            selectedProvider.value === undefined
        ) {
            const firstProvider = availableProviders.value[0];
            if (firstProvider) {
                selectedProvider.value = firstProvider.id ?? undefined;
            }
        }
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to load providers",
            life: 3000,
        });
        console.error("Failed to load providers:", error);
    }
};

async function getPayload() {
    // selectedProviderObj.value가 없을 경우, 사용자에게 알리고 함수를 종료합니다.
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

    if (!currentProvider.url) {
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
                    // --- FIX START ---
                    // 콜백 함수 내에서 'selectedProviderObj.value' 대신
                    // 스코프 내에서 타입이 보장된 'currentProvider'를 사용합니다.
                    oastStore.addInteraction({
                        method: interaction.protocol as string,
                        source: interaction.remoteAddress as string,
                        destination: interaction.fullId as string,
                        provider: currentProvider.name,
                        timestamp: new Date(
                            interaction.timestamp as number,
                        ).toLocaleString(),
                    });
                    // --- FIX END ---
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
    toast.add({
        severity: "success",
        summary: "Copied",
        detail: `${field} copied to clipboard`,
        life: 2000,
    });
}

onMounted(() => {
    loadProviders();
});

watch(
    () => props.active,
    (isActive) => {
        if (isActive) {
            loadProviders();
        }
    },
);
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="flex items-center p-4 justify-between">
            <div class="flex space-x-2">
                <Dropdown
                    v-model="selectedProvider"
                    :options="availableProviders"
                    option-label="name"
                    option-value="id"
                    placeholder="Select a Provider"
                    class="w-96 md:w-14rem"
                />
                <Button label="Get Payload" @click="getPayload" />
            </div>
            <div class="flex space-x-2">
                <Button
                    label="Clear"
                    class="p-button-warning"
                    @click="clearInteractions"
                />
                <Button
                    label="Poll"
                    class="p-button-secondary"
                    @click="pollInteractions"
                />
            </div>
        </div>
        <div class="flex-grow p-4">
            <DataTable
                :value="oastStore.interactions"
                paginator
                :rows="10"
                :rows-per-page-options="[5, 10, 20, 50]"
                table-style="min-width: 50rem"
                sort-field="timestamp"
                :sort-order="-1"
            >
                <Column
                    field="method"
                    header="Method"
                    :sortable="true"
                ></Column>
                <Column
                    field="source"
                    header="Source"
                    :sortable="true"
                ></Column>
                <Column
                    field="destination"
                    header="Destination"
                    :sortable="true"
                ></Column>
                <Column
                    field="provider"
                    header="Provider"
                    :sortable="true"
                ></Column>
                <Column
                    field="timestamp"
                    header="Timestamp"
                    :sortable="true"
                ></Column>
            </DataTable>
        </div>
    </div>
</template>
