<script setup lang="ts">
import StatCard from '@/components/StatCard.vue';
import Table from '@/components/table/Table.vue';
import { Box, ShoppingBasket } from 'lucide-vue-next';

</script>

<template>
    <section class="space-y-4">
        <div class="flex-between">
            <h2 class="text-lg font-medium">Products</h2>
            <router-link :to="{ 'name': 'create-product' }"
                class="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">Add Product</router-link>
        </div>
        <div class="grid grid-cols-4 gap-4">
            <StatCard label="Total Products" :value="12">
                <template #icon>
                    <Box class="w-5 h-5 text-blue-600" />
                </template>
            </StatCard>
        </div>
        <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div class="overflow-hidden">
                <Table />
            </div>
        </div>
    </section>
</template>