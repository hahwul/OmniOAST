<script setup lang="ts">
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Dialog from "primevue/dialog";
import Dropdown from "primevue/dropdown";
import InputSwitch from "primevue/inputswitch";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import type { Provider } from "../../../../backend/src/validation/schemas";

import { useSDK } from "@/plugins/sdk";

const sdk = useSDK();
const toast = useToast();

const providerTypes = ref([
    { name: "Interactsh", code: "interactsh" as const },
]);
const providers = ref<Provider[]>([]);
const displayDialog = ref(false);
const isEdit = ref(false);
const currentProvider = ref<Partial<Provider>>({
    name: "",
    type: providerTypes.value[0]!.code,
    url: "",
    token: "",
    enabled: true,
});

// providerTypes 선언이 위로 이동됨

const loadProviders = async () => {
    try {
        providers.value = await sdk.backend.listProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to load providers",
            life: 3000,
        });
        alert("Failed to load providers:" + error);
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
    displayDialog.value = true;
};

const editProvider = (provider: Provider) => {
    currentProvider.value = { ...provider };
    isEdit.value = true;
    displayDialog.value = true;
};

const saveProvider = async () => {
    console.log("saveProvider payload:", currentProvider.value);

    // URL 형식 체크
    const isValidUrl = (url: string | undefined) =>
        !!url && /^https?:\/\/.+/.test(url);
    if (!isValidUrl(currentProvider.value.url)) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "URL must start with http:// or https://",
            life: 3000,
        });
        return;
    }

    try {
        if (isEdit.value) {
            // Proxy → plain object 변환
            const plainProvider = JSON.parse(
                JSON.stringify(currentProvider.value),
            );
            console.log("saveProvider plain payload:", plainProvider);
            await sdk.backend.updateProvider(
                plainProvider.id!,
                plainProvider as Partial<Provider>,
            );
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Provider updated",
                life: 3000,
            });
        } else {
            const payload = {
                name: currentProvider.value.name ?? "",
                type: (currentProvider.value.type ??
                    "interactsh") as "interactsh",
                url: currentProvider.value.url ?? "",
                token: currentProvider.value.token ?? "",
            };
            console.log("payload to backend:", payload);
            await sdk.backend.createProvider({
                ...payload,
            });
            toast.add({
                severity: "success",
                summary: "Success",
                detail: "Provider created",
                life: 3000,
            });
        }
        displayDialog.value = false;
        await loadProviders();
    } catch (error) {
        toast.add({
            severity: "error",
            summary: "Error",
            detail: "Failed to save provider",
            life: 3000,
        });
        alert("Failed to save provider:" + error);
    }
};

const deleteProvider = async (id: any) => {
    const realId =
        typeof id === "object" && id !== null && "id" in id ? id.id : id;
    console.log("deleteProvider realId:", realId, "type:", typeof realId);
    try {
        await sdk.backend.deleteProvider(realId);
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
        alert("Failed to delete provider:" + error);
    }
};

const toggleEnabled = async (provider: Provider) => {
    const realId =
        typeof provider.id === "object" &&
        provider.id !== null &&
        "id" in provider.id
            ? provider.id.id
            : provider.id;
    console.log("toggleEnabled realId:", realId, "type:", typeof realId);
    try {
        await sdk.backend.toggleProviderEnabled(
            realId as string,
            !provider.enabled,
        );
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
        alert("Failed to toggle provider enabled status:" + error);
    }
};

onMounted(loadProviders);
</script>

<template>
    <div class="p-4">
        <Button
            label="New Provider"
            icon="pi pi-plus"
            class="p-button-success mb-4"
            @click="openNew"
        />

        <DataTable :value="providers" responsive-layout="scroll">
            <Column field="name" header="Name"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="url" header="URL"></Column>
            <Column field="token" header="Token"></Column>
            <Column header="Enabled">
                <template #body="slotProps">
                    <InputSwitch
                        :model-value="slotProps.data.enabled"
                        @update:model-value="toggleEnabled(slotProps.data)"
                    />
                </template>
            </Column>
            <Column :exportable="false" style="min-width: 8rem">
                <template #body="slotProps: { data: Provider }">
                    <Button
                        icon="pi pi-pencil"
                        class="p-button-rounded p-button-success mr-2"
                        @click="editProvider(slotProps.data)"
                    />
                    <Button
                        icon="pi pi-trash"
                        class="p-button-rounded p-button-warning"
                        @click="deleteProvider(slotProps.data.id)"
                    />
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="displayDialog"
            :style="{ width: '450px' }"
            header="Provider Details"
            :modal="true"
            class="p-fluid"
        >
            <div class="field">
                <label for="name">Name</label>
                <InputText
                    id="name"
                    v-model.trim="currentProvider.name"
                    required="true"
                    autofocus
                    :class="{
                        'p-invalid': !currentProvider.name && displayDialog,
                    }"
                />
                <small
                    v-if="!currentProvider.name && displayDialog"
                    class="p-error"
                    >Name is required.</small
                >
            </div>
            <div class="field">
                <label for="type">Type</label>
                <Dropdown
                    id="type"
                    v-model="currentProvider.type"
                    :options="providerTypes"
                    option-label="name"
                    option-value="code"
                    placeholder="Select a Type"
                    required="true"
                    :class="{
                        'p-invalid': !currentProvider.type && displayDialog,
                    }"
                />
                <small
                    v-if="!currentProvider.type && displayDialog"
                    class="p-error"
                    >Type is required.</small
                >
            </div>
            <div class="field">
                <label for="url">URL</label>
                <InputText
                    id="url"
                    v-model.trim="currentProvider.url"
                    required="true"
                    :class="{
                        'p-invalid': !currentProvider.url && displayDialog,
                    }"
                />
                <small
                    v-if="!currentProvider.url && displayDialog"
                    class="p-error"
                    >URL is required.</small
                >
            </div>
            <div class="field">
                <label for="token">Token (Optional)</label>
                <InputText id="token" v-model.trim="currentProvider.token" />
            </div>

            <template #footer>
                <Button
                    label="Cancel"
                    icon="pi pi-times"
                    class="p-button-text"
                    @click="displayDialog = false"
                />
                <Button
                    label="Save"
                    icon="pi pi-check"
                    class="p-button-text"
                    @click="saveProvider"
                />
            </template>
        </Dialog>
    </div>
</template>
