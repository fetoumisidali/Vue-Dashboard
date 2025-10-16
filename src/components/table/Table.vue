<script setup>
import TableHeader from './TableHeader.vue';
</script>

<template>
  <table class="w-full">
    <thead class="bg-gray-50 border-b border-gray-200">
      <tr>
        <table-header label="title" />
        <table-header label="title" />
        <table-header label="title" />
        <table-header label="title" />
      </tr>
    </thead>
    <tbody class="divide-y divide-gray-200">
      <tr>
        <td class="px-6 py-4 text-gray-900">Data</td>
        <td class="px-6 py-4 text-gray-900">Data</td>
        <td class="px-6 py-4 text-gray-900">Data</td>
        <td class="px-6 py-4 text-gray-900">Data</td>
      </tr>

    </tbody>
  </table>
</template>