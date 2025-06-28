<template>
    <TabView>
        <TabPanel header="OAST">
            <div class="oast-section">
                <div class="oast-section-header">
                    <div class="oast-section-actions" style="display: flex; align-items: center; gap: 10px;">
                        <Dropdown
                            v-model="selectedOASTForRefresh"
                            :options="oastEndpoints"
                            optionLabel="name"
                            placeholder="Select an OAST Endpoint"
                            class="w-full md:w-14rem" style="flex-grow: 1;"
                        />
                        <Button
                            label="Get Address"
                            @click="onGetAddress"
                            size="small"
                        />
                        <Button
                            label="Refresh"
                            @click="onRefresh"
                            severity="secondary"
                            size="small"
                        />
                    </div>
                </div>
                <Card class="oast-card">
                    <template #content>
                        <DataTable
                            :value="history"
                            selectionMode="single"
                            dataKey="id"
                            :selection="selectedHistory"
                            @rowSelect="(e) => selectHistory(e.data)"
                            @rowUnselect="() => selectHistory(null)"
                            class="p-datatable-sm"
                            style="min-width: 100%"
                            :rowClass="rowClass"
                            scrollable
                            scrollHeight="250px"
                        >
                            <Column
                                field="protocol"
                                header="Protocol"
                                style="width: 110px"
                            />
                            <Column
                                field="source"
                                header="Source"
                                style="width: 180px"
                            />
                            <Column
                                field="destination"
                                header="Destination"
                                style="width: 180px"
                            />
                            <Column
                                field="type"
                                header="Type"
                                style="width: 110px"
                            />
                            <Column
                                field="timestamp"
                                header="Timestamp"
                                style="width: 180px"
                            />
                            <template #empty>
                                <div class="text-center text-gray-400 py-4">
                                    No history yet.
                                </div>
                            </template>
                        </DataTable>
                    </template>
                </Card>
                <Card class="oast-card mt-4">
                    <template #content>
                        <div v-if="selectedHistory" class="oast-detail-split">
                            <div class="oast-detail-col">
                                <div
                                    class="oast-detail-header oast-detail-header--request"
                                >
                                    Request
                                </div>
                                <div class="oast-detail-block-wrap">
                                    <pre
                                        class="caido-code-block oast-detail-block"
                                        >{{ selectedHistory.request }}</pre
                                    >
                                </div>
                            </div>
                            <div class="oast-detail-col">
                                <div
                                    class="oast-detail-header oast-detail-header--response"
                                >
                                    Response
                                </div>
                                <div class="oast-detail-block-wrap">
                                    <pre
                                        class="caido-code-block oast-detail-block"
                                        >{{ selectedHistory.response }}</pre
                                    >
                                </div>
                            </div>
                        </div>
                        <div v-else class="text-center text-gray-500 py-4">
                            Select a history entry to view details.
                        </div>
                    </template>
                </Card>
            </div>
        </TabPanel>
        <TabPanel header="Settings">
            <div>
                <Button
                    label="Add OAST Endpoint"
                    icon="pi pi-plus"
                    @click="openNewEndpointDialog"
                    class="mb-3"
                />
                <DataTable
                    :value="oastEndpoints"
                    dataKey="id"
                    selectionMode="single"
                    v-model:selection="selectedEndpoint"
                    class="p-datatable-sm"
                >
                    <Column field="name" header="Name" />
                    <Column field="address" header="Address" />
                    <Column field="enabled" header="Enabled">
                        <template #body="{ data }">
                            <Button
                                :label="data.enabled ? 'Enabled' : 'Disabled'"
                                :severity="
                                    data.enabled ? 'success' : 'secondary'
                                "
                                size="small"
                                @click="toggleEnable(data)"
                            />
                        </template>
                    </Column>
                    <Column header="Actions">
                        <template #body="{ data }">
                            <Button
                                icon="pi pi-pencil"
                                size="small"
                                @click="openEditEndpointDialog(data)"
                                class="mr-2"
                            />
                            <Button
                                icon="pi pi-trash"
                                size="small"
                                severity="danger"
                                @click="deleteEndpoint(data)"
                            />
                        </template>
                    </Column>
                </DataTable>
                <Dialog
                    v-model:visible="endpointDialogVisible"
                    header="OAST Endpoint"
                    :modal="true"
                    :closable="true"
                    style="width: 400px"
                >
                    <div class="p-fluid">
                        <div class="field">
                            <label for="name">Name</label>
                            <InputText id="name" v-model="newEndpoint.name" />
                        </div>
                        <div class="field">
                            <label for="address">Address</label>
                            <InputText
                                id="address"
                                v-model="newEndpoint.address"
                            />
                        </div>
                        <div class="field">
                            <label for="token">Token</label>
                            <InputText
                                id="token"
                                v-model="newEndpoint.token"
                            />
                        </div>
                        <div class="field">
                            <label>
                                <Checkbox
                                    v-model="newEndpoint.enabled"
                                    :binary="true"
                                />
                                Enabled
                            </label>
                        </div>
                    </div>
                    <template #footer>
                        <Button
                            label="Cancel"
                            @click="endpointDialogVisible = false"
                            class="p-button-text"
                        />
                        <Button label="Save" @click="saveEndpoint" />
                    </template>
                </Dialog>
            </div>
        </TabPanel>
        <TabPanel header="Help">
            <div class="text-center text-gray-400 py-8">
                How to Use page (coming soon)
            </div>
        </TabPanel>
    </TabView>
</template>

