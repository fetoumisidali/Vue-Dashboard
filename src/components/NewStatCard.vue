<!-- Card.vue -->
<script setup>
import { defineProps } from 'vue'

const props = defineProps({
    icon: {
        type: [Object, Function],
        required: true
    },
    title: {
        type: String,
        required: true
    },
    value: {
        type: [String, Number],
        required: true
    },
    accentColor: {
        type: String,
        default: 'bg-blue-500'
    },
    iconBg: {
        type: String,
        default: 'bg-blue-500'
    }
})
</script>

<template>
    <div class="bg-white rounded-r-lg shadow-sm border border-gray-200 overflow-hidden">
        <div class="flex">
            <!-- Left accent bar -->
            <div :class="['w-1', accentColor]"></div>

            <!-- Card content -->
            <div class="flex-1 p-6">
                <div class="flex items-center gap-3">
                    <!-- Icon badge -->
                    <div :class="['flex items-center justify-center w-10 h-10 rounded-full', iconBg]">
                        <component :is="icon" class="w-5 h-5 text-white" />
                    </div>

                    <!-- Title -->
                    <span class="text-gray-400 text-sm font-medium uppercase tracking-wide">
                        {{ title }}
                    </span>
                </div>

                <!-- Value -->
                <div class="mt-4">
                    <span class="text-3xl font-semibold text-gray-800">
                        {{ value }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
