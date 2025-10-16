<script setup lang="ts">
import Sidebar from '@/components/sidebar/Sidebar.vue';

</script>

<template>
    <div class="flex h-screen overflow-hidden bg-gray-100">
        <Sidebar />
        <div class="flex-1 flex flex-col">
            <header class="flex items-center justify-between p-4 bg-white shadow">
                <h1 class="text-xl">My App</h1>
                <div class="text-white text-lg font-semibold
                 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    SF
                </div>
            </header>
            <main class="flex-1 p-4 overflow-y-auto">
                <RouterView />
            </main>
        </div>
    </div>
</template>