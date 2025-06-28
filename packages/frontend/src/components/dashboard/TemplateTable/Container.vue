<script setup lang="ts">
import { useAnalysisService } from "@/services/analysis";
import { useSettingsService } from "@/services/settings";
import { useTemplateService } from "@/services/templates";
import { RoleState, SettingsState, TemplateState, UserState } from "@/types";
import { useMediaQuery } from "@vueuse/core";
import Button from "primevue/button";
import Card from "primevue/card";
import Checkbox from "primevue/checkbox";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import SelectButton from "primevue/selectbutton";
import type { RoleDTO, RuleStatusDTO, TemplateDTO, UserDTO } from "shared";
import { computed, ref } from "vue";
import RuleStatus from "./RuleStatus.vue";

const props = defineProps<{
  state: TemplateState & { type: "Success" };
  userState: UserState & { type: "Success" };
  roleState: RoleState & { type: "Success" };
  settingsState: SettingsState & { type: "Success" };
}>();

const selectedStatusFilter = ref<RuleStatusDTO | "All">("All");

const filteredTemplates = computed(() => {
  if (selectedStatusFilter.value === "All") return props.state.templates;

  return props.state.templates.filter((template) =>
    template.rules.some((rule) => rule.status === selectedStatusFilter.value)
  );
});

const handleStatusFilterChange = (status: RuleStatusDTO | "All") => {
  selectedStatusFilter.value = status;
};

const getRoleValue = (template: TemplateDTO, role: RoleDTO) => {
  const rule = template.rules.find(
    (rule) => rule.type === "RoleRule" && rule.roleId === role.id
  );
  return rule?.hasAccess ?? false;
};

const getRoleStatus = (template: TemplateDTO, role: RoleDTO) => {
  const rule = template.rules.find(
    (rule) => rule.type === "RoleRule" && rule.roleId === role.id
  );
  return rule?.status ?? "Untested";
};

const getUserValue = (template: TemplateDTO, user: UserDTO) => {
  const rule = template.rules.find(
    (rule) => rule.type === "UserRule" && rule.userId === user.id
  );
  return rule?.hasAccess ?? false;
};

const getUserStatus = (template: TemplateDTO, user: UserDTO) => {
  const rule = template.rules.find(
    (rule) => rule.type === "UserRule" && rule.userId === user.id
  );
  return rule?.status ?? "Untested";
};

const service = useTemplateService();
const toggleRole = (template: TemplateDTO, role: RoleDTO) => {
  service.toggleTemplateRole(template.id, role.id);
};

const toggleUser = (template: TemplateDTO, user: UserDTO) => {
  service.toggleTemplateUser(template.id, user.id);
};

const deleteTemplate = (template: TemplateDTO) => {
  service.deleteTemplate(template.id);
};

const clearTemplates = () => {
  service.clearTemplates();
};

const settingsService = useSettingsService();
const setAutoCaptureRequests = (value: "off" | "all" | "inScope") => {
  settingsService.setAutoCaptureRequests(value);
};

const getAutoCaptureRequestLabel = (value: "off" | "all" | "inScope") => {
  switch (value) {
    case "off":
      return "Off";
    case "all":
      return "All";
    case "inScope":
      return "In Scope";
  }
};

const analysisService = useAnalysisService();
const runAnalysis = () => {
  analysisService.runAnalysis();
};

const selection = computed({
  get: () => {
    const selectionState = analysisService.selectionState;
    if (selectionState.type === "None") return undefined;
    const templateId = selectionState.templateId;
    return props.state.templates.find((t) => t.id === templateId);
  },
  set: (template) => {
    analysisService.selectResult(template?.id);
  },
});

const isAnalyzing = computed(() => {
  return analysisService.jobState.type === "Analyzing";
});

const defaultPorts = [80, 443];

const getURLColumnValue = (template: TemplateDTO) => {
  let url = `${template.meta.isTls ? "https" : "http"}://${template.meta.host}`;
  if (
    !defaultPorts.includes(template.meta.port) ||
    (template.meta.port === 443 && !template.meta.isTls) ||
    (template.meta.port === 80 && template.meta.isTls)
  ) {
    url += `:${template.meta.port}`;
  }
  url += template.meta.path;
  if (url.length > 96) {
    url = url.substring(0, 96) + "...";
  }
  return url;
};

const onTemplateUpdate = (
  template: TemplateDTO,
  field: string,
  newValue: unknown
) => {
  service.updateTemplate(template.id, { ...template, [field]: newValue });
};

