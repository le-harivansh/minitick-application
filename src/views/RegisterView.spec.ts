import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { flushPromises, mount, VueWrapper } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { defineComponent } from "vue";
import RegisterView from "./RegisterView.vue";
import type { UnArray } from "../lib/test-helpers";

describe("RegisterView", () => {
  const userRegistrationData: {
    user: { username: string; password: string };
    errors?: string[];
  }[] = [];

  const server = setupServer(
    rest.post("/register", async (request, response, context) => {
      const { username, password } = await request.json<{
        username: string;
        password: string;
      }>();

      const retrievedUserRegistrationData:
        | UnArray<typeof userRegistrationData>
        | undefined = userRegistrationData.find(
        ({ user: { username: username_, password: password_ } }) =>
          username_ === username && password_ === password
      );

      if (!retrievedUserRegistrationData) {
        throw new Error("Invalid request data.");
      }

      return retrievedUserRegistrationData.errors
        ? response(
            context.status(400),
            context.json({
              statusCode: 400,
              message: retrievedUserRegistrationData.errors,
              error: "Bad Request",
            })
          )
        : response(context.status(201));
    })
  );

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", name: "home", component: defineComponent(() => undefined) },
      {
        path: "/login",
        name: "login",
        component: defineComponent(() => undefined),
      },
    ],
  });

  let wrapper: VueWrapper;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    wrapper = mount(RegisterView, {
      global: {
        plugins: [router],
      },
    });
  });

  afterEach(() => {
    userRegistrationData.splice(0, userRegistrationData.length);

    vi.restoreAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  it("redirects to /login after a successful registration attempt", async () => {
    userRegistrationData.push({
      user: {
        username: "username-0",
        password: "password-0",
      },
    });

    vi.spyOn(router, "push");

    await wrapper
      .get("#username")
      .setValue(userRegistrationData[0].user.username);
    await wrapper
      .get("#password")
      .setValue(userRegistrationData[0].user.password);
    await wrapper.get('[data-test="register-form"]').trigger("submit");

    await flushPromises();

    expect(router.push).toHaveBeenCalledOnce();
    expect(router.push).toBeCalledWith({ name: "login" });
  });

  it("displays any registration errors if the registration fails", async () => {
    userRegistrationData.push({
      user: {
        username: "le-username",
        password: "le-password",
      },
      errors: ["Error #1", "Error #2"],
    });

    await wrapper
      .get("#username")
      .setValue(userRegistrationData[0].user.username);
    await wrapper
      .get("#password")
      .setValue(userRegistrationData[0].user.password);
    await wrapper.get('[data-test="register-form"]').trigger("submit");

    await flushPromises();

    userRegistrationData[0].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).contains(errorMessage)
    );
  });

  it("clears any previous errors if re-attempting to register", async () => {
    userRegistrationData.push({
      user: {
        username: "username-0",
        password: "password-0",
      },
      errors: ["Error #1", "Error #2"],
    });

    userRegistrationData.push({
      user: {
        username: "username-1",
        password: "password-1",
      },
      errors: ["Error #3", "Error #4"],
    });

    await wrapper
      .get("#username")
      .setValue(userRegistrationData[0].user.username);
    await wrapper
      .get("#password")
      .setValue(userRegistrationData[0].user.password);
    await wrapper.get('[data-test="register-form"]').trigger("submit");

    await flushPromises();

    userRegistrationData[0].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).contains(errorMessage)
    );

    await wrapper
      .get("#username")
      .setValue(userRegistrationData[1].user.username);
    await wrapper
      .get("#password")
      .setValue(userRegistrationData[1].user.password);
    await wrapper.get('[data-test="register-form"]').trigger("submit");

    await flushPromises();

    userRegistrationData[0].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).not.contains(
        errorMessage
      )
    );

    userRegistrationData[1].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).contains(errorMessage)
    );
  });
});
