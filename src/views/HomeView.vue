<script setup lang="ts">
import NewStatCard from '@/components/NewStatCard.vue';
import { AlertTriangle, Box, DollarSign, ShoppingCart } from 'lucide-vue-next';

</script>

<template>
    <section class="space-y-6">
        <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <NewStatCard :icon="ShoppingCart" title="Today Orders" value="120" accentColor="bg-red-500"
                iconBg="bg-red-500" />
            <NewStatCard :icon="Box" title="Products" value="120" accentColor="bg-blue-500" iconBg="bg-blue-500" />
            <NewStatCard :icon="AlertTriangle" title="Low Stock" value="0" accentColor="bg-amber-700"
                iconBg="bg-amber-700" />
            <NewStatCard :icon="DollarSign" title="Sales" value="1000" accentColor="bg-green-500"
                iconBg="bg-green-500" />
        </div>
        <div class="p-4 bg-red-500 h-36 shadow"></div>
        <div class="p-4 bg-green-500 h-36 shadow"></div>
        <div class="p-4 bg-blue-500 h-36 shadow"></div>
    </section>
</template>