<template>
    <aside :class="['sidebar', isCollapsed ? 'w-20' : 'w-64']">
        <div :class="[
            'flex-between p-4 text-2xl font-bold border-b border-gray-700',
            isCollapsed && 'justify-center']">
            <span :class="{ 'hidden': isCollapsed }">Dashboard</span>
            <button @click="toggleSidebar">
                <PanelLeftClose v-if="!isCollapsed" class="hover:text-gray-500" />
                <PanelRightClose v-else class="hover:text-gray-500" />
            </button>
        </div>
        <nav class="flex-1 p-4 space-y-2">
            <SidebarBarNavItm :isCollapsed="isCollapsed" v-for="item in navItems" :key="item.name" :item="item" />
        </nav>
    </aside>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

import { LayoutGrid, PanelLeftClose, PanelRightClose, ShoppingCart, TicketCheck } from 'lucide-vue-next';
import SidebarBarNavItm from './SidebarNavItem.vue';

const navItems = [
    { name: 'home', label: 'Dashboard', icon: LayoutGrid },
    { name: 'products', label: 'Products', icon: ShoppingCart },
    { name: 'orders', label: 'Orders', icon: TicketCheck },
];

const isCollapsed = ref(localStorage.getItem('sidebar-collapsed') === 'true');

const toggleSidebar = () => {
    isCollapsed.value = !isCollapsed.value;
};

onMounted(() => {
  const savedState = localStorage.getItem('sidebar-collapsed');
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true';
  }
});


// Watch for changes and save to localStorage
watch(isCollapsed, (newValue) => {
    localStorage.setItem('sidebar-collapsed', newValue.toString());
}, { immediate: true });


</script>