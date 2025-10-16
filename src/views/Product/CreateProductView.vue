<template>
    <section class="space-y-4">
        <router-link :to="{ 'name': 'products' }" class="flex items-center gap-2 text-gray-600 hover:text-gray-900 ">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Products
        </router-link>


        <div class="w-fit text-sm font-medium text-center text-gray-500 border-b border-gray-200">
            <ul class="flex flex-wrap space-x-2 -mb-px">
                <li class="me">
                    <button @click="mode = 'single'" :class="[
                        'inline-block p-4 border-b-2 rounded-t-lg',
                        mode === 'single'
                            ? 'text-blue-600 border-blue-600 active'
                            : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    ]">Single</button>
                </li>
                <li>
                    <button @click="mode = 'bulk'" href="#" :class="[
                        'inline-block p-4 border-b-2 rounded-t-lg',
                        mode === 'bulk'
                            ? 'text-blue-600 border-blue-600 active'
                            : 'border-transparent hover:text-gray-600 hover:border-gray-300'
                    ]">Bulk</button>
                </li>
            </ul>
        </div>

        <h1 class="text-3xl text-center md:text-left">{{ mode === 'single' ? 'Create New Product'
            : 'Create Bulk Products' }}</h1>


        <div v-if="mode === 'single'" class="md:w-2/3 w-full bg-white p-6 space-y-8 rounded-lg border border-gray-200">
            <div class="grid grid-col-1 md:grid-cols-2 gap-4 space-y-8">

                <form-input label="Test Name" placeholder="You Need To Enter Something" required />
                <form-input label="Price" placeholder="0.00" type="number" step="0.01" min="0" required />
                <form-input label="CODE" placeholder="Product CODE" />
                <form-input label="Category" placeholder="Category" required />
                <form-input label="Stock" placeholder="0" type="number" step="1" min="0" />
            </div>
            <div class="flex gap-4 justify-end">
                <button
                    class="px-4 py-2 bg-white border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white">
                    Cancel
                </button>
                <button class="px-4  rounded-lg  py-2 bg-gray-900 text-white hover:bg-gray-800">
                    Create Product
                </button>
            </div>
        </div>

        <div v-if="mode === 'bulk'" class="w-full bg-white p-6 rounded-sm border border-gray-200 ">
            <form action="">
                <div class="grid grid-cols-5 gap-2">

                    <form-input label="Test Name" placeholder="You Need To Enter Something" required />
                    <form-input label="Price" placeholder="0.00" type="number" step="0.01" min="0" required />
                    <form-input label="CODE" placeholder="Product CODE" />
                    <form-input label="Category" placeholder="Category" required />
                    <form-input label="Stock" placeholder="0" type="number" step="1" min="0" />
                    
                </div>

            </form>
        </div>
    </section>
</template>
<script setup>

import FormInput from '@/components/FormInput.vue';


import { ref } from 'vue';

const mode = ref('single');


</script>