<script setup lang="ts">
import { useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { v4 as uuidv4 } from "uuid";
import { computed, onMounted, ref, watch } from "vue";

import type { Provider } from "../../../backend/src/validation/schemas";

import OastTabs from "./OastTabs.vue";

import { useSDK } from "@/plugins/sdk";
import { useClientService } from "@/services/interactsh";
import { useOastStore } from "@/stores/oastStore";
import { formatTimestamp } from "@/utils/time";

const { copy } = useClipboard();
const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();

const clientService = useClientService();

const requestEditor = ref<any>(null);
const responseEditor = ref<any>(null);
const requestContainer = ref<HTMLElement | null>(null);
const responseContainer = ref<HTMLElement | null>(null);

const selectedProviderA = computed({
    get: () =>
        oastStore.activeTab
            ? oastStore.tabProviders[oastStore.activeTab.id] || ""
            : "",
    set: (value) => {
        if (oastStore.activeTab) {
            oastStore.setTabProvider(oastStore.activeTab.id, value);
        }
    },
});
const selectedProviderB = ref<string | undefined>(undefined); // Interaction 필터용
const availableProviders = ref<Provider[]>([]);

const availableProvidersWithAll = computed(() => [
    { id: "", name: "All Providers" },
    ...availableProviders.value,
]);

onMounted(() => {});
const selectedInteraction = ref<any>(null);
const payloadInput = computed({
    get: () =>
        oastStore.activeTab
            ? oastStore.tabPayloads[oastStore.activeTab.id] || ""
            : "",
    set: (value) => {
        if (oastStore.activeTab) {
            oastStore.setTabPayload(oastStore.activeTab.id, value);
        }
    },
});
const activePollingSessions = ref<Record<string, any>>({});

const searchQuery = ref("");
const filteredInteractions = computed(() =>
    oastStore.interactions.filter((i) => {
        const matchesSearch =
            (i.protocol?.toLowerCase() ?? "").includes(
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
            ) ||
            (i.rawRequest?.toLowerCase() ?? "").includes(
                searchQuery.value.toLowerCase(),
            ) ||
            (i.rawResponse?.toLowerCase() ?? "").includes(
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
        sdk.window.showToast("Failed to load providers", { variant: "error" });
        console.error("Failed to load providers:", error);
    }
};

async function getPayload() {
    const activeTab = oastStore.activeTab;
    if (!activeTab) {
        sdk.window.showToast("No active tab found", { variant: "error" });
        return;
    }

    const currentProvider = availableProviders.value.find(
        (p) => p.id === selectedProviderA.value,
    );
    if (!currentProvider || !currentProvider.id) {
        sdk.window.showToast("Please select a valid provider", {
            variant: "warning",
        });
        return;
    }

    if (activePollingSessions.value[currentProvider.id]) {
        sdk.window.showToast("Polling is already active for this provider.", {
            variant: "info",
        });
        return;
    }

    const settings = await sdk.backend.getCurrentSettings();
    const pollingInterval = (settings?.pollingInterval || 5) * 1000;

    let payloadUrl = "";
    let stopPolling: () => void;

    const pollingId = uuidv4();
    const updateLastPolled = () => {
        oastStore.updatePollingLastPolled(pollingId, Date.now());
    };

    if (currentProvider.type === "interactsh") {
        try {
            await clientService.start(
                {
                    serverURL: currentProvider.url,
                    token: currentProvider.token || "",
                    keepAliveInterval: pollingInterval,
                },
                (interaction: { [key: string]: any }) => {
                    const method = interaction["q-type"]
                        ? String(interaction["q-type"])
                        : typeof interaction["raw-request"] === "string"
                          ? interaction["raw-request"].split(" ")[0] || ""
                          : "";

                    oastStore.addInteraction(
                        {
                            id: uuidv4(),
                            type: "interactsh",
                            correlationId: String(interaction["full-id"]),
                            data: interaction,
                            protocol: String(interaction.protocol),
                            method: method,
                            source: String(interaction["remote-address"]),
                            destination: String(interaction["full-id"]),
                            provider: currentProvider.name,
                            timestamp: formatTimestamp(interaction.timestamp),
                            rawRequest: String(interaction["raw-request"]),
                            rawResponse: String(interaction["raw-response"]),
                        },
                        activeTab.id,
                    );
                    updateLastPolled();
                },
            );

            const { url } = clientService.generateUrl();
            payloadUrl = url;
            stopPolling = () => clientService.stop();
        } catch (error) {
            console.error("Registration failed:", error);
            sdk.window.showToast("Failed to register interactsh provider", {
                variant: "error",
            });
            return;
        }
    } else {
        try {
            const payloadInfo =
                await sdk.backend.registerAndGetPayload(currentProvider);

            if (payloadInfo && payloadInfo.payloadUrl) {
                payloadUrl = payloadInfo.payloadUrl;

                if (currentProvider.id) {
                    await sdk.backend.updateProvider(currentProvider.id, {
                        url: payloadInfo.payloadUrl,
                    });
                }
                currentProvider.url = payloadInfo.payloadUrl;

                const pollFunction = () => {
                    switch (currentProvider.type) {
                        case "BOAST":
                            pollBoastEvents(currentProvider, activeTab.id);
                            break;
                        case "webhooksite":
                            pollWebhooksiteEvents(
                                currentProvider,
                                activeTab.id,
                            );
                            break;
                        case "postbin":
                            pollPostbinEvents(currentProvider, activeTab.id);
                            break;
                    }
                    updateLastPolled();
                };

                const intervalId = setInterval(pollFunction, pollingInterval);
                stopPolling = () => clearInterval(intervalId);

                sdk.window.showToast(
                    "Provider registered and polling started",
                    { variant: "success" },
                );
            } else {
                payloadUrl = currentProvider.url;
                sdk.window.showToast(
                    `Using existing ${currentProvider.type} URL`,
                    { variant: "info" },
                );
            }
        } catch (error) {
            console.error(
                `${currentProvider.type} registration failed:`,
                error,
            );
            sdk.window.showToast(
                `Failed to register ${currentProvider.type} provider`,
                { variant: "error" },
            );
            return;
        }
    }

    const prefix = settings?.payloadPrefix;
    let finalPayload = payloadUrl;
    if (prefix) {
        finalPayload = `${prefix}.${payloadUrl}`;
    }
    payloadInput.value = finalPayload;

    const providerId = currentProvider.id;
    activePollingSessions.value[providerId] = pollingId;

    oastStore.addPolling({
        id: pollingId,
        payload: payloadInput.value,
        provider: currentProvider.name,
        lastPolled: Date.now(),
        interval: pollingInterval,
        stop: () => {
            stopPolling();
            delete activePollingSessions.value[providerId];
        },
        tabId: activeTab.id,
        tabName: activeTab.name,
    });
}

function clearInteractions() {
    oastStore.clearInteractions();
    selectedInteraction.value = "";
    sdk.window.showToast("Interactions cleared", { variant: "success" });
}

// Helper function for BOAST polling
async function pollBoastEvents(provider: Provider, tabId: string) {
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
                    oastStore.addInteraction(
                        {
                            id: event.id,
                            type: "BOAST",
                            correlationId: event.correlationId,
                            data: event,
                            protocol: event.protocol,
                            method: event.method,
                            source: event.source,
                            destination: event.destination,
                            provider: provider.name,
                            timestamp: formatTimestamp(event.timestamp),
                            rawRequest: event.rawRequest,
                            rawResponse: event.rawResponse,
                        },
                        tabId,
                    );
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
        sdk.window.showToast("Failed to poll BOAST events", {
            variant: "error",
        });
    }
}

// Helper function for webhook.site polling
async function pollWebhooksiteEvents(provider: Provider, tabId: string) {
    if (!provider) {
        console.error("Webhook.site polling called without a provider.");
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
                    oastStore.addInteraction(
                        {
                            id: event.id,
                            type: "webhooksite",
                            correlationId: event.correlationId,
                            data: event,
                            protocol: event.protocol,
                            method: event.method,
                            source: event.source,
                            destination: event.destination,
                            provider: provider.name,
                            timestamp: formatTimestamp(event.timestamp),
                            rawRequest: event.rawRequest,
                            rawResponse: event.rawResponse,
                        },
                        tabId,
                    );
                }
            });
            sdk.window.showToast("Webhook.site events polled successfully", {
                variant: "success",
            });
        }
    } catch (pollError) {
        console.error("Error polling webhook.site events:", pollError);
        sdk.window.showToast("Failed to poll webhook.site events", {
            variant: "error",
        });
    }
}

