<script setup lang="ts">
import { useUserService } from "@/services/users";
import { generateID } from "@/utils";
import Button from "primevue/button";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import type { UserAttributeDTO, UserDTO } from "shared";

const props = defineProps<{
  user: UserDTO;
}>();

const service = useUserService();
const onAddAttribute = () => {
  service.updateUser(props.user.id, {
    ...props.user,
    attributes: [
      ...props.user.attributes,
      {
        id: generateID(),
        name: "My attribute",
        value: "My value",
        kind: "Cookie",
      },
    ],
  });
};

const onRemoveAttribute = (attribute: UserAttributeDTO) => {
  service.updateUser(props.user.id, {
    ...props.user,
    attributes: props.user.attributes.filter(
      (attr) => attr.id !== attribute.id,
    ),
  });
};

const onAttributeUpdate = (
  attribute: UserAttributeDTO,
  field: keyof UserAttributeDTO,
  value: string,
) => {
  const newAttribute = {
    ...attribute,
    [field]: value,
  };

  service.updateUser(props.user.id, {
    ...props.user,
    attributes: props.user.attributes.map((attr) => {
      if (attr.id === attribute.id) {
        return newAttribute;
      }

      return attr;
    }),
  });
};
</script>

<template>
  <div class="flex-1 flex flex-col gap-2 min-h-0">
    <div class="flex justify-between items-center p-4">
      <h1 class="font-bold text-xl m-0">Attributes</h1>
      <div>
        <Button icon="fas fa-plus" label="Add attribute" size="small" @click="onAddAttribute" />
      </div>
    </div>

    <div class="min-h-0">
      <DataTable
        :value="user.attributes"
        edit-mode="cell"
        scrollable
        scroll-height="flex"
        striped-rows
        @cell-edit-complete="({ data, field, newValue }) => onAttributeUpdate(data, field as keyof UserAttributeDTO, newValue)"
        >
        <Column field="kind" header="Kind">
          <template #editor="{data}">
            <Select :options="['Cookie', 'Header']" v-model="data.kind" />
          </template>
        </Column>

        <Column field="name" header="Name">
          <template #editor="{data}">
            <InputText v-model="data.name" />
          </template>
        </Column>

        <Column field="value" header="Value" >
          <template #editor="{data}">
            <InputText v-model="data.value" />
          </template>
        </Column>

        <Column header="">
          <template #body="{ data }">
            <div class="flex justify-end">
              <Button severity="danger" text size="small" icon="fas fa-trash" @click="() => onRemoveAttribute(data)" />
            </div>
          </template>
        </Column>

        <template #empty>
          <div class="flex flex-col items-center justify-center my-8">
            <p class="text-gray-400">No attributes configured. </p>
            <p class="text-gray-400">Add attributes to include in requests for this user.</p>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