<script setup lang="ts">
import { ref } from "vue";
import TabView from "primevue/tabview";
import TabPanel from "primevue/tabpanel";
import Button from "primevue/button";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Card from "primevue/card";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Checkbox from "primevue/checkbox";
import Dropdown from "primevue/dropdown";
import { useSDK } from "../plugins/sdk";

const sdk = useSDK();

type HistoryItem = {
    id: number;
    protocol: string;
    source: string;
    destination: string;
    type: string;
    timestamp: string;
    request: string;
    response: string;
};

type OASTEndpoint = {
    id: string;
    name: string;
    address: string;
    token: string;
    enabled: boolean;
};

const history = ref<HistoryItem[]>([
    {
        id: 1,
        protocol: "HTTP",
        source: "10.0.0.1:12345",
        destination: "interactsh-1234.oast.site",
        type: "interacts",
        timestamp: "2024-06-01 12:34:56",
        request: "GET /test HTTP/1.1\nHost: interactsh-1234.oast.site\n...",
        response: "HTTP/1.1 200 OK\nContent-Type: text/plain\n...",
    },
    {
        id: 2,
        protocol: "DNS",
        source: "10.0.0.2",
        destination: "boast-5678.oast.site",
        type: "boast",
        timestamp: "2024-06-01 12:35:10",
        request: "DNS Query for boast-5678.oast.site",
        response: "DNS Response: 127.0.0.1",
    },
]);
const selectedHistory = ref<HistoryItem | null>(null);

const oastEndpoints = ref<OASTEndpoint[]>([
    {
        id: "1",
        name: "Interactsh",
        address: "interactsh-1234.oast.site",
        token: "your-token-here",
        enabled: true,
    },
    { id: "2", name: "Boast", address: "boast-5678.oast.site", token: "your-token-here", enabled: false },
]);
const selectedEndpoint = ref<OASTEndpoint | null>(null);
const endpointDialogVisible = ref(false);
const isEditMode = ref(false);

const newEndpoint = ref<OASTEndpoint>({
    id: "",
    name: "",
    address: "",
    token: "",
    enabled: true,
});

const selectedOASTForRefresh = ref<OASTEndpoint | null>(oastEndpoints.value.length > 0 ? oastEndpoints.value[0] : null);

async function onGetAddress() {
    const address = await sdk.api.getOASTAddress();
    if (address) {
        newEndpoint.value.address = address;
    }
}

async function onRefresh() {
    history.value = [];
    if (selectedOASTForRefresh.value) {
        const interactions = await sdk.api.fetchInteractions(selectedOASTForRefresh.value.id);
        if (interactions) {
            history.value.push(
                ...interactions.map((interaction: any) => ({
                    id: Math.random(), // Generate a unique ID for now
                    protocol: interaction.protocol,
                    source: interaction.source,
                    destination: interaction.destination,
                    type: interaction.type,
                    timestamp: interaction.timestamp,
                    request: JSON.stringify(interaction.request, null, 2),
                    response: JSON.stringify(interaction.response, null, 2),
                })),
            );
        }
    } else {
        // If no specific OAST is selected, refresh all enabled ones (current behavior)
        for (const endpoint of oastEndpoints.value) {
            if (endpoint.enabled) {
                const interactions = await sdk.api.fetchInteractions(endpoint.id);
                if (interactions) {
                    history.value.push(
                        ...interactions.map((interaction: any) => ({
                            id: Math.random(), // Generate a unique ID for now
                            protocol: interaction.protocol,
                            source: interaction.source,
                            destination: interaction.destination,
                            type: interaction.type,
                            timestamp: interaction.timestamp,
                            request: JSON.stringify(interaction.request, null, 2),
                            response: JSON.stringify(interaction.response, null, 2),
                        })),
                    );
                }
            }
        }
    }
}

function selectHistory(item: HistoryItem | null) {
    selectedHistory.value = item;
}

function rowIndexTemplate(rowData: HistoryItem, options: { rowIndex: number }) {
    return options.rowIndex + 1;
}

function rowClass(data: HistoryItem) {
    return selectedHistory.value && selectedHistory.value.id === data.id
        ? "bg-primary-50"
        : "";
}

// OAST Endpoint CRUD + Enable/Disable
function openNewEndpointDialog() {
    isEditMode.value = false;
    newEndpoint.value = { id: "", name: "", address: "", token: "", enabled: true };
    endpointDialogVisible.value = true;
}

function openEditEndpointDialog(endpoint: OASTEndpoint) {
    isEditMode.value = true;
    newEndpoint.value = { ...endpoint };
    endpointDialogVisible.value = true;
}

async function saveEndpoint() {
    if (isEditMode.value) {
        // Update
        const idx = oastEndpoints.value.findIndex(
            (e) => e.id === newEndpoint.value.id,
        );
        if (idx !== -1) oastEndpoints.value[idx] = { ...newEndpoint.value };
    } else {
        // Create
        const nextId = (Math.max(0, ...oastEndpoints.value.map((e) => parseInt(e.id))) + 1).toString();
        newEndpoint.value.id = nextId;
        oastEndpoints.value.push({ ...newEndpoint.value });
    }
    await sdk.api.saveOASTConfig({
        id: newEndpoint.value.id,
        name: newEndpoint.value.name,
        url: newEndpoint.value.address,
        token: newEndpoint.value.token,
    });
    endpointDialogVisible.value = false;
}

function deleteEndpoint(endpoint: OASTEndpoint) {
    oastEndpoints.value = oastEndpoints.value.filter(
        (e) => e.id !== endpoint.id,
    );
}

function toggleEnable(endpoint: OASTEndpoint) {
    endpoint.enabled = !endpoint.enabled;
}
</script>

<style scoped></style>
