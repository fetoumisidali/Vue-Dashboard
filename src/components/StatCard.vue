<script setup>
const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    required: true,
  },
});
</script>

<template>
  <div class="bg-white rounded-lg border border-gray-200 p-4">
    <div class="flex items-center gap-2 mb-2">
      <slot name="icon" />
      <span class="text-gray-600 text-sm">{{ label }}</span>
    </div>
    <p class="text-2xl font-bold text-gray-900">{{ value }}</p>
  </div>
</template>