// Helper function for PostBin polling
async function pollPostbinEvents(provider: Provider, tabId: string) {
    if (!provider) {
        console.error("PostBin polling called without a provider.");
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
                    oastStore.addInteraction(
                        {
                            id: event.id,
                            type: "postbin",
                            correlationId: event.correlationId,
                            data: event,
                            protocol: event.protocol,
                            method: event.method,
                            source: event.source,
                            destination: event.destination,
                            provider: provider.name,
                            timestamp: formatTimestamp(event.timestamp),
                            rawRequest: event.rawRequest,
                            rawResponse: event.rawResponse,
                        },
                        tabId,
                    );
                }
            });
            sdk.window.showToast("postbin events polled successfully", {
                variant: "success",
            });
        }
    } catch (pollError) {
        console.error("Error polling PostBin events:", pollError);
        sdk.window.showToast("Failed to poll PostBin events", {
            variant: "error",
        });
    }
}

async function pollInteractions() {
    const activeTab = oastStore.activeTab;
    if (!activeTab) {
        sdk.window.showToast("No active tab found", { variant: "error" });
        return;
    }

    const tabPollingTasks = oastStore.pollingList.filter(
        (p) => p.tabId === activeTab.id,
    );
    if (tabPollingTasks.length === 0) {
        sdk.window.showToast("No active polling tasks for this tab", {
            variant: "info",
        });
        return;
    }

    toast.add({
        severity: "info",
        summary: "Info",
        detail: `Polling ${tabPollingTasks.length} task(s) for this tab...`,
        life: 2000,
    });

    for (const task of tabPollingTasks) {
        const provider = availableProviders.value.find(
            (p) => p.name === task.provider,
        );
        if (!provider) continue;

        switch (provider.type) {
            case "interactsh":
                clientService.poll();
                break;
            case "BOAST":
                await pollBoastEvents(provider, activeTab.id);
                break;
            case "webhooksite":
                await pollWebhooksiteEvents(provider, activeTab.id);
                break;
            case "postbin":
                await pollPostbinEvents(provider, activeTab.id);
                break;
        }
    }
}

