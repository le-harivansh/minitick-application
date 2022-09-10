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

const isFocused = ref(false);
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
  <form
    @submit.prevent="createTask"
    class="flex items-center p-1 border-2 rounded-md"
    :class="[isFocused ? 'border-sky-400' : 'border-slate-300']"
    data-test="create-task-form"
  >
    <input
      type="text"
      class="flex-1 focus:outline-none bg-transparent"
      v-model="newTaskTitle"
      required
      @focusin="isFocused = true"
      @focusout="isFocused = false"
      data-test="create-task-input"
    />
    <button
      type="submit"
      class="p-1 bg-green-500 text-white rounded-lg hover:shadow-md"
      data-test="create-task-button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-5 h-5"
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
