<script setup lang="ts">
import axios from "axios";
import { ref } from "vue";
import { nonThrowableServerRequest } from "../../lib/helpers";

const emit = defineEmits<{
  (
    event: "taskCreated",
    task: { id: string; title: string; isComplete: boolean }
  ): void;
  (event: "error", errors: string[]): void;
}>();

const newTaskTitle = ref("");

async function createTask() {
  const { result: newTask, errors } = await nonThrowableServerRequest(() =>
    axios.post<{
      _id: string;
      title: string;
      isComplete: boolean;
    }>("/task", { title: newTaskTitle.value })
  );

  if (errors) {
    return emit("error", errors);
  }

  newTaskTitle.value = "";

  return emit("taskCreated", {
    id: newTask._id,
    title: newTask.title,
    isComplete: newTask.isComplete,
  });
}
</script>

<template>
  <form @submit.prevent="createTask" data-test="create-task-form">
    <input
      type="text"
      v-model="newTaskTitle"
      data-test="create-task-input"
      required
    />
    <button type="submit" data-test="create-task-button">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 4.5v15m7.5-7.5h-15"
        />
      </svg>
    </button>
  </form>
</template>
