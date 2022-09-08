import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { stubbedRoutes } from "../lib/test/helpers";
import RegisterView from "./RegisterView.vue";

function createWrapper() {
  const router = createRouter({
    history: createWebHistory(),
    routes: stubbedRoutes,
  });

  const wrapper = shallowMount(RegisterView, {
    global: {
      plugins: [router],
    },
  });

  return {
    router,
    wrapper,
  };
}

describe(RegisterView.name, () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("renders the view properly", () => {
    const { wrapper } = createWrapper();

    expect(wrapper.text()).toContain("Username");
    expect(wrapper.get("#username").isVisible()).toBe(true);

    expect(wrapper.text()).toContain("Password");
    expect(wrapper.get("#password").isVisible()).toBe(true);

    expect(wrapper.get('[data-test="register-button"]').isVisible()).toBe(true);
  });

  describe("on request failure", () => {
    const errorMessages = [
      "The username provided is invalid.",
      "The password provided is invalid.",
    ];

    beforeAll(() => {
      server.use(
        rest.post("/register", (_, response, context) =>
          response(
            context.status(400),
            context.json({
              statusCode: 400,
              message: errorMessages,
              error: "Bad Request",
            })
          )
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("displays any errors that occur during the registration request", async () => {
      const { wrapper } = createWrapper();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="registration-form"]').trigger("submit");

      await flushPromises();

      expect(wrapper.get('[data-test="registration-errors"]').isVisible()).toBe(
        true
      );

      errorMessages.forEach((errorMessage) =>
        expect(
          wrapper.get('[data-test="registration-errors"]').text()
        ).toContain(errorMessage)
      );
    });

    it("clears any previous errors before retrying the registration request", async () => {
      const { wrapper } = createWrapper();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="registration-form"]').trigger("submit");

      await flushPromises();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="registration-form"]').trigger("submit");

      await flushPromises();

      expect(
        wrapper.get<HTMLUListElement>('[data-test="registration-errors"]')
          .element.childElementCount
      ).toBe(errorMessages.length);
    });
  });

  describe("on request success", () => {
    beforeAll(() => {
      server.use(
        rest.post("/register", (_, response, context) =>
          response(context.status(204))
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("redirects to /login when the registration is successful", async () => {
      const { wrapper, router } = createWrapper();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="registration-form"]').trigger("submit");

      await flushPromises();

      expect(router.currentRoute.value.path).toBe("/login");
    });
  });
});
