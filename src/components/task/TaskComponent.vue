<script setup lang="ts">
import axios from "axios";
import { Result } from "postcss";
import { ref, watch } from "vue";
import { nonThrowableServerRequest } from "../../lib/helpers";

const props = defineProps<{
  task: {
    id: string;
    title: string;
    isComplete: boolean;
  };
}>();

const emit = defineEmits<{
  (event: "taskDeleted", taskId: string): void;
  (
    event: "taskUpdated",
    task: { id: string; title: string; isComplete: boolean }
  ): void;
  (event: "error", errors: string[]): void;
}>();

const clickCount = ref(0);
const currentlyEditing = ref(false);
const newTaskTitle = ref(props.task.title);

watch(clickCount, async (newClickCount) => {
  if (newClickCount >= 2) {
    clickCount.value = 0;

    const { errors } = await nonThrowableServerRequest(() =>
      axios.delete<void>(`/task/${props.task.id}`)
    );

    if (errors) {
      return emit("error", errors);
    }

    return emit("taskDeleted", props.task.id);
  }
});

watch(currentlyEditing, (currentlyEditing) => {
  if (!currentlyEditing) {
    newTaskTitle.value = props.task.title;
  }
});

watch(
  () => props.task.title,
  (newTitle) => {
    newTaskTitle.value = newTitle;
  }
);

async function updateTaskStatus() {
  const { result: updateResult, errors } = await nonThrowableServerRequest(() =>
    axios.patch<{
      _id: string;
      title: string;
      isComplete: boolean;
    }>(`/task/${props.task.id}`, { isComplete: !props.task.isComplete })
  );

  if (errors) {
    return emit("error", errors);
  }

  return emit("taskUpdated", {
    id: updateResult._id,
    title: updateResult.title,
    isComplete: updateResult.isComplete,
  });
}

async function updateTaskTitle() {
  const { result: updateResult, errors } = await nonThrowableServerRequest(() =>
    axios.patch<{
      _id: string;
      title: string;
      isComplete: boolean;
    }>(`/task/${props.task.id}`, { title: newTaskTitle.value })
  );

  if (errors) {
    return emit("error", errors);
  }

  currentlyEditing.value = false;

  return emit("taskUpdated", {
    id: updateResult._id,
    title: updateResult.title,
    isComplete: updateResult.isComplete,
  });
}
</script>

<template>
  <article>
    <button
      v-if="!currentlyEditing"
      type="button"
      @click="updateTaskStatus"
      data-test="toggle-check-button"
    >
      {{ task.isComplete }}
    </button>

    <input
      v-if="currentlyEditing"
      type="text"
      v-model="newTaskTitle"
      required
      data-test="task-edit-input"
    />
    <p
      v-else
      :class="[task.isComplete ? 'line-through text-gray-400' : '']"
      data-test="task-title"
    >
      {{ task.title }}
    </p>

    <template v-if="currentlyEditing">
      <button
        type="button"
        @click="updateTaskTitle"
        data-test="update-task-button"
      >
        update
      </button>
      <button
        type="button"
        @click="currentlyEditing = false"
        data-test="cancel-task-update-button"
      >
        cancel
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        @click="currentlyEditing = true"
        data-test="edit-task-button"
      >
        edit
      </button>
      <button
        type="button"
        tabindex="0"
        @focusout="clickCount = 0"
        @click="clickCount += 1"
        data-test="delete-task-button"
      >
        delete
      </button>
    </template>
  </article>
</template>
