<script setup lang="ts">
import axios from "axios";
import { onMounted, reactive } from "vue";
import { nonThrowableServerRequest } from "../lib/helpers";
import TaskComponent from "../components/task/TaskComponent.vue";
import CreateTask from "../components/task/CreateTask.vue";

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

  tasksQueryResult.forEach(({ _id, title, isComplete }) =>
    tasks.push({ id: _id, title, isComplete })
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
  <main>
    <h2>Tasks</h2>

    <ul v-if="errors.length" data-test="tasks-crud-errors">
      <li v-for="error in errors" :key="error">{{ error }}</li>
    </ul>

    <CreateTask
      @task-created="(newTask) => tasks.push(newTask)"
      @error="setErrors"
      data-test="create-task-component"
    />

    <ul v-if="tasks.length" data-test="tasks-list">
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

    <h4 v-else>You don't have any tasks.</h4>
  </main>
</template>
