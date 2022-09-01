<script setup lang="ts">
import { RouterLink, RouterView } from "vue-router";
</script>

<template>
  <header>
    <nav>
      <RouterLink :to="{ name: 'register' }">Register</RouterLink>
      <RouterLink :to="{ name: 'login' }">Login</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>
