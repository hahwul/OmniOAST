<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import SplitButton from "primevue/splitbutton";
import Checkbox from "primevue/checkbox";
import { useToast } from "primevue/usetoast";
import { onMounted, ref, computed } from "vue";

import type { Provider } from "../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";

type FetchedProvider = Provider & { id: string };
type ProviderFormData = Partial<Provider> & { id?: string };

const sdk = useSDK();
const toast = useToast();

const providerTypes = ref([
    { name: "Interactsh", code: "interactsh" as const },
    { name: "BOAST", code: "BOAST" as const },
    { name: "Webhook.site", code: "webhooksite" as const },
    { name: "PostBin", code: "postbin" as const },
]);

const providers = ref<FetchedProvider[]>([]);
const displayDialog = ref(false);
const autoGenerate = ref(false);

// Quick add menu items
const quickAddItems = ref([
    {
        label: "Interactsh",
        icon: "fa fa-globe",
        command: () => addPublicInteractshProvider(),
    },
    {
        label: "BOAST",
        icon: "fa fa-server",
        command: () => addPublicBoastProvider(),
    },
    {
        label: "Webhook.site",
        icon: "fa fa-link",
        command: () => addPublicWebhooksiteProvider(),
    },
    {
        label: "PostBin",
        icon: "fa fa-inbox",
        command: () => addPublicPostbinProvider(),
    },
]);
const isEdit = ref(false);

const currentProvider = ref<ProviderFormData>({
    name: "",
    type: providerTypes.value[0]!.code,
    url: "",
    token: "",
    enabled: true,
});

// Check if current provider type supports auto-generation
const supportsAutoGenerate = computed(() => {
    return (
        currentProvider.value.type &&
        ["webhooksite", "postbin", "BOAST"].includes(currentProvider.value.type)
    );
});

const loadProviders = async () => {
    try {
        providers.value =
            (await sdk.backend.listProviders()) as FetchedProvider[];
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

const openNew = () => {
    currentProvider.value = {
        name: "",
        type: providerTypes.value[0]!.code,
        url: "",
        token: "",
        enabled: true,
    };
    isEdit.value = false;
    autoGenerate.value = false;
    displayDialog.value = true;
};

const editProvider = (provider: FetchedProvider) => {
    currentProvider.value = { ...provider };
    isEdit.value = true;
    displayDialog.value = true;
};

const saveProvider = async () => {
    const isValidUrl = (url: string | undefined) =>
        !!url && /^https?:\/\/.+/.test(url);

    const providerData = currentProvider.value;

    // Skip URL validation if auto-generate is enabled
    if (!autoGenerate.value && !isValidUrl(providerData.url)) {
        toast.add({
            severity: "error",
            summary: "Validation Error",
            detail: "URL must start with http:// or https:// (or enable auto-generate)",
            life: 3000,
        });
        return;
    }

    try {
        if (isEdit.value && providerData.id) {
            const payload = JSON.parse(JSON.stringify(providerData));
            await sdk.backend.updateProvider(providerData.id, payload);
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Provider updated",
                life: 3000,
            });
        } else {
            // Creation mode
            let url = providerData.url;
            if (autoGenerate.value) {
                if (providerData.type === "webhooksite") {
                    url = "https://webhook.site";
                } else if (providerData.type === "postbin") {
                    url = "https://www.postb.in";
                } else if (providerData.type === "BOAST") {
                    url = "https://odiss.eu:2096/events";
                }
            }

            const payload = {
                name: providerData.name,
                type: providerData.type,
                url: url,
                token: providerData.token ?? "",
                enabled: providerData.enabled ?? true,
            };

            const createdProvider = await sdk.backend.createProvider(
                payload as any,
            );

            // Auto-generate payload if requested
            if (
                autoGenerate.value &&
                createdProvider &&
                supportsAutoGenerate.value
            ) {
                try {
                    const payloadInfo =
                        await sdk.backend.registerAndGetPayload(
                            createdProvider,
                        );
                    if (payloadInfo?.payloadUrl) {
                        await sdk.backend.updateProvider(createdProvider.id, {
                            url: payloadInfo.payloadUrl,
                        });
                        toast.add({
                            severity: "success",
                            summary: "Success",
                            detail: "Provider created with auto-generated URL",
                            life: 4000,
                        });
                    }
                } catch (autoGenError) {
                    console.error("Auto-generation failed:", autoGenError);
                    toast.add({
                        severity: "warn",
                        summary: "Warning",
                        detail: "Provider created but auto-generation failed",
                        life: 4000,
                    });
                }
            } else {
                toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: "Provider created",
                    life: 3000,
                });
            }
        }
        displayDialog.value = false;
        autoGenerate.value = false;
        await loadProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to save provider",
            life: 3000,
        });

        console.error("Failed to save provider:", error);
    }
};

