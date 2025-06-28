<template>
    <div class="p-4">
        <h1 class="text-2xl font-bold mb-4">OAST Provider Configuration</h1>

        <div class="mb-4">
            <Button label="Add Provider" @click="openAddProviderDialog" />
        </div>

        <DataTable :value="providers">
            <Column field="name" header="Name"></Column>
            <Column field="type" header="Type"></Column>
            <Column field="url" header="URL"></Column>
            <Column header="Actions">
                <template #body="slotProps">
                    <Button
                        icon="pi pi-pencil"
                        class="p-button-rounded p-button-success mr-2"
                        @click="editProvider(slotProps.data)"
                    />
                    <Button
                        icon="pi pi-trash"
                        class="p-button-rounded p-button-danger"
                        @click="deleteProvider(slotProps.data.id)"
                    />
                </template>
            </Column>
        </DataTable>

        <Dialog
            v-model:visible="showProviderDialog"
            :header="dialogHeader"
            :modal="true"
        >
            <div class="flex flex-col gap-4">
                <InputText v-model="newProvider.name" placeholder="Name" />
                <Dropdown
                    v-model="newProvider.type"
                    :options="['interactsh', 'boast', 'custom']"
                    placeholder="Select a Type"
                />
                <InputText v-model="newProvider.url" placeholder="URL" />
                <InputText
                    v-model="newProvider.token"
                    placeholder="Token (optional)"
                />
            </div>
            <template #footer>
                <Button
                    label="Cancel"
                    icon="pi pi-times"
                    @click="showProviderDialog = false"
                    class="p-button-text"
                />
                <Button
                    :label="isEditMode ? 'Update' : 'Add'"
                    icon="pi pi-check"
                    @click="isEditMode ? updateProvider() : addProvider()"
                />
            </template>
        </Dialog>
    </div>
</template>

<script setup lang="ts">
console.log("Config.vue script setup initialized");
import { ref, onMounted, computed } from "vue";
import { OASTProvider } from "@/shared/types";
import * as oastRepo from "../repositories/oast";
import DataTable from "primevue/datatable";
import Column from "primevue/column";
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import InputText from "primevue/inputtext";
import Dropdown from "primevue/dropdown";

const providers = ref<OASTProvider[]>([]);
const showProviderDialog = ref(false);
const isEditMode = ref(false);
const newProvider = ref<OASTProvider>({
    id: "",
    name: "",
    type: "interactsh",
    url: "",
    token: "",
});

const dialogHeader = computed(() =>
    isEditMode.value ? "Edit OAST Provider" : "Add OAST Provider",
);

onMounted(async () => {
    console.log("Config.vue mounted");
    providers.value = await oastRepo.getOASTProviders();
});

const openAddProviderDialog = () => {
    console.log("openAddProviderDialog called");
    isEditMode.value = false;
    newProvider.value = {
        id: "",
        name: "",
        type: "interactsh",
        url: "",
        token: "",
    };
    showProviderDialog.value = true;
};

const addProvider = async () => {
    console.log(
        "addProvider called. showProviderDialog:",
        showProviderDialog.value,
        "isEditMode:",
        isEditMode.value,
    );
    try {
        const added = await oastRepo.addOASTProvider({
            ...newProvider.value,
            id: Date.now().toString(),
        });
        providers.value.push(added);
        showProviderDialog.value = false;
    } catch (error) {
        alert(error);
        console.error("Failed to add OAST provider:", error);
        // Optionally, show a user-friendly error message
    }
};

const editProvider = (provider: OASTProvider) => {
    isEditMode.value = true;
    newProvider.value = { ...provider };
    showProviderDialog.value = true;
};

const updateProvider = async () => {
    console.log(
        "updateProvider called. showProviderDialog:",
        showProviderDialog.value,
        "isEditMode:",
        isEditMode.value,
    );
    try {
        const updated = await oastRepo.updateOASTProvider(newProvider.value);
        const index = providers.value.findIndex((p) => p.id === updated.id);
        if (index !== -1) {
            providers.value[index] = updated;
        }
        showProviderDialog.value = false;
    } catch (error) {
        console.error("Failed to update OAST provider:", error);
        // Optionally, show a user-friendly error message
    }
};

const deleteProvider = async (id: string) => {
    try {
        await oastRepo.deleteOASTProvider(id);
        providers.value = providers.value.filter((p) => p.id !== id);
    } catch (error) {
        console.error("Failed to delete OAST provider:", error);
        // Optionally, show a user-friendly error message
    }
};
</script>
