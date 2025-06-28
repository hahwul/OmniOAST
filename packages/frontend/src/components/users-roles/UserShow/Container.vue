<script setup lang="ts">
import { useUserService } from "@/services/users";
import { useCloned } from "@vueuse/core";
import Card from "primevue/card";
import Divider from "primevue/divider";
import InputText from "primevue/inputtext";
import type { UserDTO } from "shared";
import { toRefs, watch } from "vue";
import AttributeTable from "./AttributeTable.vue";
const props = defineProps<{
  user: UserDTO;
}>();

const { user } = toRefs(props);
const { cloned, sync } = useCloned(user);

const service = useUserService();
const onFocusOut = () => {
  service.updateUser(props.user.id, cloned.value);
};

watch(user, () => {
  sync();
});
</script>

<template>
  <Card class="h-full" :pt="{ body: { class: 'h-full' }, content: { class: 'flex-1 min-h-0' } } ">
    <template #title>
      <div class="flex justify-between items-center p-4">
        <h1 class="font-bold text-xl m-0">{{ user?.name }}</h1>
      </div>
    </template>

    <template #content>
      <div class="flex flex-col h-full min-h-0">
        <div class="flex flex-col gap-2 p-4">
          <label for="name" class="text-sm">Name</label>
          <InputText id="name" label="Name" v-model="cloned.name" autocomplete="off" @focusout="onFocusOut"/>
        </div>

        <Divider />

        <AttributeTable :user="cloned" />
      </div>
    </template>
  </Card>
</template>
