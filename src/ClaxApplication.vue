<script setup lang="ts">
import { RouterView } from "vue-router";
import MainNavigation from "@/components/MainNavigation.vue";
</script>

<template>
  <div class="w-full h-full bg-slate-100 p-2 font-body">
    <header class="mb-2">
      <MainNavigation />
    </header>

    <RouterView />
  </div>
</template>
