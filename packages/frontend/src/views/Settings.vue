<script setup lang="ts">
import Button from "primevue/button";
import InputNumber from "primevue/inputnumber";
import InputText from "primevue/inputtext";
import { useToast } from "primevue/usetoast";
import { onMounted, ref } from "vue";

import { useSDK } from "@/plugins/sdk";

const sdk = useSDK();
const toast = useToast();

// Define settings interface
interface SettingsData {
    id?: string;
    pollingInterval: number;
    payloadPrefix: string;
}

type ApiPayload = {
    pollingInterval: number;
    payloadPrefix: string;
};

const settings = ref<SettingsData>({
    pollingInterval: 30,
    payloadPrefix: "",
});

// Load settings from backend
const loadSettings = () => {
    sdk.backend
        .getCurrentSettings()
        .then((result: any) => {
            if (result) {
                settings.value = result;
            }
        })
        .catch((error: any) => {
            toast.add({
                severity: "error",
                summary: "Error",
                detail: "Failed to load settings",
                life: 3000,
            });
            console.error("Failed to load settings:", error);
        });
};

// Save settings to backend
const saveSettings = () => {
    // 명시적으로 원시 타입으로 변환하여 API 호출에 사용
    const payload: ApiPayload = {
        pollingInterval: Number(settings.value.pollingInterval),
        payloadPrefix: String(settings.value.payloadPrefix || ""),
    };

    if (settings.value.id) {
        // Update existing settings
        // 명시적으로 타입을 지정하여 API 호출
        sdk.backend
            .updateSettings(String(settings.value.id), payload)
            .then(() => {
                toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: "Settings updated successfully",
                    life: 3000,
                });
            })
            .catch((error: any) => {
                toast.add({
                    severity: "error",
                    summary: "Error",
                    detail: "Failed to update settings",
                    life: 3000,
                });
                console.error("Failed to update settings:", error);
            });
    } else {
        // Create new settings
        // 명시적으로 타입을 지정하여 API 호출
        sdk.backend
            .createSettings(payload)
            .then((result: any) => {
                if (result) {
                    settings.value = result;
                }
                toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: "Settings created successfully",
                    life: 3000,
                });
            })
            .catch((error: any) => {
                toast.add({
                    severity: "error",
                    summary: "Error",
                    detail: "Failed to create settings",
                    life: 3000,
                });
                console.error("Failed to create settings:", error);
            });
    }
};

// Reset settings to defaults
const resetToDefaults = () => {
    // 원래 ID 값을 보존
    const currentId = settings.value.id ? String(settings.value.id) : undefined;

    // 기본값으로 설정
    settings.value = {
        ...(currentId ? { id: currentId } : {}),
        pollingInterval: 30,
        payloadPrefix: "",
    };

    toast.add({
        severity: "info",
        summary: "Reset",
        detail: "Settings reset to defaults",
        life: 3000,
    });

    // If we have an ID, also save the reset settings
    if (currentId) {
        saveSettings();
    }
};

onMounted(loadSettings);
</script>

<template>
    <div
        class="p-4 h-full bg-surface-0 dark:bg-surface-800 rounded overflow-scroll"
    >
        <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Settings</h2>
            <div class="flex gap-2">
                <Button
                    label="Reset to Defaults"
                    icon="fa fa-undo"
                    class="p-button-warning"
                    @click="resetToDefaults"
                />
                <Button label="Save" icon="fa fa-save" @click="saveSettings" />
            </div>
        </div>

        <div class="flex flex-col gap-6">
            <div class="settings-section">
                <h3 class="text-lg font-semibold mb-3">Polling Settings</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="pollingInterval" class="font-medium">
                            Polling Interval (seconds)
                        </label>
                        <InputNumber
                            id="pollingInterval"
                            v-model="settings.pollingInterval"
                            :min="5"
                            :max="600"
                            class="w-full"
                            :useGrouping="false"
                        />
                        <small class="text-gray-500">
                            How often to check for new events (default: 30s)
                        </small>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3 class="text-lg font-semibold mb-3">Payload Settings</h3>
                <div class="grid grid-cols-1 gap-4">
                    <div class="flex flex-col gap-1">
                        <label for="payloadPrefix" class="font-medium">
                            Payload Prefix
                        </label>
                        <InputText
                            id="payloadPrefix"
                            v-model="settings.payloadPrefix"
                            class="w-full"
                        />
                        <small class="text-gray-500">
                            Optional prefix to add to generated payloads
                        </small>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.settings-section {
    padding: 1rem;
    border-radius: 0.5rem;
    background-color: rgba(0, 0, 0, 0.02);
}

:deep(.p-dropdown) {
    width: 100%;
}

:deep(.p-inputnumber) {
    width: 100%;
}
</style>
