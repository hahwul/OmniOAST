<script setup lang="ts">
import { useRoleService } from "@/services/roles";
import { RoleState } from "@/types";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import type { RoleDTO } from "shared";

const props = defineProps<{
  state: RoleState & { type: "Success" };
}>();

const columns = [
  { field: "name", header: "Name" },
  { field: "description", header: "Description" },
];

const service = useRoleService();
const onDeleteRole = (role: RoleDTO) => {
  service.deleteRole(role.id);
};

const onRoleUpdate = (role: RoleDTO, field: keyof RoleDTO, value: string) => {
  service.updateRole(role.id, {
    ...role,
    [field]: value,
  });
};
</script>

<template>
  <DataTable
    :value="props.state.roles"
    striped-rows
    scrollable
    scroll-height="flex"
    size="small"
    edit-mode="cell"
    @cell-edit-complete="({ data, field, newValue }) => onRoleUpdate(data, field as keyof RoleDTO, newValue)"

  >
    <template #empty>
      <div class="flex flex-col items-center p-8 w-full">
        <p class="text-gray-400">No roles configured.</p>
        <p class="text-gray-400">Click on the button above to add a new role.</p>
      </div>
    </template>

    <Column
      v-for="column in columns"
      :key="column.field"
      :field="column.field"
      :header="column.header"
    >
      <template #editor="{ data, field }">
        <InputText v-model="data[field]" autofocus fluid />
      </template>
    </Column>

    <Column header="">
      <template #body="{ data }">
        <div class="flex justify-end">
          <Button icon="fas fa-trash"  size="small" text severity="danger" @click="onDeleteRole(data)" />
        </div>
      </template>
    </Column>
  </DataTable>
</template>