function copyToClipboard(value: string, field: string) {
    if (!value) {
        sdk.window.showToast("Nothing to copy", { variant: "warning" });
        return;
    }
    copy(value);
    sdk.window.showToast("Copied to clipboard", { variant: "success" });
}

function showDetails(event: any) {
    selectedInteraction.value = event.data;
}

onMounted(() => {
    loadProviders();

    requestEditor.value = sdk.ui.httpRequestEditor();
    responseEditor.value = sdk.ui.httpResponseEditor();

    console.log("requestEditor.value:", requestEditor.value);
    console.log("responseEditor.value:", responseEditor.value);

    if (requestContainer.value) {
        const reqEl = requestEditor.value.getElement(); // bind 제거: 불필요
        console.log(
            "requestEditor.getElement():",
            reqEl,
            reqEl?.outerHTML,
            reqEl instanceof HTMLElement,
        );
        requestContainer.value.appendChild(reqEl);
    } else {
        console.warn("requestContainer.value is not defined");
    }

    if (responseContainer.value) {
        const resEl = responseEditor.value.getElement();
        console.log(
            "responseEditor.getElement():",
            resEl,
            resEl?.outerHTML,
            resEl instanceof HTMLElement,
        );
        responseContainer.value.appendChild(resEl);
    } else {
        console.warn("responseContainer.value is not defined");
    }
});

watch(selectedInteraction, (interaction) => {
    // requestEditor에 대한 안전성 체크
    if (
        interaction &&
        requestEditor.value &&
        typeof requestEditor.value.getEditorView === "function"
    ) {
        const reqEditorView = requestEditor.value.getEditorView();
        if (reqEditorView) {
            reqEditorView.dispatch({
                changes: {
                    from: 0,
                    to: reqEditorView.state.doc.length,
                    insert: interaction.rawRequest,
                },
            });
        }
    } // responseEditor에 대한 안전성 체크
    if (
        interaction &&
        responseEditor.value &&
        typeof responseEditor.value.getEditorView === "function"
    ) {
        const resEditorView = responseEditor.value.getEditorView();
        if (resEditorView) {
            resEditorView.dispatch({
                changes: {
                    from: 0,
                    to: resEditorView.state.doc.length,
                    insert: interaction.rawResponse,
                },
            });
        }
    }
});

