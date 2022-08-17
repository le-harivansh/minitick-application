<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'register' }">Register</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>
