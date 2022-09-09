import { flushPromises, mount, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import HomeView from "./HomeView.vue";
import type CreateTask from "../components/task/CreateTask.vue";
import type TaskComponent from "../components/task/TaskComponent.vue";

describe("HomeView", () => {
  const tasks = [
    { _id: "task#0", title: "The task title #0", isComplete: false },
    { _id: "task#1", title: "The task title #1", isComplete: true },
    { _id: "task#2", title: "The task title #2", isComplete: false },
    { _id: "task#3", title: "The task title #3", isComplete: true },
  ];

  const server = setupServer(
    rest.get("/tasks", (_, response, context) =>
      response(context.status(200), context.json(tasks))
    )
  );

  beforeAll(() => {
    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  describe("View tasks", () => {
    it("displays a user's tasks", async () => {
      const wrapper = mount(HomeView);

      await flushPromises();

      expect(wrapper.find('[data-test="tasks-crud-errors"]').exists()).toBe(
        false
      );

      expect(wrapper.find('[data-test="tasks-list"]').exists()).toBe(true);

      tasks.forEach(({ title }) =>
        expect(wrapper.get('[data-test="tasks-list"]').text()).toContain(title)
      );
    });

    it("displays an error message if the user's tasks could not be fetched", async () => {
      const errorMessage = "An error occured";

      server.use(
        rest.get("/tasks", (_, response, context) =>
          response(context.status(400), context.json({ message: errorMessage }))
        )
      );

      const wrapper = shallowMount(HomeView);

      await flushPromises();

      expect(wrapper.find('[data-test="tasks-list"]').exists()).toBe(false);

      expect(wrapper.find('[data-test="tasks-crud-errors"]').exists()).toBe(
        true
      );
      expect(wrapper.find('[data-test="tasks-crud-errors"]').text()).toContain(
        errorMessage
      );
    });
  });

  describe("Create task", () => {
    it("creates a task and adds it to the user's task-list", async () => {
      const newTask = {
        id: "task#999",
        title: "New task title",
        isComplete: false,
      };

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof CreateTask>('[data-test="create-task-component"]')
        .vm.$emit("taskCreated", newTask);

      await nextTick();

      expect(wrapper.get('[data-test="tasks-list"]').text()).toContain(
        newTask.title
      );
    });

    it("displays any emitted errors", async () => {
      const errorMessages = ["An error occured."];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof CreateTask>('[data-test="create-task-component"]')
        .vm.$emit("error", errorMessages);

      await nextTick();

      errorMessages.forEach((errorMessage) =>
        expect(
          wrapper.find('[data-test="tasks-crud-errors"]').text()
        ).toContain(errorMessage)
      );
    });
  });

  describe("Update task", () => {
    it("marks a task as complete", async () => {
      const taskToMarkAsComplete = tasks[0];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToMarkAsComplete._id}"]`
        )
        .vm.$emit("taskUpdated", {
          id: taskToMarkAsComplete._id,
          title: taskToMarkAsComplete.title,
          isComplete: true,
        });

      await nextTick();

      expect(
        wrapper
          .get(
            `[data-test="task-id-${taskToMarkAsComplete._id}"] [data-test="task-title"]`
          )
          .classes()
      ).toContain("line-through");
    });

    it("updates a task's title", async () => {
      const taskToUpdate = tasks[0];
      const newTitle = "The new title of the task";

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToUpdate._id}"]`
        )
        .vm.$emit("taskUpdated", {
          id: taskToUpdate._id,
          title: newTitle,
          isComplete: taskToUpdate.isComplete,
        });

      await nextTick();

      expect(
        wrapper
          .get(
            `[data-test="task-id-${taskToUpdate._id}"] [data-test="task-title"]`
          )
          .text()
      ).toContain(newTitle);
    });

    it("marks a task as incomplete", async () => {
      const taskToMarkAsIncomplete = tasks[1];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToMarkAsIncomplete._id}"]`
        )
        .vm.$emit("taskUpdated", {
          id: taskToMarkAsIncomplete._id,
          title: taskToMarkAsIncomplete.title,
          isComplete: false,
        });

      await nextTick();

      expect(
        wrapper
          .get(
            `[data-test="task-id-${taskToMarkAsIncomplete._id}"] [data-test="task-title"]`
          )
          .classes()
      ).not.toContain("line-through");
    });

    it("displays any emitted errors", async () => {
      const taskToToggleCompletionOf = tasks[1];
      const errorMessages = ["An error occured."];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToToggleCompletionOf._id}"]`
        )
        .vm.$emit("error", errorMessages);

      await nextTick();

      errorMessages.forEach((errorMessage) =>
        expect(
          wrapper.find('[data-test="tasks-crud-errors"]').text()
        ).toContain(errorMessage)
      );
    });
  });

  describe("Delete task", () => {
    it("deletes a task", async () => {
      const taskToDelete = tasks[1];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToDelete._id}"]`
        )
        .vm.$emit("taskDeleted", taskToDelete._id);

      await nextTick();

      expect(
        wrapper.find(`[data-test="task-id-${taskToDelete._id}"]`).exists()
      ).toBe(false);
    });

    it("displays any emitted errors", async () => {
      const taskToDelete = tasks[0];
      const errorMessages = ["An error occured."];

      const wrapper = mount(HomeView, {
        global: {
          stubs: {
            CreateTask: true,
          },
        },
      });

      await flushPromises();

      wrapper
        .findComponent<typeof TaskComponent>(
          `[data-test="task-id-${taskToDelete._id}"]`
        )
        .vm.$emit("error", errorMessages);

      await nextTick();

      errorMessages.forEach((errorMessage) =>
        expect(
          wrapper.find('[data-test="tasks-crud-errors"]').text()
        ).toContain(errorMessage)
      );
    });
  });
});
