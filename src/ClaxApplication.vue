<script setup lang="ts">
import { RouterView } from "vue-router";
import MainNavigation from "@/components/MainNavigation.vue";
</script>

<template>
  <div
    class="flex-1 max-w-sm h-full p-2 font-body bg-slate-100 shadow-lg sm:rounded-lg"
  >
    <header class="mb-2">
      <MainNavigation />
    </header>

    <RouterView />
  </div>
</template>
