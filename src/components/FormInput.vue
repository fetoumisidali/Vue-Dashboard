<template>
    <div>
        <label class="block text-sm font-medium text-gray-700 mb-2">{{ label }}<span v-if="required"
                class="text-red-500">*</span></label>
        <input :type="type" :required="required" :placeholder="placeholder"
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500">
    </div>
</template>

<script setup>

defineProps({
    label: {
        type: String,
        required: true
    },
    placeholder: {
        type: String,
        default: ''
    },
    required: {
        type: Boolean,
        default: false
    },
    type: {
        type: String,
        default: 'text'
    },
})

</script>