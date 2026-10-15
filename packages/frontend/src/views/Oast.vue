<script setup lang="ts">
import { openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { StateEffect } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { refDebounced, useClipboard } from "@vueuse/core";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import { useToast } from "primevue/usetoast";
import { v4 as uuidv4 } from "uuid";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

import type { Provider } from "../../../backend/src/validation/schemas";

import OastTabs from "./OastTabs.vue";

import { useSDK } from "@/plugins/sdk";
import { useClientService } from "@/services/interactsh";
import {
  createInteractshCallback,
  usePollingManager,
} from "@/services/pollingManager";
import { useOastStore } from "@/stores/oastStore";

type PollingItem = ReturnType<typeof useOastStore>["pollingList"][number];
type PollingSession = PollingItem["session"];

const { copy } = useClipboard();
const sdk = useSDK();
const toast = useToast();
const oastStore = useOastStore();
const pollingManager = usePollingManager();

const requestEditor = ref<any>(null);
const responseEditor = ref<any>(null);
const requestContainer = ref<HTMLElement | null>(null);
const responseContainer = ref<HTMLElement | null>(null);

// Resizable split between interaction list and detail editors
const splitContainer = ref<HTMLElement | null>(null);
const topPanelPercent = ref(60); // default 60%
let isResizing = false;

function onDividerMouseDown(e: MouseEvent) {
  e.preventDefault();
  isResizing = true;
  document.addEventListener("mousemove", onDividerMouseMove);
  document.addEventListener("mouseup", onDividerMouseUp);
}

function onDividerMouseMove(e: MouseEvent) {
  if (!isResizing || !splitContainer.value) return;
  const rect = splitContainer.value.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const percent = (y / rect.height) * 100;
  topPanelPercent.value = Math.min(Math.max(percent, 20), 80);
}

function onDividerMouseUp() {
  isResizing = false;
  document.removeEventListener("mousemove", onDividerMouseMove);
  document.removeEventListener("mouseup", onDividerMouseUp);
}

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", onDividerMouseMove);
  document.removeEventListener("mouseup", onDividerMouseUp);
});

// Full-screen modal for viewing large request/response content
const expandedContent = ref("");
const expandedTitle = ref("");
const showExpandModal = ref(false);

function openExpandModal(title: string, content: string) {
  expandedTitle.value = title;
  expandedContent.value = content || "";
  showExpandModal.value = true;
}


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

const searchQuery = ref("");
const debouncedSearchQuery = refDebounced(searchQuery, 300);
const timeFrom = ref("");
const timeTo = ref("");

const filteredInteractions = computed(() => {
  const query = debouncedSearchQuery.value.toLowerCase();
  return oastStore.interactions.filter((i) => {
    const matchesSearch =
      !query ||
      (i.protocol?.toLowerCase() ?? "").includes(query) ||
      (i.source?.toLowerCase() ?? "").includes(query) ||
      (i.destination?.toLowerCase() ?? "").includes(query) ||
      (i.provider?.toLowerCase() ?? "").includes(query) ||
      (i.rawRequest?.toLowerCase() ?? "").includes(query) ||
      (i.rawResponse?.toLowerCase() ?? "").includes(query);
    const matchesProvider =
      !selectedProviderB.value ||
      i.provider ===
        ((availableProviders.value &&
          availableProviders.value.find((p) => p.id === selectedProviderB.value)
            ?.name) ??
          "");

    // Time range filter
    let matchesTime = true;
    if (timeFrom.value) {
      matchesTime = matchesTime && i.timestampNum >= new Date(timeFrom.value).getTime();
    }
    if (timeTo.value) {
      matchesTime = matchesTime && i.timestampNum <= new Date(timeTo.value).getTime();
    }

    return matchesSearch && matchesProvider && matchesTime;
  });
});

const clearTimeFilter = () => {
  timeFrom.value = "";
  timeTo.value = "";
};

