<template>
    <TabView>
        <TabPanel header="OAST">
            <div class="oast-section">
                <div class="oast-section-header">
                    <div class="oast-section-actions">
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
            <div class="text-center text-gray-400 py-8">
                Settings page (coming soon)
            </div>
        </TabPanel>
        <TabPanel header="How to Use">
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

function onGetAddress() {
    // Placeholder: implement address retrieval logic
    // Use Caido Toast or dialog in real implementation
    alert("Get Address clicked (implement logic)");
}

function onRefresh() {
    // Placeholder: implement refresh logic
    alert("Refresh clicked (implement logic)");
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
</script>

<style scoped></style>