const deleteProvider = async (id: string) => {
    if (!id) return;
    try {
        await sdk.backend.deleteProvider(id);
        toast.add({
            severity: "success",
            summary: "Success",
            detail: "Provider deleted",
            life: 3000,
        });
        await loadProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to delete provider",
            life: 3000,
        });

        console.error("Failed to delete provider:", error);
    }
};

const handleDelete = (provider: FetchedProvider) => {
    deleteProvider(provider.id);
};

const toggleEnabled = async (provider: FetchedProvider) => {
    try {
        await sdk.backend.toggleProviderEnabled(provider.id, !provider.enabled);
        toast.add({
            severity: "success",
            summary: "Success",
            detail: "Provider status updated",
            life: 3000,
        });
        await loadProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to update provider status",
            life: 3000,
        });

        console.error("Failed to toggle provider enabled status:", error);
    }
};

const addPublicInteractshProvider = async () => {
    const publicUrls = [
        "https://oast.pro",
        "https://oast.live",
        "https://oast.site",
        "https://oast.online",
        "https://oast.fun",
        "https://oast.me",
    ];

    const selectedUrl =
        publicUrls[Math.floor(Math.random() * publicUrls.length)];

    if (!selectedUrl) {
        toast.add({
            severity: "error",
            summary: "Internal Error",
            detail: "Could not select a public URL.",
            life: 3000,
        });

        console.error(
            "Could not select a public URL from the predefined list.",
        );
        return;
    }
    // --- FIX END ---

    try {
        const payload = {
            name: `Public Interactsh (${new URL(selectedUrl).host})`,
            type: "interactsh" as const,
            url: selectedUrl,
            token: "",
            enabled: true,
        };
        await sdk.backend.createProvider(payload as any);
        toast.add({
            severity: "success",
            summary: "Success",
            detail: "Public Interactsh Provider created",
            life: 3000,
        });
        await loadProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to create Public Interactsh Provider",
            life: 3000,
        });
        console.error("Failed to create Public Interactsh Provider:", error);
    }
};

const addPublicBoastProvider = async () => {
    // 44 bytes base64 (32 bytes → 44 base64 chars)
    function generateBase64Token(byteLength = 32) {
        const array = new Uint8Array(byteLength);
        window.crypto.getRandomValues(array);
        return btoa(String.fromCharCode(...array));
    }

    try {
        const provider = await sdk.backend.createProvider({
            name: "Public BOAST",
            type: "BOAST",
            url: "https://odiss.eu:2096/events",
            token: generateBase64Token(32),
        });
        if (provider) {
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Public BOAST Provider created",
                life: 3000,
            });
            await loadProviders();
        } else {
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to add public BOAST provider.",
                life: 3000,
            });
        }
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to create Public BOAST Provider",
            life: 3000,
        });
        console.error("Failed to create Public BOAST Provider:", error);
    }
};

const addPublicWebhooksiteProvider = async () => {
    try {
        const provider = await sdk.backend.createProvider({
            name: "Public Webhook.site",
            type: "webhooksite",
            url: "https://webhook.site",
            token: "",
        });
        if (provider) {
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Public Webhook.site Provider created",
                life: 3000,
            });
            await loadProviders();
        } else {
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to add public Webhook.site provider.",
                life: 3000,
            });
        }
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to create Public Webhook.site Provider",
            life: 3000,
        });
        console.error("Failed to create Public Webhook.site Provider:", error);
    }
};

const addPublicPostbinProvider = async () => {
    try {
        const provider = await sdk.backend.createProvider({
            name: "Public PostBin",
            type: "postbin",
            url: "https://www.postb.in",
            token: "",
        });
        if (provider) {
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Public PostBin Provider created",
                life: 3000,
            });
            await loadProviders();
        } else {
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to add public PostBin provider.",
                life: 3000,
            });
        }
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to create Public PostBin Provider",
            life: 3000,
        });
        console.error("Failed to create Public PostBin Provider:", error);
    }
};

// SplitButton 참조
const splitButton = ref<InstanceType<typeof SplitButton> | null>(null);

// 기본 버튼 클릭 핸들러: 메뉴 열기
const onQuickAddClick = () => {
    if (splitButton.value) {
        const buttons = splitButton.value.$el.querySelectorAll("button");
        if (buttons.length > 1) {
            buttons[1].click(); // 드롭다운 메뉴 버튼 클릭
        }
    }
};