const loadProviders = async () => {
  try {
    const allProviders = await sdk.backend.listProviders();
    availableProviders.value = allProviders.filter((p: Provider) => p.enabled);
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

  const settings = await sdk.backend.getCurrentSettings();
  const pollingInterval = (settings?.pollingInterval || 5) * 1000;

  let payloadUrl = "";
  let session: PollingSession | undefined;

  if (currentProvider.type === "interactsh") {
    try {
      // Register only; pollingManager.resume below polls from this session
      const client = useClientService();
      await client.start({
        serverURL: currentProvider.url,
        token: currentProvider.token || "",
      });
      payloadUrl = client.generateUrl().url;
      const si = await client.getSessionInfo();
      session = si ? { type: "interactsh", ...si } : undefined;
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

      if (payloadInfo?.payloadUrl) {
        payloadUrl = payloadInfo.payloadUrl;
        // webhook.site/PostBin identify the bin by its URL; BOAST must keep its
        // events API URL (its payload is a bare domain).
        if (currentProvider.type !== "BOAST") {
          await sdk.backend.updateProvider(currentProvider.id, {
            url: payloadUrl,
          });
          currentProvider.url = payloadUrl;
        }
      } else if (currentProvider.type === "customhttp") {
        // No registration step: the configured URL is polled as-is
        payloadUrl = currentProvider.url;
      } else {
        throw new Error("No payload URL returned");
      }
    } catch (error) {
      console.error(`${currentProvider.type} registration failed:`, error);
      sdk.window.showToast(
        `Failed to register ${currentProvider.type} provider`,
        { variant: "error" },
      );
      return;
    }
  }

  // Prefix is a subdomain label, so only apply it to bare-domain payloads
  const prefix = settings?.payloadPrefix;
  const finalPayload =
    prefix && !/^[a-z][a-z0-9+.-]*:\/\//i.test(payloadUrl)
      ? `${prefix}.${payloadUrl}`
      : payloadUrl;
  // The tab captured at click time, not whichever tab is active after the awaits
  await oastStore.setTabPayload(activeTab.id, finalPayload);
  await oastStore.addPayloadToHistory(activeTab.id, finalPayload);

  const pollingId = uuidv4();
  await oastStore.addPolling({
    id: pollingId,
    payload: finalPayload,
    provider: currentProvider.name,
    providerId: currentProvider.id,
    lastChecked: Date.now(),
    interval: pollingInterval,
    tabId: activeTab.id,
    tabName: activeTab.name,
    session,
  });

  const started = await pollingManager.resume(pollingId);
  if (started && currentProvider.type !== "interactsh") {
    sdk.window.showToast("Provider registered and polling started", {
      variant: "success",
    });
  }
}

function clearInteractions() {
  oastStore.clearInteractions();
  selectedInteraction.value = "";
  sdk.window.showToast("Interactions cleared", { variant: "success" });
}

// One-shot poll of the given tasks (Poll button and "Polling All Tabs" command)
async function pollTasks(tasks: PollingItem[]) {
  for (const task of tasks) {
    const provider =
      availableProviders.value.find((p) => p.id === task.providerId) ??
      availableProviders.value.find((p) => p.name === task.provider);
    if (!provider) continue;

    try {
      if (provider.type === "interactsh") {
        if (task.session?.type !== "interactsh") {
          console.warn("Interactsh manual poll skipped: no stored session");
          continue;
        }
        const tmpClient = useClientService();
        await tmpClient.start(
          {
            serverURL: task.session.serverURL,
            token: task.session.token,
            sessionInfo: {
              serverURL: task.session.serverURL,
              token: task.session.token,
              privateKey: task.session.privateKey || "",
              correlationID: task.session.correlationID,
              secretKey: task.session.secretKey,
              publicKey: task.session.publicKey,
            },
          },
          createInteractshCallback(oastStore, task.id, provider.name, task.tabId),
        );
        // Do not close/deregister: the background task still uses this session
        await tmpClient.poll();
      } else {
        await pollingManager.pollOnce(provider, task.tabId);
      }
      oastStore.updatePollingLastPolled(task.id, Date.now());
    } catch (e) {
      console.error(`Manual poll failed for ${provider.name}:`, e);
      sdk.window.showToast(`Failed to poll ${provider.name}`, {
        variant: "error",
      });
    }
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

  await pollTasks(tabPollingTasks);
}

function copyToClipboard(value: string, field: string) {
  if (!value) {
    sdk.window.showToast("Nothing to copy", { variant: "warning" });
    return;
  }
  copy(value);
  sdk.window.showToast("Copied to clipboard", { variant: "success" });
}

async function removePayload(payload: string) {
  if (!oastStore.activeTab) return;
  await oastStore.removePayloadAndTasks(oastStore.activeTab.id, payload);
  sdk.window.showToast("Payload and related tasks removed", {
    variant: "success",
  });
}

function showDetails(event: any) {
  selectedInteraction.value = event.data;
}

// Inject CodeMirror search extension into a Caido SDK editor
function enableEditorSearch(editor: any) {
  const view = editor?.getEditorView?.();
  if (!view) return;
  view.dispatch({
    effects: StateEffect.appendConfig.of([search(), keymap.of(searchKeymap)]),
  });
}

function triggerEditorSearch(editor: any) {
  const view = editor?.getEditorView?.();
  if (!view) return;
  openSearchPanel(view);
}

onMounted(() => {
  loadProviders();

  requestEditor.value = sdk.ui.httpRequestEditor();
  responseEditor.value = sdk.ui.httpResponseEditor();

  if (requestContainer.value) {
    requestContainer.value.appendChild(requestEditor.value.getElement());
  }

  if (responseContainer.value) {
    responseContainer.value.appendChild(responseEditor.value.getElement());
  }

  // Enable Ctrl+F / Cmd+F search in editors
  enableEditorSearch(requestEditor.value);
  enableEditorSearch(responseEditor.value);
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
  if (oastStore.pollingList.length === 0) {
    sdk.window.showToast("No polling tasks to poll", { variant: "info" });
    return;
  }
  await pollTasks(oastStore.pollingList);
}

// Expose function globally for command access
onMounted(() => {
  (window as { omnioastPollAllTabs?: () => void }).omnioastPollAllTabs =
    pollAllTabs;
});
</script>

<template>
  <div ref="splitContainer" class="h-full flex flex-col gap-1">
    <OastTabs />
    <div
      class="w-full bg-surface-0 dark:bg-surface-800 rounded flex flex-col"
      :style="{ height: topPanelPercent + '%' }"
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
      <!-- Payload history per tab -->
      <div class="px-4 pb-2 flex-shrink-0">
        <div class="text-xs font-semibold mb-1 text-surface-500">
          Recent Payloads
        </div>
        <div class="flex flex-wrap gap-1.5">
          <template
            v-for="p in oastStore.activeTab
              ? oastStore.tabPayloadHistory[oastStore.activeTab.id] || []
              : []"
            :key="p"
          >
            <div
              class="flex items-center gap-1 border border-surface-300 dark:border-surface-700 rounded px-1.5 py-0.5 max-w-[420px] text-xs"
            >
              <span class="truncate max-w-[320px]" :title="p">{{ p }}</span>
              <Button
                v-tooltip.bottom="'Copy'"
                icon="fa fa-copy"
                class="p-button-rounded p-button-text h-6 w-6 min-w-0 p-0 text-xs"
                @click="copyToClipboard(p, 'Payload')"
              />
              <Button
                v-tooltip.bottom="'Remove'"
                icon="fa fa-trash"
                class="p-button-rounded p-button-text p-button-danger h-6 w-6 min-w-0 p-0 text-xs"
                @click="removePayload(p)"
              />
            </div>
          </template>
          <div
            v-if="
              oastStore.activeTab &&
              (!oastStore.tabPayloadHistory[oastStore.activeTab.id] ||
                oastStore.tabPayloadHistory[oastStore.activeTab.id]?.length ===
                  0)
            "
            class="text-surface-400 text-sm"
          >
            No payloads yet.
          </div>
        </div>
      </div>
      <!-- 검색바 -->

      <div class="oast-filter-bar px-4 mb-2 flex-shrink-0 flex items-center gap-2">
        <input
          v-model="searchQuery"
          type="text"
          class="oast-search-bar flex-1 px-3 rounded border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950 text-sm"
          placeholder="Search interactions..."
          style="min-width: 0"
        />
        <Dropdown
          v-model="selectedProviderB"
          :options="availableProvidersWithAll"
          option-label="name"
          option-value="id"
          placeholder="Filter by Provider"
          class="oast-filter-dropdown w-48"
          clearable
        />
        <div class="flex items-center gap-1">
          <input
            v-model="timeFrom"
            type="datetime-local"
            class="oast-filter-input px-2 rounded border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950 text-xs"
            title="From"
          />
          <span class="text-surface-400 text-xs">~</span>
          <input
            v-model="timeTo"
            type="datetime-local"
            class="oast-filter-input px-2 rounded border border-surface-300 dark:border-surface-700 bg-surface-0 dark:bg-surface-950 text-xs"
            title="To"
          />
          <Button
            v-if="timeFrom || timeTo"
            icon="fa fa-times"
            class="p-button-text p-button-sm w-8 min-w-0 p-0"
            title="Clear time filter"
            style="height: 32px;"
            @click="clearTimeFilter"
          />
        </div>
      </div>
      <!-- Interaction 리스트 -->

      <div class="flex-grow overflow-auto px-4 pb-4">
        <DataTable
          :value="filteredInteractions"
          table-style="min-width: 50rem;"
          table-class="omnioast-table bg-surface-0 dark:bg-surface-800"
          sort-field="index"
          :sort-order="-1"
          selection-mode="single"
          data-key="id"
          @row-select="showDetails"
        >
          <Column field="index" header="#" :sortable="true" style="width: 60px">
            <template #body="slotProps">
              {{ slotProps.data.index }}
            </template>
          </Column>
          <Column field="protocol" header="Protocol" :sortable="true" class>
            <template #body="slotProps">
              <span class="flex items-center">
                <i
                  v-if="
                    slotProps.data.protocol &&
                    (slotProps.data.protocol.toUpperCase() === 'HTTP' ||
                      slotProps.data.protocol.toUpperCase() === 'HTTPS')
                  "
                  class="fa fa-globe mr-2 text-info"
                  title="HTTP"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'DNS'
                  "
                  class="fa fa-globe-asia mr-2 text-success"
                  title="DNS"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'SMTP'
                  "
                  class="fa fa-at mr-2 text-info"
                  title="SMTP"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'LDAP'
                  "
                  class="fa fa-user-circle mr-2 text-info"
                  title="LDAP"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'SMB'
                  "
                  class="fa fa-server mr-2 text-warning"
                  title="SMB"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'FTP'
                  "
                  class="fa fa-cloud-upload mr-2 text-warning"
                  title="FTP"
                ></i>
                <i
                  v-else-if="
                    slotProps.data.protocol &&
                    slotProps.data.protocol.toUpperCase() === 'RESPONDER'
                  "
                  class="fa fa-arrow-down mr-2 text-warning"
                  title="Responder"
                ></i>
                <i v-else class="fa fa-question-circle mr-2" title="Other"></i>
                <span>{{
                  slotProps.data.protocol
                    ? slotProps.data.protocol.toUpperCase()
                    : ""
                }}</span>
              </span>
            </template>
          </Column>
          <Column field="method" header="Method" :sortable="true"></Column>
          <Column field="source" header="Source" :sortable="true"></Column>
          <Column
            field="destination"
            header="Destination"
            :sortable="true"
          ></Column>
          <Column field="provider" header="Provider" :sortable="true"></Column>
          <Column field="timestampNum" header="Timestamp" :sortable="true">
            <template #body="slotProps">
              {{ slotProps.data.timestamp }}
            </template>
          </Column>
        </DataTable>
      </div>
    </div>

    <!-- Drag divider for resizing -->
    <div
      class="oast-resize-divider"
      @mousedown="onDividerMouseDown"
    ></div>

    <div class="w-full flex flex-col" :style="{ height: (100 - topPanelPercent) + '%' }">
      <div v-show="selectedInteraction" class="flex gap-1 w-full h-full">
        <div class="w-1/2 h-full flex flex-col bg-surface-0 dark:bg-surface-800 rounded">
          <div class="flex items-center justify-between px-2 py-1 flex-shrink-0">
            <span class="text-xs font-semibold text-surface-500">Request</span>
            <div class="flex items-center gap-1">
              <Button
                v-tooltip.bottom="'Search (Ctrl+F)'"
                icon="fa fa-search"
                class="p-button-rounded p-button-text h-6 w-6 min-w-0 p-0 text-xs"
                @click="triggerEditorSearch(requestEditor)"
              />
              <Button
                v-tooltip.bottom="'Expand'"
                icon="fa fa-expand"
                class="p-button-rounded p-button-text h-6 w-6 min-w-0 p-0 text-xs"
                @click="openExpandModal('Request', selectedInteraction?.rawRequest)"
              />
            </div>
          </div>
          <div ref="requestContainer" class="field flex-1 min-h-0 overflow-auto"></div>
        </div>

        <div class="w-1/2 h-full flex flex-col bg-surface-0 dark:bg-surface-800 rounded">
          <div class="flex items-center justify-between px-2 py-1 flex-shrink-0">
            <span class="text-xs font-semibold text-surface-500">Response</span>
            <div class="flex items-center gap-1">
              <Button
                v-tooltip.bottom="'Search (Ctrl+F)'"
                icon="fa fa-search"
                class="p-button-rounded p-button-text h-6 w-6 min-w-0 p-0 text-xs"
                @click="triggerEditorSearch(responseEditor)"
              />
              <Button
                v-tooltip.bottom="'Expand'"
                icon="fa fa-expand"
                class="p-button-rounded p-button-text h-6 w-6 min-w-0 p-0 text-xs"
                @click="openExpandModal('Response', selectedInteraction?.rawResponse)"
              />
            </div>
          </div>
          <div ref="responseContainer" class="field flex-1 min-h-0 overflow-auto"></div>
        </div>
      </div>

      <div
        v-show="!selectedInteraction"
        class="flex items-center justify-center h-full text-gray-400 bg-surface-0 dark:bg-surface-800 rounded"
      >
        No selected interaction.
      </div>
    </div>

    <!-- Expand dialog for full content inspection -->
    <Dialog
      v-model:visible="showExpandModal"
      :header="expandedTitle"
      :modal="true"
      :style="{ width: '90vw', height: '85vh' }"
      :content-style="{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full pr-8">
          <span class="font-bold">{{ expandedTitle }}</span>
          <Button
            icon="fa fa-copy"
            label="Copy"
            class="p-button-sm p-button-secondary"
            @click="copyToClipboard(expandedContent, expandedTitle)"
          />
        </div>
      </template>
      <pre class="oast-expand-content">{{ expandedContent }}</pre>
    </Dialog>
  </div>
</template>

<style scoped>
.oast-filter-bar {
  height: 32px;
}

.oast-filter-bar .oast-search-bar,
.oast-filter-bar .oast-filter-input {
  height: 32px;
  line-height: 32px;
  padding-top: 0;
  padding-bottom: 0;
  box-sizing: border-box;
}

.oast-filter-bar :deep(.oast-filter-dropdown) {
  height: 32px;
}

.oast-filter-bar :deep(.oast-filter-dropdown .p-dropdown-label) {
  padding-top: 0;
  padding-bottom: 0;
  line-height: 32px;
  font-size: 0.875rem;
}

.oast-filter-bar :deep(.oast-filter-dropdown .p-dropdown-trigger) {
  width: 2rem;
}

/* datetime-local picker: match Dropdown text/icon color */
.oast-filter-input {
  color: var(--p-text-color, var(--text-color, #334155));
  color-scheme: light;
}

[data-mode="dark"] .oast-filter-input {
  color: var(--p-text-color, var(--text-color, #e2e8f0));
  color-scheme: dark;
}

.oast-resize-divider {
  height: 5px;
  cursor: row-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
}

.oast-resize-divider::after {
  content: "";
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 3px;
  border-radius: 2px;
  background: var(--p-surface-400, #94a3b8);
  opacity: 0.4;
  transition: opacity 0.2s;
}

.oast-resize-divider:hover::after {
  opacity: 0.8;
}

.oast-expand-content {
  flex: 1;
  overflow: auto;
  margin: 0;
  padding: 1rem;
  font-family: monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  user-select: text;
}

/* CodeMirror search panel — Caido style */
:deep(.cm-panels) {
  background: var(--p-surface-100, #f1f5f9);
  border-color: var(--p-surface-300, #cbd5e1);
}

:deep(.cm-search) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 6px 8px;
  font-size: 0.8125rem;
  font-family: inherit;
}

:deep(.cm-search label) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--p-text-muted-color, var(--p-surface-500, #64748b));
}

:deep(.cm-textfield) {
  background: var(--p-surface-0, #fff);
  color: var(--p-text-color, #334155);
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.8125rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}

:deep(.cm-textfield:focus) {
  border-color: var(--p-primary-color, #6366f1);
  box-shadow: 0 0 0 1px var(--p-primary-color, #6366f1);
}

:deep(.cm-button) {
  background: var(--p-surface-200, #e2e8f0);
  color: var(--p-text-color, #334155);
  border: 1px solid var(--p-surface-300, #cbd5e1);
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 0.75rem;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

:deep(.cm-button:hover) {
  background: var(--p-surface-300, #cbd5e1);
}

:deep(.cm-button[name="close"]) {
  background: transparent;
  border: none;
  font-size: 1rem;
  padding: 2px 6px;
  opacity: 0.6;
}

:deep(.cm-button[name="close"]:hover) {
  opacity: 1;
}

:deep(.cm-searchMatch) {
  background: rgba(255, 213, 79, 0.3);
}

:deep(.cm-searchMatch-selected) {
  background: rgba(255, 167, 38, 0.5);
}

/* Dark mode overrides */
[data-mode="dark"] :deep(.cm-panels) {
  background: var(--p-surface-900, #0f172a);
  border-color: var(--p-surface-700, #334155);
}

[data-mode="dark"] :deep(.cm-textfield) {
  background: var(--p-surface-950, #020617);
  color: var(--p-text-color, #e2e8f0);
  border-color: var(--p-surface-700, #334155);
}

[data-mode="dark"] :deep(.cm-textfield:focus) {
  border-color: var(--p-primary-color, #818cf8);
  box-shadow: 0 0 0 1px var(--p-primary-color, #818cf8);
}

[data-mode="dark"] :deep(.cm-button) {
  background: var(--p-surface-800, #1e293b);
  color: var(--p-text-color, #e2e8f0);
  border-color: var(--p-surface-700, #334155);
}

[data-mode="dark"] :deep(.cm-button:hover) {
  background: var(--p-surface-700, #334155);
}

[data-mode="dark"] :deep(.cm-search label) {
  color: var(--p-text-muted-color, var(--p-surface-400, #94a3b8));
}

[data-mode="dark"] :deep(.cm-searchMatch) {
  background: rgba(255, 213, 79, 0.2);
}

[data-mode="dark"] :deep(.cm-searchMatch-selected) {
  background: rgba(255, 167, 38, 0.4);
}
</style>
