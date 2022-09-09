import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { nextTick } from "vue";
import TaskComponent from "./TaskComponent.vue";

describe(TaskComponent.name, () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  describe("render", () => {
    it("renders the component properly", () => {
      const task = {
        _id: "task-id",
        title: "Hello, world!",
        isComplete: false,
      };

      const wrapper = shallowMount(TaskComponent, {
        props: {
          task: {
            id: task._id,
            title: task.title,
            isComplete: task.isComplete,
          },
        },
      });

      expect(wrapper.text()).toContain(task.title);
    });

    it("adds the 'line-through' class to a completed todo's title", () => {
      const wrapper = shallowMount(TaskComponent, {
        props: {
          task: {
            id: "task-id",
            title: "A task",
            isComplete: true,
          },
        },
      });

      expect(wrapper.get<HTMLElement>("article p").classes()).toContain(
        "line-through"
      );
    });
  });

  describe("update task", () => {
    afterEach(() => {
      server.resetHandlers();
    });

    describe("status (isComplete)", () => {
      it.each<{ initialIsComplete: boolean }>([
        { initialIsComplete: true },
        { initialIsComplete: false },
      ])(
        "emits `taskUpdated` with the updated task's status when the task's check button is clicked",
        async ({ initialIsComplete }) => {
          const taskData = {
            id: "task_001",
            title: "Task title",
          };

          server.use(
            rest.patch(`/task/${taskData.id}`, (_, response, context) =>
              response(
                context.status(200),
                context.json({
                  _id: taskData.id,
                  title: taskData.title,
                  isComplete: !initialIsComplete,
                })
              )
            )
          );

          const wrapper = shallowMount(TaskComponent, {
            props: {
              task: {
                ...taskData,
                isComplete: initialIsComplete,
              },
            },
          });

          await wrapper
            .get('[data-test="toggle-check-button"]')
            .trigger("click");

          await flushPromises();

          expect(wrapper.emitted("taskUpdated")![0][0]).toStrictEqual({
            ...taskData,
            isComplete: !initialIsComplete,
          });
        }
      );

      it("emits any returned errors", async () => {
        const errorMessage = "An error message.";
        const taskId = "task-id-001";

        server.use(
          rest.patch(`/task/${taskId}`, (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: errorMessage })
            )
          )
        );

        const wrapper = shallowMount(TaskComponent, {
          props: {
            task: {
              id: taskId,
              title: "A task's title #2",
              isComplete: true,
            },
          },
        });

        await wrapper.get('[data-test="toggle-check-button"]').trigger("click");

        await flushPromises();

        expect(wrapper.emitted("error")![0][0]).toStrictEqual([errorMessage]);
      });
    });

    describe("title", () => {
      const newTaskTitle = "Le new task title.";

      const task = {
        id: "task_003",
        title: "Task title",
        isComplete: false,
      };

      beforeEach(() => {
        server.use(
          rest.patch(`/task/${task.id}`, (_, response, context) =>
            response(
              context.status(200),
              context.json({
                _id: task.id,
                title: newTaskTitle,
                isComplete: task.isComplete,
              })
            )
          )
        );
      });

      it("renders the proper elements when editing", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");

        expect(wrapper.find('[data-test="task-edit-input"]').exists()).toBe(
          true
        );
        expect(
          wrapper.get<HTMLInputElement>('[data-test="task-edit-input"]').element
            .value
        ).toBe(task.title);
        expect(wrapper.find('[data-test="update-task-button"]').exists()).toBe(
          true
        );
        expect(
          wrapper.find('[data-test="cancel-task-update-button"]').exists()
        ).toBe(true);

        expect(wrapper.find('[data-test="toggle-check-button"]').exists()).toBe(
          false
        );
        expect(wrapper.find('[data-test="task-title"]').exists()).toBe(false);
        expect(wrapper.find('[data-test="edit-task-button"]').exists()).toBe(
          false
        );
        expect(wrapper.find('[data-test="delete-task-button"]').exists()).toBe(
          false
        );
      });

      it("hides the title-input and the update & cancel buttons when the editing process is canelled", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="cancel-task-update-button"]')
          .trigger("click");

        expect(wrapper.find('[data-test="toggle-check-button"]').exists()).toBe(
          true
        );
        expect(wrapper.find('[data-test="task-title"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="edit-task-button"]').exists()).toBe(
          true
        );
        expect(wrapper.find('[data-test="delete-task-button"]').exists()).toBe(
          true
        );

        expect(wrapper.find('[data-test="task-edit-input"]').exists()).toBe(
          false
        );
        expect(wrapper.find('[data-test="update-task-button"]').exists()).toBe(
          false
        );
        expect(
          wrapper.find('[data-test="cancel-task-update-button"]').exists()
        ).toBe(false);
      });

      it("resets the title-input to the current task's title if the update operation is cancelled", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="task-edit-input"]')
          .setValue("Something else");
        await wrapper
          .get('[data-test="cancel-task-update-button"]')
          .trigger("click");

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        expect(
          wrapper.get<HTMLInputElement>('[data-test="task-edit-input"]').element
            .value
        ).toBe(task.title);
      });

      it("synchronizes the value of the title-input with that of the prop if the prop changes", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="task-edit-input"]')
          .setValue("Something else");
        await wrapper
          .get('[data-test="cancel-task-update-button"]')
          .trigger("click");

        await wrapper.setProps({ task: { ...task, title: newTaskTitle } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");

        expect(
          wrapper.get<HTMLInputElement>('[data-test="task-edit-input"]').element
            .value
        ).toBe(newTaskTitle);
      });

      it("shows the correct elements on success", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="task-edit-input"]')
          .setValue(newTaskTitle);
        await wrapper.get('[data-test="update-task-button"]').trigger("click");

        await flushPromises();

        expect(wrapper.find('[data-test="toggle-check-button"]').exists()).toBe(
          true
        );
        expect(wrapper.find('[data-test="task-title"]').exists()).toBe(true);
        expect(wrapper.find('[data-test="edit-task-button"]').exists()).toBe(
          true
        );
        expect(wrapper.find('[data-test="delete-task-button"]').exists()).toBe(
          true
        );

        expect(wrapper.find('[data-test="task-edit-input"]').exists()).toBe(
          false
        );
        expect(wrapper.find('[data-test="update-task-button"]').exists()).toBe(
          false
        );
        expect(
          wrapper.find('[data-test="cancel-task-update-button"]').exists()
        ).toBe(false);
      });

      it("emits the updated task's data on success", async () => {
        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="task-edit-input"]')
          .setValue(newTaskTitle);
        await wrapper.get('[data-test="update-task-button"]').trigger("click");

        await flushPromises();

        expect(wrapper.emitted("taskUpdated")![0][0]).toMatchObject({
          ...task,
          title: newTaskTitle,
        });
      });

      it("emits any returned errors", async () => {
        const errorMessage = "An error message.";

        server.use(
          rest.patch(`/task/${task.id}`, (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: errorMessage })
            )
          )
        );

        const wrapper = shallowMount(TaskComponent, { props: { task } });

        await wrapper.get('[data-test="edit-task-button"]').trigger("click");
        await wrapper
          .get('[data-test="task-edit-input"]')
          .setValue(newTaskTitle);
        await wrapper.get('[data-test="update-task-button"]').trigger("click");

        await flushPromises();

        expect(wrapper.emitted("error")![0][0]).toStrictEqual([errorMessage]);
      });
    });
  });

  describe("delete task", () => {
    afterEach(() => {
      server.resetHandlers();
    });

    it("does not emit anything if the delete button is clicked only once", async () => {
      const taskId = "task-id-0";

      const wrapper = shallowMount(TaskComponent, {
        props: {
          task: {
            id: taskId,
            title: "A task's title",
            isComplete: true,
          },
        },
      });

      expect(wrapper.find('[data-test="delete-task-button"]').exists()).toBe(
        true
      );

      await wrapper.find('[data-test="delete-task-button"]').trigger("click");

      await flushPromises();

      expect(wrapper.emitted()).not.toMatchObject({
        taskDeleted: expect.anything(),
        error: expect.anything(),
      });
    });

    it("emits the deleted task's id if the deletion is successful", async () => {
      const taskId = "task-id-1";

      server.use(
        rest.delete(`/task/${taskId}`, (_, response, context) =>
          response(context.status(204))
        )
      );

      const wrapper = shallowMount(TaskComponent, {
        props: {
          task: {
            id: taskId,
            title: "A task's title",
            isComplete: true,
          },
        },
      });

      await wrapper.find('[data-test="delete-task-button"]').trigger("click");
      await wrapper.find('[data-test="delete-task-button"]').trigger("click");

      await flushPromises();

      expect(wrapper.emitted("taskDeleted")![0][0]).toBe(taskId);
    });

    it("emits any returned errors", async () => {
      const errorMessage = "An error message.";
      const taskId = "task-id-2";

      server.use(
        rest.delete(`/task/${taskId}`, (_, response, context) =>
          response(context.status(400), context.json({ message: errorMessage }))
        )
      );

      const wrapper = shallowMount(TaskComponent, {
        props: {
          task: {
            id: taskId,
            title: "A task's title #2",
            isComplete: true,
          },
        },
      });

      await wrapper.find('[data-test="delete-task-button"]').trigger("click");
      await wrapper.find('[data-test="delete-task-button"]').trigger("click");

      await flushPromises();

      expect(wrapper.emitted("error")![0][0]).toStrictEqual([errorMessage]);
    });
  });
});
