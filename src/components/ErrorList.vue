<script setup lang="ts">
defineProps<{ errors: string[] }>();
</script>

<template>
  <ul class="flex flex-col px-2 py-1 border-2 border-red-600 bg-red-50 rounded">
    <li v-for="error in errors" :key="error" class="text-sm text-red-500">
      {{ error }}
    </li>
  </ul>
</template>