// Function to poll all tabs - exposed globally for command access
async function pollAllTabs() {
    const allTabs = oastStore.tabs;
    const allPollingTasks = oastStore.pollingList;

    if (allTabs.length === 0) {
        sdk.window.showToast("No tabs available for polling", {
            variant: "warning",
        });
        return;
    }

    if (allPollingTasks.length === 0) {
        sdk.window.showToast("Polling started for all tasks in this tab", {
            variant: "info",
        });
        return;
    }

    let totalPolled = 0;

    for (const tab of allTabs) {
        const tabPollingTasks = allPollingTasks.filter(
            (p) => p.tabId === tab.id,
        );
        if (tabPollingTasks.length === 0) continue;

        for (const task of tabPollingTasks) {
            const provider = availableProviders.value.find(
                (p) => p.name === task.provider,
            );
            if (!provider) continue;

            try {
                switch (provider.type) {
                    case "interactsh":
                        clientService.poll();
                        break;
                    case "BOAST":
                        await pollBoastEvents(provider, tab.id);
                        break;
                    case "webhooksite":
                        await pollWebhooksiteEvents(provider, tab.id);
                        break;
                    case "postbin":
                        await pollPostbinEvents(provider, tab.id);
                        break;
                }
                totalPolled++;
            } catch (error) {
                console.error(
                    `Error polling ${provider.type} for tab ${tab.name}:`,
                    error,
                );
            }
        }
    }

    sdk.window.showToast("BOAST events polled successfully", {
        variant: "success",
    });
}

// Expose function globally for command access
onMounted(() => {
    (window as { omnioastPollAllTabs?: () => void }).omnioastPollAllTabs =
        pollAllTabs;
});
</script>

<template>
    <div class="h-full flex flex-col gap-1">
        <OastTabs />
        <div
            class="w-full h-3/5 bg-surface-0 dark:bg-surface-800 rounded flex flex-col"
        >
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
                        field="protocol"
                        header="Protocol"
                        :sortable="true"
                        class
                    >
                        <template #body="slotProps">
                            <span class="flex items-center">
                                <i
                                    v-if="
                                        slotProps.data.protocol &&
                                        (slotProps.data.protocol.toUpperCase() ===
                                            'HTTP' ||
                                            slotProps.data.protocol.toUpperCase() ===
                                                'HTTPS')
                                    "
                                    class="fa fa-globe mr-2 text-info"
                                    title="HTTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
                                            'DNS'
                                    "
                                    class="fa fa-globe-asia mr-2 text-success"
                                    title="DNS"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
                                            'SMTP'
                                    "
                                    class="fa fa-at mr-2 text-info"
                                    title="SMTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
                                            'LDAP'
                                    "
                                    class="fa fa-user-circle mr-2 text-info"
                                    title="LDAP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
                                            'SMB'
                                    "
                                    class="fa fa-server mr-2 text-warning"
                                    title="SMB"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
                                            'FTP'
                                    "
                                    class="fa fa-cloud-upload mr-2 text-warning"
                                    title="FTP"
                                ></i>
                                <i
                                    v-else-if="
                                        slotProps.data.protocol &&
                                        slotProps.data.protocol.toUpperCase() ===
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
                                    slotProps.data.protocol
                                        ? slotProps.data.protocol.toUpperCase()
                                        : ""
                                }}</span>
                            </span>
                        </template>
                    </Column>
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

        <div class="w-full h-2/5 flex flex-col">
            <div v-show="selectedInteraction" class="flex gap-1 w-full h-full">
                <div
                    ref="requestContainer"
                    class="field mb-4 w-1/2 h-full bg-surface-0 dark:bg-surface-800 rounded"
                ></div>

                <div
                    ref="responseContainer"
                    class="field w-1/2 h-full bg-surface-0 dark:bg-surface-800 rounded"
                ></div>
            </div>

            <div
                v-show="!selectedInteraction"
                class="flex items-center justify-center h-full text-gray-400 bg-surface-0 dark:bg-surface-800 rounded"
            >
                No selected interaction.
            </div>
        </div>
    </div>
</template>
