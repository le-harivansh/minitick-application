import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { stubbedRoutes } from "../lib/test/helpers";
import { useMainStore } from "../stores/main";
import LoginView from "./LoginView.vue";

function createWrapper(mountOptions: { shallow: boolean } = { shallow: true }) {
  const router = createRouter({
    history: createWebHistory(),
    routes: stubbedRoutes,
  });

  const wrapper = mount(LoginView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), router],
    },
    shallow: mountOptions.shallow,
  });

  return {
    router,
    wrapper,
  };
}

describe("LoginView", () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("renders the login view properly", async () => {
    const { wrapper } = createWrapper();

    expect(wrapper.text()).toContain("Username");
    expect(wrapper.get("#username").isVisible()).toBe(true);

    expect(wrapper.text()).toContain("Password");
    expect(wrapper.get("#password").isVisible()).toBe(true);

    expect(wrapper.get('[data-test="login-button"]').isVisible()).toBe(true);
  });

  describe("on `/POST login` request failure", () => {
    const errorMessage = "The credentials provided are invalid.";

    beforeAll(() => {
      server.use(
        rest.post("/login", (_, response, context) =>
          response(context.status(401), context.json({ message: errorMessage }))
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("displays any errors that occur during the login request", async () => {
      const { wrapper } = createWrapper({ shallow: false });

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="login-form"]').trigger("submit");

      await flushPromises();

      expect(wrapper.get('[data-test="login-errors"]').isVisible()).toBe(true);
      expect(wrapper.get('[data-test="login-errors"]').text()).toContain(
        errorMessage
      );
    });

    it("clears any previous errors before retrying the registration request", async () => {
      const { wrapper } = createWrapper({ shallow: false });

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="login-form"]').trigger("submit");

      await flushPromises();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="login-form"]').trigger("submit");

      await flushPromises();

      expect(wrapper.get('[data-test="login-errors"]').text()).toBe(
        errorMessage
      );
    });
  });

  describe("on `/POST login` request success", () => {
    const tokensData = {
      accessToken: { expiresAt: Date.now() + 1000 * 60 * 15 }, // in 15 minutes
      refreshToken: { expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 }, // in 7 days
      passwordConfirmationToken: { expiresAt: Date.now() + 1000 * 60 * 5 }, // in 5 minutes
    };

    const loginRequestHandler = rest.post("/login", (_, response, context) =>
      response(context.status(200), context.json(tokensData))
    );

    beforeAll(() => {
      server.use(
        loginRequestHandler,
        rest.get("/user", (_, response, context) =>
          response(
            context.status(200),
            context.json({
              id: "le-user-id",
              username: "le-username",
            })
          )
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("saves the received tokens' expiration dates to localStorage", async () => {
      const { wrapper } = createWrapper();

      await wrapper.get("#username").setValue("le-username");
      await wrapper.get("#password").setValue("le-password");
      await wrapper.get('[data-test="login-form"]').trigger("submit");

      await flushPromises();

      expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
        tokensData.accessToken.expiresAt.toString()
      );
      expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBe(
        tokensData.refreshToken.expiresAt.toString()
      );
      expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)).toBe(
        tokensData.passwordConfirmationToken.expiresAt.toString()
      );
    });

    describe("on `/GET user` request failure", () => {
      const errorMessage = "An error occured during the request.";

      beforeAll(() => {
        server.use(
          rest.get("/user", (_, response, context) =>
            response(
              context.status(403),
              context.json({ message: errorMessage })
            )
          )
        );
      });

      afterAll(() => {
        server.resetHandlers(loginRequestHandler);
      });

      it("displays any errors that occur during the user-query request", async () => {
        const { wrapper } = createWrapper({ shallow: false });

        await wrapper.get("#username").setValue("le-username");
        await wrapper.get("#password").setValue("le-password");
        await wrapper.get('[data-test="login-form"]').trigger("submit");

        await flushPromises();

        expect(wrapper.get('[data-test="login-errors"]').isVisible()).toBe(
          true
        );
        expect(wrapper.get('[data-test="login-errors"]').text()).toContain(
          errorMessage
        );
      });

      /**
       * We do not need to check if the errors are cleared on retry, since
       * the logic is shared across the `login` method.
       */
    });

    describe("on `/GET user` request success", () => {
      const userData = {
        id: "user-id",
        username: "username#10101",
      };

      beforeAll(() => {
        server.use(
          rest.get("/user", (_, response, context) =>
            response(context.status(200), context.json(userData))
          )
        );
      });

      afterAll(() => {
        server.resetHandlers(loginRequestHandler);
      });

      it("sets the user's & tokens' data to the store", async () => {
        const { wrapper } = createWrapper();
        const mainStore = useMainStore();

        await wrapper.get("#username").setValue(userData.username);
        await wrapper.get("#password").setValue("le-password");
        await wrapper.get('[data-test="login-form"]').trigger("submit");

        await flushPromises();

        expect(mainStore.authenticatedUser.id).toBe(userData.id);
        expect(mainStore.authenticatedUser.username).toBe(userData.username);

        expect(mainStore.tokenTimers.accessToken).not.toBeNull();
        expect(mainStore.tokenTimers.refreshToken).not.toBeNull();
      });

      it("redirects to /", async () => {
        const { wrapper, router } = createWrapper();

        router.push({ name: "login" });

        await router.isReady();

        await wrapper.get("#username").setValue(userData.username);
        await wrapper.get("#password").setValue("le-password");
        await wrapper.get('[data-test="login-form"]').trigger("submit");

        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/");
      });
    });
  });
});
