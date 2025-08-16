<script setup lang="ts">
import { useConfirm } from "primevue/useconfirm";
import { nextTick, ref } from "vue";

import { useOastStore } from "@/stores/oastStore";

const oastStore = useOastStore();
const editingTabId = ref<string | null>(null);
const editingName = ref("");
const confirm = useConfirm();

const addTab = () => {
  oastStore.addTab();
};

const removeTab = (tabId: string) => {
  confirm.require({
    message: "Are you sure you want to delete this tab?",
    header: "Delete Tab",
    icon: "pi pi-exclamation-triangle",
    accept: () => {
      oastStore.removeTab(tabId);
    },
  });
};

const setActiveTab = (tabId: string) => {
  oastStore.setActiveTab(tabId);
};

const startEditing = (tab: any) => {
  editingTabId.value = tab.id;
  editingName.value = tab.name;
  nextTick(() => {
    const input = document.getElementById(`tab-input-${tab.id}`);
    input?.focus();
  });
};

const finishEditing = (tabId: string) => {
  if (editingName.value.trim() === "") return;
  oastStore.updateTabName(tabId, editingName.value);
  editingTabId.value = null;
};
</script>

<template>
  <div class="oast-tabs-container bg-surface-0 dark:bg-surface-800 rounded">
    <div class="tabs-list gap-1">
      <div
        v-for="tab in oastStore.tabs"
        :key="tab.id"
        class="tab-item px-2 py-1 my-1 border border-surface-700 rounded-md bg-surface-0 dark:bg-surface-800"
        :class="{
          'active-tab bg-surface-0 dark:bg-surface-950':
            oastStore.activeTabId === tab.id,
        }"
        @click="setActiveTab(tab.id)"
        @dblclick="startEditing(tab)"
      >
        <span v-if="editingTabId !== tab.id">{{ tab.name }}</span>
        <input
          v-else
          :id="`tab-input-${tab.id}`"
          v-model="editingName"
          type="text"
          class="tab-input"
          @blur="finishEditing(tab.id)"
          @keyup.enter="finishEditing(tab.id)"
          @keyup.esc="editingTabId = null"
        />
        <button class="close-tab-btn ml-8" @click.stop="removeTab(tab.id)">
          x
        </button>
      </div>
    </div>
    <button class="add-tab-btn" @click="addTab">+</button>
  </div>
</template>

<style scoped>
.oast-tabs-container {
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.tabs-list {
  display: flex;
  flex-grow: 1;
  overflow-x: auto;
}

.tab-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  position: relative;
}

.tab-item:hover {
  background-color: var(--surface-hover);
}

.active-tab {
  background-color: var(--surface-100);
  font-weight: bold;
}

.dark .active-tab {
  background-color: var(--surface-700);
}

.tab-input {
  border: 1px solid var(--surface-300);
  background-color: var(--surface-0);
  color: var(--text-color);
  padding: 2px 4px;
  width: 80px;
}

.dark .tab-input {
  border-color: var(--surface-700);
  background-color: var(--surface-900);
}

.close-tab-btn {
  margin-left: 8px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  border-radius: 50%;
}

.close-tab-btn:hover {
  background-color: var(--surface-hover);
}

.add-tab-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 4px 8px;
}
</style>
