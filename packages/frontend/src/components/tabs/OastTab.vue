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
// --- FIX START ---
// payload URL을 담을 ref를 선언합니다.
const payloadInput = ref("");
// --- FIX END ---

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
                    oastStore.addInteraction({
                        method: interaction.protocol as string,
                        source: interaction.remoteAddress as string,
                        destination: interaction.fullId as string,
                        provider: currentProvider.name,
                        timestamp: new Date(
                            interaction.timestamp as number,
                        ).toLocaleString(),
                    });
                },
            );

            const { url: payloadUrl } = clientService.generateUrl();
            // --- FIX START ---
            // 생성된 URL을 클립보드에 바로 복사하는 대신 input 필드에 설정합니다.
            payloadInput.value = payloadUrl;
            // --- FIX END ---
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
    if (!value) {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Nothing to copy",
            life: 2000,
        });
        return;
    }
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
            <div class="flex space-x-2 items-center">
                <Dropdown
                    v-model="selectedProvider"
                    :options="availableProviders"
                    option-label="name"
                    option-value="id"
                    placeholder="Select a Provider"
                    class="w-64 md:w-14rem"
                />
                <Button label="Get Payload" @click="getPayload" />
                <input
                    v-model="payloadInput"
                    placeholder="Payload URL"
                    class="leading-none m-0 py-2 px-3 rounded-md text-surface-800 dark:text-white/80 placeholder:text-surface-400 dark:placeholder:text-surface-500 bg-surface-0 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 invalid:focus:ring-danger-400 invalid:hover:border-danger-400 hover:border-surface-400 dark:hover:border-surface-600 focus:outline-none focus:outline-offset-0 focus:ring-1 focus:ring-secondary-500 dark:focus:ring-secondary-400 focus:z-10 appearance-none transition-colors duration-200 w-96"
                />
                <Button
                    label="Copy"
                    icon="pi pi-copy"
                    class="p-button-secondary"
                    @click="copyToClipboard(payloadInput, 'Payload')"
                />
            </div>
            <div class="flex space-x-2">
                <Button
                    label="Clear"
                    icon="pi pi-trash"
                    class="p-button-warning"
                    @click="clearInteractions"
                />
                <Button
                    label="Poll"
                    icon="pi pi-refresh"
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
