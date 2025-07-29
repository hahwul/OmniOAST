<script setup lang="ts">
import { useOastStore } from '@/stores/oastStore';

const oastStore = useOastStore();

const addTab = () => {
  oastStore.addTab();
};

const removeTab = (tabId: string) => {
  oastStore.removeTab(tabId);
};

const setActiveTab = (tabId: string) => {
  oastStore.setActiveTab(tabId);
};
</script>

<template>
  <div class="oast-tabs-container">
    <div class="tabs-list">
      <div
        v-for="tab in oastStore.tabs"
        :key="tab.id"
        class="tab-item"
        :class="{ 'active-tab': oastStore.activeTabId === tab.id }"
        @click="setActiveTab(tab.id)"
      >
        <span>{{ tab.name }}</span>
        <button class="close-tab-btn" @click.stop="removeTab(tab.id)">x</button>
      </div>
    </div>
    <button class="add-tab-btn" @click="addTab">+</button>
  </div>
</template>

<style scoped>
.oast-tabs-container {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #ccc;
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
  border-right: 1px solid #ccc;
  position: relative;
}

.tab-item:hover {
  background-color: #f0f0f0;
}

.active-tab {
  background-color: #e0e0e0;
  font-weight: bold;
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
  background-color: #d0d0d0;
}

.add-tab-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  padding: 4px 8px;
}
</style>
