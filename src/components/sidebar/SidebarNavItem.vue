<template>
    <router-link :to="{ name: item.name }" class="flex items-center gap-2 px-3 py-2 transition-colors duration-200"
        exact-active-class="bg-white text-gray-800 font-semibold" :class="{ 'hover:bg-gray-700': !isActive }">
        <component :is="item.icon" class="w-5 h-5" v-if="item.icon" />
        <span :class="{ 'hidden': isCollapsed }">{{ item.label }}</span>
    </router-link>
</template>

<script setup>

import { useLink } from 'vue-router';

const props = defineProps({
    item: {
        type: Object,
        required: true
    },
    isCollapsed: Boolean,
});

const { isActive, isExactActive } = useLink({
    to: { name: props.item.name }
});
</script>