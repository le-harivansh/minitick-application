<script setup lang="ts">
import axios from "axios";
import { onMounted, reactive } from "vue";
import { nonThrowableServerRequest } from "../lib/helpers";
import TaskComponent from "../components/task/TaskComponent.vue";
import CreateTask from "../components/task/CreateTask.vue";
import ErrorList from "../components/ErrorList.vue";

const tasks = reactive<{ id: string; title: string; isComplete: boolean }[]>(
  []
);
const errors: string[] = reactive([]);

onMounted(async () => {
  const { result: tasksQueryResult, errors: tasksQueryErrors } =
    await nonThrowableServerRequest(() =>
      axios.get<{ _id: string; title: string; isComplete: boolean }[]>("/tasks")
    );

  if (tasksQueryErrors) {
    return errors.push(...tasksQueryErrors);
  }

  tasksQueryResult.forEach(({ _id: id, title, isComplete }) =>
    tasks.push({ id, title, isComplete })
  );
});

function setErrors(errorMessages: string[]) {
  errors.splice(0, errors.length);

  errors.push(...errorMessages);
}

function updateTask(task: { id: string; title: string; isComplete: boolean }) {
  const indexOfTaskToUpdate = tasks.findIndex(({ id }) => id === task.id);

  if (indexOfTaskToUpdate !== -1) {
    tasks[indexOfTaskToUpdate].title = task.title;
    tasks[indexOfTaskToUpdate].isComplete = task.isComplete;
  }
}

function removeTask(taskId: string) {
  const indexOfTaskToDelete = tasks.findIndex(({ id }) => id === taskId);

  if (indexOfTaskToDelete !== -1) {
    tasks.splice(indexOfTaskToDelete, 1);
  }
}
</script>

<template>
  <main class="flex flex-col">
    <h2 class="my-4 font-heading text-4xl text-center font-semibold">Tasks</h2>

    <ErrorList
      v-show="errors.length"
      :errors="errors"
      class="my-2"
      data-test="tasks-crud-errors"
    />

    <CreateTask
      class="my-4"
      @task-created="(newTask) => tasks.push(newTask)"
      @error="setErrors"
      data-test="create-task-component"
    />

    <ul
      v-if="tasks.length"
      data-test="tasks-list"
      class="flex flex-col space-y-2"
    >
      <li v-for="task in tasks" :key="task.id">
        <TaskComponent
          :task="task"
          @task-deleted="removeTask"
          @task-updated="updateTask"
          @error="setErrors"
          :data-test="`task-id-${task.id}`"
        />
      </li>
    </ul>

    <h4
      v-else
      class="mt-8 text-xl text-center text-slate-400 uppercase tracking-wide"
    >
      You don't have any tasks.
    </h4>
  </main>
</template>
