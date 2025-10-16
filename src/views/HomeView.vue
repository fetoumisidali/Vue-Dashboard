<script setup lang="ts">
import StatCard from '@/components/StatCard.vue';
import { Box, ShoppingBag, Tag, UsersRound } from 'lucide-vue-next';

</script>

<template>
    <section class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard label="Total Products" :value="12">
                <template #icon>
                    <Box class="w-5 h-5 text-blue-600" />
                </template>
            </StatCard>
           <StatCard label="Total Orders" :value="6">
                <template #icon>
                    <ShoppingBag class="w-5 h-5 text-red-600" />
                </template>
            </StatCard>
            <StatCard label="Total Categories" :value="100">
                <template #icon>
                    <Tag class="w-5 h-5 text-pink-600" />
                </template>
            </StatCard>
            
            <StatCard label="Total Categories" :value="100">
                <template #icon>
                    <UsersRound class="w-5 h-5 text-green-600" />
                </template>
            </StatCard>
        </div>
        <div class="p-4 bg-red-500 h-36 shadow"></div>
        <div class="p-4 bg-green-500 h-36 shadow"></div>
        <div class="p-4 bg-blue-500 h-36 shadow"></div>
    </section>
</template>