const isSmallScreen = useMediaQuery("(max-width: 1150px)");
</script>
<template>
  <div class="h-full">
    <Card
      class="h-full"
      :pt="{ body: { class: 'flex-1 min-h-0' }, content: { class: 'h-full' } }"
    >
      <template #header>
        <div
          :class="[
            'header-container p-4 flex justify-between gap-8',
            { 'flex-col gap-4': isSmallScreen, 'flex-row': !isSmallScreen },
          ]"
        >
          <div
            :class="[
              'header-info flex flex-col',
              { 'w-full': isSmallScreen, 'w-[40%]': !isSmallScreen },
            ]"
          >
            <h2 class="text-lg font-semibold">Templates</h2>
            <p class="text-sm text-gray-400">
              Add template requests to the queue for analysis.
            </p>
            <p class="text-sm text-gray-400">
              Specify which roles and users should have access to each resource.
              <br />
              Configure a regex to determine if the authentication was
              successful.
            </p>
          </div>
          <div class="flex items-end gap-4">
            <div class="flex flex-col gap-2">
              <div
                class="flex items-center gap-2"
                v-tooltip="
                  'Check this box if you want analysis to automatically run in the background.'
                "
              >
                <Checkbox
                  inputId="auto-analysis"
                  :model-value="settingsState.settings.autoRunAnalysis"
                  binary
                  @change="() => settingsService.toggleAutoRunAnalysis()"
                />
                <label for="auto-analysis" class="text-sm text-gray-400"
                  >Auto-run analysis</label
                >
              </div>
              <label class="text-sm text-gray-400">Auto-capture requests</label>
              <SelectButton
                :model-value="settingsState.settings.autoCaptureRequests"
                :options="['off', 'all', 'inScope']"
                :option-label="getAutoCaptureRequestLabel"
                @update:model-value="setAutoCaptureRequests"
                v-tooltip="
                  'Automatically add each intercepted request to the testing queue for analysis.'
                "
              />
            </div>
            <div
              class="flex flex-col gap-2"
              v-tooltip="
                'Filter table by the status value of at least one role/user.'
              "
            >
              <label class="text-sm text-gray-400"
                >Filter table by status</label
              >
              <SelectButton
                :options="['All', 'Enforced', 'Bypassed']"
                :model-value="selectedStatusFilter"
                @update:model-value="handleStatusFilterChange"
                placeholder="Filter by Status"
              />
            </div>
            <Button
              v-tooltip="'Clear all template entries.'"
              label="Clear All"
              @click="clearTemplates"
            />

            <Button
              v-tooltip="'Run the analysis on the current requests.'"
              label="Analyze"
              :loading="isAnalyzing"
              @click="runAnalysis"
            />
          </div>
        </div>
      </template>

      <template #content>
        <DataTable
          :value="filteredTemplates"
          striped-rows
          scrollable
          scroll-height="flex"
          size="small"
          edit-mode="cell"
          selection-mode="single"
          data-key="id"
          v-model:selection="selection"
          @cell-edit-complete="
            ({ data, field, newValue }) =>
              onTemplateUpdate(data, field, newValue)
          "
        >
          <Column field="method" header="Method" class="w-24">
            <template #body="{ data }">
              {{ data.meta.method }}
            </template>
          </Column>

          <Column header="URL">
            <template #body="{ data }">
              {{ getURLColumnValue(data) }}
            </template>
          </Column>

          <Column field="authSuccessRegex" header="Auth Success Regex">
            <template #editor="{ data }">
              <InputText v-model="data.authSuccessRegex" />
            </template>
          </Column>

          <Column v-for="role in roleState.roles" key="id" :header="role.name">
            <template #body="{ data }">
              <div class="flex items-center gap-4">
                <Checkbox
                  v-tooltip="
                    'Check this box if this role should have access to this resource.'
                  "
                  :model-value="getRoleValue(data, role)"
                  binary
                  @change="() => toggleRole(data, role)"
                />
                <RuleStatus :status="getRoleStatus(data, role)" />
              </div>
            </template>
          </Column>

          <Column
            v-for="user of userState.users"
            :key="user.id"
            :header="user.name"
          >
            <template #body="{ data }">
              <div class="flex items-center gap-4">
                <Checkbox
                  v-tooltip="
                    'Check this box if this user should have access to this resource.'
                  "
                  :model-value="getUserValue(data, user)"
                  binary
                  @change="() => toggleUser(data, user)"
                />
                <RuleStatus :status="getUserStatus(data, user)" />
              </div>
            </template>
          </Column>

          <Column header="">
            <template #body="{ data }">
              <div class="flex justify-end">
                <Button
                  icon="fas fa-trash"
                  text
                  severity="danger"
                  size="small"
                  @click="() => deleteTemplate(data)"
                />
              </div>
            </template>
          </Column>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
