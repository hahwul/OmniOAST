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
import { addBoastPublicProvider } from "@/services/boast";

// 'id'가 보장된 Provider 타입을 정의합니다.
type FetchedProvider = Provider & { id: string };

// 폼 데이터를 위한 타입을 정의합니다.
type ProviderFormData = Partial<Provider> & { id?: string };

const sdk = useSDK();
const toast = useToast();

const providerTypes = ref([
  { name: "Interactsh", code: "interactsh" as const },
  { name: "BOAST", code: "BOAST" as const },
]);

const providers = ref<FetchedProvider[]>([]);
const displayDialog = ref(false);
const isEdit = ref(false);

const currentProvider = ref<ProviderFormData>({
  name: "",
  type: providerTypes.value[0]!.code,
  url: "",
  token: "",
  enabled: true,
});

const loadProviders = async () => {
  try {
    providers.value = (await sdk.backend.listProviders()) as FetchedProvider[];
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

  if (!isValidUrl(providerData.url)) {
    toast.add({
      severity: "error",
      summary: "Validation Error",
      detail: "URL must start with http:// or https://",
      life: 3000,
    });
    return;
  }

  try {
    if (isEdit.value && providerData.id) {
      // 수정 모드: providerData.id가 string임을 보장합니다.
      const payload = JSON.parse(JSON.stringify(providerData));
      await sdk.backend.updateProvider(providerData.id, payload);
      toast.add({
        severity: "success",
        summary: "Success",
        detail: "Provider updated",
        life: 3000,
      });
    } else {
      // 생성 모드
      const payload = {
        name: providerData.name,
        type: providerData.type,
        url: providerData.url, // URL은 위에서 검증되었습니다.
        token: providerData.token ?? "",
        enabled: providerData.enabled ?? true,
      };
      await sdk.backend.createProvider(payload as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
  // 실제 Confirm 로직을 여기에 추가하는 것을 권장합니다.
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
    // UI 즉시 피드백을 위해 상태를 바로 변경하고, 실패 시 롤백하는 것도 좋은 방법입니다.
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
  const publicUrls = ["https://oast.me", "https://oast.fun"];
  const selectedUrl = publicUrls[Math.floor(Math.random() * publicUrls.length)];

  // --- FIX START ---
  // selectedUrl이 undefined일 가능성을 제거하여 타입 에러를 해결합니다.
  if (!selectedUrl) {
    toast.add({
      severity: "error",
      summary: "Internal Error",
      detail: "Could not select a public URL.",
      life: 3000,
    });

    console.error("Could not select a public URL from the predefined list.");
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
    await sdk.backend.createProvider(payload as any); // eslint-disable-line @typescript-eslint/no-explicit-any
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
  try {
    await addBoastPublicProvider();
    toast.add({
      severity: "success",
      summary: "Success",
      detail: "Public BOAST Provider created",
      life: 3000,
    });
    await loadProviders();
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
    <Button
      label="Add Public Interactsh Provider"
      icon="pi pi-plus"
      class="p-button-info mb-4 ml-2"
      style="float: right"
      @click="addPublicInteractshProvider"
    />
    <Button
      label="Add Public BOAST Provider"
      icon="pi pi-plus"
      class="p-button-info mb-4 ml-2"
      style="float: right"
      @click="addPublicBoastProvider"
    />

    <DataTable :value="providers" responsive-layout="scroll">
      <Column field="name" header="Name" :sortable="true"></Column>
      <Column field="type" header="Type" :sortable="true"></Column>
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
        <template #body="slotProps">
          <Button
            icon="pi pi-pencil"
            class="p-button-rounded p-button-success mr-2"
            @click="editProvider(slotProps.data)"
          />
          <Button
            icon="pi pi-trash"
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
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            'p-invalid': !currentProvider.name && displayDialog,
          }"
        />
        <small v-if="!currentProvider.name && displayDialog" class="p-error"
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
        <small v-if="!currentProvider.type && displayDialog" class="p-error"
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
        <small v-if="!currentProvider.url && displayDialog" class="p-error"
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
