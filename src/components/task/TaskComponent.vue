<script setup lang="ts">
import axios from "axios";
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

const deleteButtonClickCount = ref(0);
const currentlyEditing = ref(false);
const newTaskTitle = ref(props.task.title);

watch(deleteButtonClickCount, async (newClickCount) => {
  if (newClickCount >= 2) {
    deleteButtonClickCount.value = 0;

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
  <article
    class="p-1 group flex items-center space-x-1 border-2 border-slate-200 hover:border-slate-300 rounded"
    :class="[
      currentlyEditing ? 'border-amber-200 hover:border-amber-300' : '',
      deleteButtonClickCount > 0 ? 'border-red-300 hover:border-red-400' : '',
    ]"
  >
    <button
      v-if="!currentlyEditing"
      type="button"
      @click="updateTaskStatus"
      data-test="toggle-check-button"
    >
      <svg
        v-if="task.isComplete"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6 text-green-400 group-hover:text-green-500"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M4.5 12.75l6 6 9-13.5"
        />
      </svg>
      <svg
        v-else
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        stroke-width="1.5"
        stroke="currentColor"
        class="w-6 h-6 text-slate-400 group-hover:text-slate-500"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"
        />
      </svg>
    </button>

    <div class="flex-1">
      <input
        v-if="currentlyEditing"
        type="text"
        class="w-full bg-transparent focus:outline-none"
        v-model="newTaskTitle"
        required
        data-test="task-edit-input"
      />
      <p
        v-else
        class="overflow-hidden"
        :class="[task.isComplete ? 'line-through text-gray-400' : '']"
        data-test="task-title"
      >
        {{ task.title }}
      </p>
    </div>

    <template v-if="currentlyEditing">
      <button
        type="button"
        @click="updateTaskTitle"
        :disabled="task.title === newTaskTitle"
        data-test="update-task-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
          :class="[
            task.title !== newTaskTitle
              ? 'text-green-300 group-hover:text-green-400'
              : 'text-slate-300 group-hover:text-slate-400',
          ]"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </button>
      <button
        type="button"
        @click="currentlyEditing = false"
        data-test="cancel-task-update-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5 text-red-400 group-hover:text-red-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </template>
    <template v-else>
      <button
        type="button"
        @click="currentlyEditing = true"
        data-test="edit-task-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5 text-amber-200 group-hover:text-amber-500"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
          />
        </svg>
      </button>
      <button
        type="button"
        tabindex="0"
        @focusout="deleteButtonClickCount = 0"
        @click="deleteButtonClickCount += 1"
        data-test="delete-task-button"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke-width="1.5"
          stroke="currentColor"
          class="w-5 h-5"
          :class="[
            deleteButtonClickCount
              ? 'text-red-500'
              : 'text-red-300 group-hover:text-red-400',
          ]"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
          />
        </svg>
      </button>
    </template>
  </article>
</template>