onMounted(loadProviders);
</script>

<template>
    <div class="p-4 h-full bg-surface-0 dark:bg-surface-800 rounded">
        <div class="flex justify-between items-center mb-4">
            <Button
                label="New Provider"
                icon="fa fa-plus"
                class="p-button-success"
                @click="openNew"
            />
            <SplitButton
                ref="splitButton"
                label="Quick Add"
                icon="fa fa-bolt"
                class="p-button-info"
                :model="quickAddItems"
                @click="onQuickAddClick"
                menuButtonIcon="fa fa-chevron-down"
            />
        </div>

        <DataTable :value="providers" responsive-layout="scroll">
            <Column field="name" header="Name" :sortable="true"></Column>
            <Column field="type" header="Type" :sortable="true"></Column>
            <Column field="url" header="URL"></Column>
            <Column field="token" header="Token">
                <template #body="slotProps">
                    {{ slotProps.data.token ? "********" : "" }}
                </template>
            </Column>
            <Column header="Enabled">
                <template #body="slotProps">
                    <InputSwitch
                        :model-value="slotProps.data.enabled"
                        @update:model-value="toggleEnabled(slotProps.data)"
                    />
                </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
                <template #body="slotProps">
                    <Button
                        icon="fa fa-pencil"
                        class="p-button-rounded p-button-success mr-2"
                        @click="editProvider(slotProps.data)"
                    />
                    <Button
                        icon="fa fa-trash"
                        class="p-button-rounded p-button-warning"
                        @click="handleDelete(slotProps.data)"
                    />
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="displayDialog"
            :style="{ width: '450px' }"
            header="Provider Details"
            :modal="true"
            class="p-fluid bg-white rounded-lg shadow-lg p-6"
        >
            <form class="flex flex-col gap-4">
                <div class="flex flex-col gap-1">
                    <label for="name" class="font-semibold">Name</label>
                    <InputText
                        id="name"
                        v-model.trim="currentProvider.name"
                        required="true"
                        autofocus
                        :class="[
                            'border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition',
                            !currentProvider.name && displayDialog
                                ? 'border-red-400'
                                : 'border-gray-300',
                        ]"
                    />
                    <small
                        v-if="!currentProvider.name && displayDialog"
                        class="text-red-500"
                        >Name is required.</small
                    >
                </div>
                <div class="flex flex-col gap-1">
                    <label for="type" class="font-semibold">Type</label>
                    <Dropdown
                        id="type"
                        v-model="currentProvider.type"
                        :options="providerTypes"
                        option-label="name"
                        option-value="code"
                        placeholder="Select a Type"
                        required="true"
                        :class="[
                            'border rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition',
                            !currentProvider.type && displayDialog
                                ? 'border-red-400'
                                : 'border-gray-300',
                        ]"
                    />
                    <small
                        v-if="!currentProvider.type && displayDialog"
                        class="text-red-500"
                        >Type is required.</small
                    >
                </div>
                <div class="flex flex-col gap-1">
                    <label for="url" class="font-semibold">URL</label>
                    <InputText
                        id="url"
                        v-model.trim="currentProvider.url"
                        required="true"
                        :class="[
                            'border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition',
                            !currentProvider.url && displayDialog
                                ? 'border-red-400'
                                : 'border-gray-300',
                        ]"
                    />
                    <small
                        v-if="!currentProvider.url && displayDialog"
                        class="text-red-500"
                        >URL is required.</small
                    >
                </div>
                <div class="flex flex-col gap-1">
                    <label for="token" class="font-semibold"
                        >Token (Optional)</label
                    >
                    <InputText
                        id="token"
                        v-model.trim="currentProvider.token"
                        type="password"
                        class="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition border-gray-300"
                    />
                </div>
                <div
                    class="flex items-center gap-2"
                    v-if="supportsAutoGenerate"
                >
                    <Checkbox id="autoGenerate" v-model="autoGenerate" binary />
                    <label for="autoGenerate" class="font-semibold text-sm"
                        >Auto-generate URL after creation</label
                    >
                    <small class="text-gray-600"
                        >(Creates new webhook/bin automatically)</small
                    >
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <Button
                        label="Cancel"
                        icon="fa fa-times"
                        class="p-button-text bg-gray-100 hover:bg-gray-200 rounded"
                        @click="displayDialog = false"
                    />
                    <Button
                        label="Save"
                        icon="fa fa-check"
                        class="p-button-text bg-blue-600 hover:bg-blue-700 text-white rounded"
                        @click="saveProvider"
                    />
                </div>
            </form>
        </Dialog>
    </div>
</template>
