import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import CreateTask from "./CreateTask.vue";

describe("CreateTask", () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("renders the component properly", () => {
    const wrapper = shallowMount(CreateTask);

    expect(wrapper.get('[data-test="create-task-input"]').isVisible()).toBe(
      true
    );
    expect(wrapper.get('[data-test="create-task-button"]').isVisible()).toBe(
      true
    );
  });

  describe("on success", () => {
    beforeAll(() => {
      server.use(
        rest.post<{ title: string }>(
          "/task",
          async (request, response, context) =>
            response(
              context.status(201),
              context.json({
                _id: "task-id",
                title: (await request.json()).title,
                isComplete: false,
              })
            )
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("emits the typed-in task name", async () => {
      const newTaskTitle = "The new task";

      const wrapper = shallowMount(CreateTask);

      await wrapper
        .get('[data-test="create-task-input"]')
        .setValue(newTaskTitle);
      await wrapper.get('[data-test="create-task-form"]').trigger("submit");

      await flushPromises();

      expect(wrapper.emitted("taskCreated")![0][0]).toStrictEqual({
        id: expect.any(String),
        title: newTaskTitle,
        isComplete: false,
      });
    });

    it("clears the input", async () => {
      const wrapper = shallowMount(CreateTask);

      await wrapper
        .get('[data-test="create-task-input"]')
        .setValue("A new task");
      await wrapper.get('[data-test="create-task-form"]').trigger("submit");

      await flushPromises();

      expect(
        wrapper.get<HTMLInputElement>('[data-test="create-task-input"]').element
          .value
      ).toBe("");
    });
  });

  describe("on failure", () => {
    const errorMessage = "An error occured during the tas's creation";

    beforeAll(() => {
      server.use(
        rest.post("/task", (_, response, context) =>
          response(
            context.status(400),
            context.json({
              message: errorMessage,
            })
          )
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("emits any errors that occur", async () => {
      const wrapper = shallowMount(CreateTask);

      await wrapper
        .get('[data-test="create-task-input"]')
        .setValue("A new task");
      await wrapper.get('[data-test="create-task-form"]').trigger("submit");

      await flushPromises();

      expect(wrapper.emitted("error")![0][0]).toStrictEqual([errorMessage]);
    });
  });
});
