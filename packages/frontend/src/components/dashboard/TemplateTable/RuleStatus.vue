<script setup lang="ts">
import Chip from "primevue/chip";
import type { RuleStatusDTO } from "shared";

defineProps<{
  status: RuleStatusDTO;
}>();
</script>

<template>
  <Chip
    v-if="status === 'Unexpected'"
    v-tooltip="'This access control rules on this resource are not as expected'"
    class="status unexpected-status">
    <i class="fas fa-exclamation-triangle" />
    <span>Unexpected</span>
  </Chip>
  <Chip
    v-else-if="status === 'Enforced'"
    v-tooltip="'This access control rules on this resource are properly enforced'"
    class="status enforced-status">
    <i class="fas fa-check" />
    <span>Enforced</span>
  </Chip>
  <Chip
    v-else-if="status === 'Bypassed'"
    v-tooltip="'This access control rules on this resource have been bypassed'"
    class="status bypassed-status">
    <i class="fas fa-x" />
    <span>Bypassed</span>
  </Chip>
</template>
