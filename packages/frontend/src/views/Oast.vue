<script setup lang="ts">
import { v4 as uuidv4 } from "uuid";
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { computed, onMounted, ref, watch } from "vue";

import type { Provider } from "../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";
import { useClientService } from "@/services/interactsh";
import { useOastStore } from "@/stores/oastStore";

const { copy } = useClipboard();
const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();

const clientService = useClientService();

const props = defineProps<{ active: boolean }>();

const selectedProviderA = ref<string | undefined>(undefined); // Get Payload용
const selectedProviderB = ref<string | undefined>(undefined); // Interaction 필터용
const availableProviders = ref<Provider[]>([]);

const availableProvidersWithAll = computed(() => [
    { id: "", name: "All Providers" },
    ...availableProviders.value,
]);

onMounted(() => {
    watch(
        availableProviders,
        (providers) => {
            if (!selectedProviderA.value && providers.length > 0) {
                selectedProviderA.value = providers[0]?.id;
            }
        },
        { immediate: true },
    );
});
const selectedInteraction = ref<any>(null);
const payloadInput = ref("");

const searchQuery = ref("");
const filteredInteractions = computed(() =>
    oastStore.interactions.filter((i) => {
        const matchesSearch =
            (i.method?.toLowerCase() ?? "").includes(
                searchQuery.value.toLowerCase(),
            ) ||
            (i.source?.toLowerCase() ?? "").includes(
                searchQuery.value.toLowerCase(),
            ) ||
            (i.destination?.toLowerCase() ?? "").includes(
                searchQuery.value.toLowerCase(),
            ) ||
            (i.provider?.toLowerCase() ?? "").includes(
                searchQuery.value.toLowerCase(),
            );
        const matchesProvider =
            !selectedProviderB.value ||
            i.provider ===
                ((availableProviders.value &&
                    availableProviders.value.find(
                        (p) => p.id === selectedProviderB.value,
                    )?.name) ??
                    "");
        return matchesSearch && matchesProvider;
    }),
);

const loadProviders = async () => {
    try {
        const allProviders = await sdk.backend.listProviders();
        availableProviders.value = allProviders.filter(
            (p: Provider) => p.enabled,
        );
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
    const currentProvider = availableProviders.value.find(
        (p) => p.id === selectedProviderA.value,
    );
    if (!currentProvider) {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Please select a provider",
            life: 3000,
        });
        return;
    }

    if (currentProvider.type === "interactsh") {
        try {
            // Get settings for both URL generation and polling interval
            const settings = await sdk.backend.getCurrentSettings();
            const pollingInterval = settings?.pollingInterval || 5;

            await clientService.start(
                {
                    serverURL: currentProvider.url,
                    token: currentProvider.token || "",
                    keepAliveInterval: pollingInterval * 1000,
                },
                (interaction) => {
                    console.log(interaction);
                    oastStore.addInteraction({
                        id: uuidv4(),
                        type: "interactsh",
                        correlationId: interaction["full-id"] as string,
                        data: interaction,
                        method: interaction.protocol as string,
                        source: interaction["remote-address"] as string,
                        destination: interaction["full-id"] as string,
                        provider: currentProvider.name,
                        timestamp: interaction.timestamp as number,
                        rawRequest: interaction["raw-request"] as string,
                        rawResponse: interaction["raw-response"] as string,
                    });
                },
            );

            const { url: payloadUrl } = clientService.generateUrl();
            const prefix = settings?.payloadPrefix;
            console.log("Payload prefix:", prefix);
            if (prefix !== "" && prefix !== undefined) {
                payloadInput.value = prefix + "." + payloadUrl;
            } else {
                payloadInput.value = payloadUrl;
            }
        } catch (error) {
            console.error("Registration failed:", error);
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to register interactsh provider",
                life: 3000,
            });
        }
    } else if (currentProvider.type === "BOAST") {
        try {
            const payloadInfo =
                await sdk.backend.registerAndGetPayload(currentProvider);

            if (payloadInfo && payloadInfo.payloadUrl) {
                // Get settings once for both prefix and polling interval
                const settings = await sdk.backend.getCurrentSettings();
                const prefix = settings?.payloadPrefix;
                const pollingInterval = settings?.pollingInterval || 5;

                if (prefix !== "" && prefix !== undefined) {
                    payloadInput.value = prefix + "." + payloadInfo.payloadUrl;
                } else {
                    payloadInput.value = payloadInfo.payloadUrl;
                }

                // Call the new pollBoastEvents function with the configured polling interval
                setInterval(
                    () => pollBoastEvents(currentProvider),
                    pollingInterval * 1000,
                );

                toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: "BOAST Payload generated",
                    life: 3000,
                });
            }
        } catch (error) {
            console.error("BOAST registration failed:", error);
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to register BOAST provider",
                life: 3000,
            });
        }
    } else {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Provider type is not interactsh or BOAST",
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

// Helper function for BOAST polling
async function pollBoastEvents(provider: Provider) {
    if (!provider) {
        console.error("BOAST polling called without a provider.");
        return;
    }
    try {
        const events = await sdk.backend.getOASTEvents(provider);
        if (events && events.length > 0) {
            events.forEach((event: any) => {
                const exists = oastStore.interactions.some(
                    (i) => i.id === event.id,
                );
                if (!exists) {
                    oastStore.addInteraction({
                        id: event.id,
                        type: "BOAST",
                        correlationId: event.correlationId,
                        data: event,
                        method: event.method,
                        source: event.source,
                        destination: event.destination,
                        provider: provider.name,
                        timestamp: event.timestamp,
                        rawRequest: event.rawRequest,
                        rawResponse: event.rawResponse,
                    });
                }
            });
            toast.add({
                severity: "success",
                summary: "Success",
                detail: `Polled ${events.length} new event(s)`,
                life: 2000,
            });
        }
    } catch (pollError) {
        console.error("Error polling BOAST events:", pollError);
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to poll BOAST events",
            life: 3000,
        });
    }
}

// Modified pollInteractions to handle both Interactsh and BOAST
async function pollInteractions() {
    console.log("Poll Interactions clicked");
    const currentProvider = availableProviders.value.find(
        (p) => p.id === selectedProviderA.value,
    );

    if (!currentProvider) {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: "Please select a provider first",
            life: 3000,
        });
        return;
    }

    if (currentProvider.type === "interactsh") {
        clientService.poll();
        toast.add({
            severity: "info",
            summary: "Info",
            detail: "Polling for Interactsh events...",
            life: 2000,
        });
    } else if (currentProvider.type === "BOAST") {
        await pollBoastEvents(currentProvider);
    } else {
        toast.add({
            severity: "warn",
            summary: "Warning",
            detail: `Polling not implemented for provider type: ${currentProvider.type}`,
            life: 3000,
        });
    }
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

function showDetails(event: any) {
    selectedInteraction.value = event.data;
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
    <div class="h-full flex flex-col gap-1">
        <div
            class="w-full h-3/5 bg-surface-0 dark:bg-surface-800 rounded flex flex-col"
        >
            <!-- 도구바 -->
            <div class="flex flex-col gap-2 p-4 flex-shrink-0">
                <div class="flex items-center justify-between">
                    <div class="flex space-x-2 items-center">
                        <Dropdown
                            v-model="selectedProviderA"
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
                            class="leading-none ml-2 m-0 py-2 px-3 rounded-md text-surface-800 dark:text-white/80 placeholder:text-surface-400 dark:placeholder:text-surface-500 bg-surface-0 dark:bg-surface-950 border border-surface-300 dark:border-surface-700 invalid:focus:ring-danger-400 invalid:hover:border-danger-400 hover:border-surface-400 dark:hover:border-surface-600 focus:outline-none focus:outline-offset-0 focus:ring-1 focus:ring-secondary-500 dark:focus:ring-secondary-400 focus:z-10 appearance-none transition-colors duration-200 w-96"
                        />
                        <Button
                            label="Copy"
                            icon="fa fa-copy"
                            class="p-button-secondary"
                            @click="copyToClipboard(payloadInput, 'Payload')"
                        />
                    </div>
                    <div class="flex space-x-2">
                        <Button
                            label="Clear"
                            icon="fa fa-trash"
                            class="p-button-warning"
                            @click="clearInteractions"
                        />
                        <Button
                            label="Poll"
                            icon="fa fa-refresh"
                            class="p-button-secondary"
                            @click="pollInteractions"
                        />
                    </div>
                </div>
            </div>
            <!-- 검색바 -->
            <div class="px-4 mb-2 flex-shrink-0 flex items-center gap-2">
                <input
                    v-model="searchQuery"
                    type="text"
                    class="oast-search-bar w-full h-10 px-3 py-2 rounded border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950"
                    placeholder="Search interactions..."
                    style="min-width: 0; display: flex; align-items: center"
                />
                <Dropdown
                    v-model="selectedProviderB"
                    :options="availableProvidersWithAll"
                    option-label="name"
                    option-value="id"
                    placeholder="Filter by Provider"
                    class="w-64 mb-2 h-10"
                    clearable
                    :style="{
                        display: 'flex',
                        alignItems: 'center',
                    }"
                />
            </div>
            <!-- Interaction 리스트 -->
            <div class="flex-grow overflow-auto px-4 pb-4">
                <DataTable
                    :value="filteredInteractions"
                    table-style="min-width: 50rem;"
                    table-class="omnioast-table bg-surface-0 dark:bg-surface-800"
                    sort-field="timestamp"
                    :sort-order="-1"
                    selection-mode="single"
                    data-key="timestamp"
                    @row-select="showDetails"
                >
                    <Column
                        field="method"
                        header="Method"
                        :sortable="true"
                        class
                    >
                        <template #body="slotProps">
                            <span class="flex items-center">
                                <i
                                    v-if="
                                        slotProps.data.method &&
                                        (slotProps.data.method.toUpperCase() ===
                                            'HTTP' ||
                                            slotProps.data.method.toUpperCase() ===
                                                'HTTPS')
                                    "
                                    class="fa fa-globe mr-2 text-info"
                                    title="HTTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'DNS'
                                    "
                                    class="fa fa-globe-asia mr-2 text-success"
                                    title="DNS"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'SMTP'
                                    "
                                    class="fa fa-at mr-2 text-info"
                                    title="SMTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'LDAP'
                                    "
                                    class="fa fa-user-circle mr-2 text-info"
                                    title="LDAP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'SMB'
                                    "
                                    class="fa fa-server mr-2 text-warning"
                                    title="SMB"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'FTP'
                                    "
                                    class="fa fa-cloud-upload mr-2 text-warning"
                                    title="FTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.method &&
                                        slotProps.data.method.toUpperCase() ===
                                            'RESPONDER'
                                    "
                                    class="fa fa-arrow-down mr-2 text-warning"
                                    title="Responder"
                                ></i>
                                <i
                                    v-else
                                    class="fa fa-question-circle mr-2"
                                    title="Other"
                                ></i>
                                <span>{{
                                    slotProps.data.method
                                        ? slotProps.data.method.toUpperCase()
                                        : ""
                                }}</span>
                            </span>
                        </template>
                    </Column>
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

        <div class="w-full h-2/5 flex flex-col">
            <div v-if="selectedInteraction" class="flex gap-1 w-full h-full">
                <div
                    class="field mb-4 w-1/2 p-4 h-full bg-surface-0 dark:bg-surface-800 rounded"
                >
                    <label for="rawRequest" class="font-bold block mb-2"
                        >Raw Request</label
                    >
                    <pre
                        id="rawRequest"
                        class="w-full bg-transparent border-none outline-none whitespace-pre-wrap"
                        style="font-family: inherit; font-size: inherit"
                        >{{ selectedInteraction.rawRequest }}</pre
                    >
                </div>
                <div
                    class="field w-1/2 p-4 h-full bg-surface-0 dark:bg-surface-800 rounded"
                >
                    <label for="rawResponse" class="font-bold block mb-2"
                        >Raw Response</label
                    >
                    <pre
                        id="rawResponse"
                        class="w-full bg-transparent border-none outline-none whitespace-pre-wrap"
                        style="font-family: inherit; font-size: inherit"
                        >{{ selectedInteraction.rawResponse }}</pre
                    >
                </div>
            </div>
            <div
                v-else
                class="flex items-center justify-center h-full text-gray-400 bg-surface-0 dark:bg-surface-800 rounded"
            >
                No selected inteaction.
            </div>
        </div>
    </div>
</template>
