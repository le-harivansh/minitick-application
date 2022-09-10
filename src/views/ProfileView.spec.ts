import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { nextTick } from "vue";
import { createRouter, createWebHistory } from "vue-router";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { stubbedRoutes } from "../lib/test/helpers";
import { useMainStore } from "../stores/main";
import ProfileView from "./ProfileView.vue";
import type UpdateUserField from "../components/UpdateUserField.vue";
import type PasswordConfirmationModal from "../components/PasswordConfirmationModal.vue";

function createWrapper(mountOptions?: { stubs: Record<string, boolean> }) {
  const router = createRouter({
    history: createWebHistory(),
    routes: stubbedRoutes,
  });

  const wrapper = shallowMount(ProfileView, {
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn }), router],
      stubs: {
        teleport: true,
        ...(mountOptions?.stubs ?? {}),
      },
    },
  });

  return {
    router,
    wrapper,
  };
}

describe("ProfileView", () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    localStorage.clear();
  });

  afterAll(() => {
    server.close();
  });

  it("renders the profile view properly", () => {
    const { wrapper } = createWrapper();

    expect(wrapper.text()).toContain("Profile");
    expect(
      wrapper
        .get('[data-test="password-confirmation-modal-component"]')
        .isVisible()
    ).toBe(true);

    expect(wrapper.get('[data-test="update-username-field"]').isVisible()).toBe(
      true
    );
    expect(wrapper.get('[data-test="update-password-field"]').isVisible()).toBe(
      true
    );
    expect(
      wrapper.get('[data-test="logout-other-sessions-button"]').isVisible()
    ).toBe(true);

    expect(
      wrapper.get('[data-test="logout-current-session-button"]').isVisible()
    ).toBe(true);
  });

  describe("logout (current-session)", () => {
    describe("on failure", () => {
      const errorMessage =
        "An error occured while logging out of the current session.";

      beforeAll(() => {
        server.use(
          rest.post("/logout", (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: errorMessage })
            )
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("displays any errors", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        await wrapper
          .get('[data-test="logout-current-session-button"]')
          .trigger("click");

        await flushPromises();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(true);
        expect(
          wrapper.get('[data-test="profile-view-errors"]').text()
        ).toContain(errorMessage);
      });

      it("clears any errors before retrying", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        await wrapper
          .get('[data-test="logout-current-session-button"]')
          .trigger("click");
        await wrapper
          .get('[data-test="logout-current-session-button"]')
          .trigger("click");

        await flushPromises();

        expect(wrapper.get('[data-test="profile-view-errors"]').text()).toBe(
          errorMessage
        );
      });
    });

    describe("on success", () => {
      beforeAll(() => {
        server.use(
          rest.post("/logout", (_, response, context) =>
            response(context.status(204))
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("clears the current user's state", async () => {
        const { wrapper } = createWrapper();
        const mainStore = useMainStore();

        mainStore.authenticatedUser.id = "user-id";
        mainStore.authenticatedUser.username = "le-username";

        mainStore.tokenTimers.accessToken = 1 as unknown as NodeJS.Timeout;
        mainStore.tokenTimers.refreshToken = 1 as unknown as NodeJS.Timeout;

        localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(
          PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
          Date.now().toString()
        );

        await wrapper
          .get('[data-test="logout-current-session-button"]')
          .trigger("click");

        await flushPromises();

        expect(mainStore.authenticatedUser.id).toBeNull();
        expect(mainStore.authenticatedUser.username).toBeNull();

        expect(mainStore.tokenTimers.accessToken).toBeNull();
        expect(mainStore.tokenTimers.refreshToken).toBeNull();

        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBeNull();
        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBeNull();
        expect(
          localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
        ).toBeNull();
      });

      it("it redirects to /login", async () => {
        const { wrapper, router } = createWrapper();

        router.push({ name: "profile" });

        await router.isReady();

        await wrapper
          .get('[data-test="logout-current-session-button"]')
          .trigger("click");

        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/login");
      });
    });
  });

  describe("logout (other-sessions)", () => {
    beforeEach(() => {
      /**
       * Enable the logout button by setting the password-confirmation
       * expiration to 5 minutes in the future.
       */
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        (Date.now() + 1000 * 60 * 5).toString()
      );
    });

    it("is disabled if the current password is not confirmed", async () => {
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        (Date.now() - 1000 * 60 * 3).toString()
      );

      const { wrapper } = createWrapper();

      /**
       * We await nextTick so that the `disabled` attribute is properly set.
       */
      await nextTick();

      expect(
        Object.keys(
          wrapper.get('[data-test="logout-other-sessions-button"]').attributes()
        )
      ).toContain("disabled");
    });

    describe("on failure", () => {
      const errorMessage =
        "An error occured while logging out of other sessions.";

      beforeAll(() => {
        server.use(
          rest.post("/logout", (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: errorMessage })
            )
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("displays any errors", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="logout-other-sessions-button"]')
          .trigger("click");

        await flushPromises();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(true);
        expect(
          wrapper.get('[data-test="profile-view-errors"]').text()
        ).toContain(errorMessage);
      });

      it("clears any errors before retrying", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        await wrapper
          .get('[data-test="logout-other-sessions-button"]')
          .trigger("click");
        await wrapper
          .get('[data-test="logout-other-sessions-button"]')
          .trigger("click");

        await flushPromises();

        expect(wrapper.get('[data-test="profile-view-errors"]').text()).toBe(
          errorMessage
        );
      });
    });

    describe("on success", () => {
      beforeAll(() => {
        server.use(
          rest.post("/logout", (_, response, context) =>
            response(context.status(204))
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("retains the current user's state", async () => {
        const { wrapper } = createWrapper();
        const mainStore = useMainStore();

        mainStore.authenticatedUser.id = "user-id";
        mainStore.authenticatedUser.username = "le-username";

        mainStore.tokenTimers.accessToken = 1 as unknown as NodeJS.Timeout;
        mainStore.tokenTimers.refreshToken = 1 as unknown as NodeJS.Timeout;

        localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(
          PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
          Date.now().toString()
        );

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="logout-other-sessions-button"]')
          .trigger("click");

        await flushPromises();

        expect(mainStore.authenticatedUser.id).not.toBeNull();
        expect(mainStore.authenticatedUser.username).not.toBeNull();

        expect(mainStore.tokenTimers.accessToken).not.toBeNull();
        expect(mainStore.tokenTimers.refreshToken).not.toBeNull();

        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).not.toBeNull();
        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).not.toBeNull();
        expect(
          localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
        ).not.toBeNull();
      });

      it("stays on the /profile page", async () => {
        const { wrapper, router } = createWrapper();

        router.push({ name: "profile" });

        await router.isReady();

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="logout-other-sessions-button"]')
          .trigger("click");

        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/profile");
      });
    });
  });

  describe("delete account", () => {
    beforeEach(() => {
      /**
       * Enable the logout button by setting the password-confirmation
       * expiration to 5 minutes in the future.
       */
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        (Date.now() + 1000 * 60 * 5).toString()
      );
    });

    it("is disabled if the current password is not confirmed", async () => {
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        (Date.now() - 1000 * 60 * 3).toString()
      );

      const { wrapper } = createWrapper();

      /**
       * We await nextTick so that the `disabled` attribute is properly set.
       */
      await nextTick();

      expect(
        Object.keys(
          wrapper.get('[data-test="delete-account-button"]').attributes()
        )
      ).toContain("disabled");
    });

    describe("on failure", () => {
      const errorMessage =
        "An error occured while trying to delete the user's account.";

      beforeAll(() => {
        server.use(
          rest.delete("/user", (_, response, context) =>
            response(
              context.status(401),
              context.json({ message: errorMessage })
            )
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("displays any errors", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="delete-account-button"]')
          .trigger("click");

        await flushPromises();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(true);
        expect(
          wrapper.get('[data-test="profile-view-errors"]').text()
        ).toContain(errorMessage);
      });

      it("clears any errors before retrying", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="delete-account-button"]')
          .trigger("click");
        await wrapper
          .get('[data-test="delete-account-button"]')
          .trigger("click");

        await flushPromises();

        expect(wrapper.get('[data-test="profile-view-errors"]').text()).toBe(
          errorMessage
        );
      });
    });

    describe("on success", () => {
      beforeAll(() => {
        server.use(
          rest.delete("/user", (_, response, context) =>
            response(context.status(204))
          )
        );
      });

      afterAll(() => {
        server.resetHandlers();
      });

      it("clears the current user's state", async () => {
        const { wrapper } = createWrapper();
        const mainStore = useMainStore();

        mainStore.authenticatedUser.id = "user-id";
        mainStore.authenticatedUser.username = "le-username";

        mainStore.tokenTimers.accessToken = 1 as unknown as NodeJS.Timeout;
        mainStore.tokenTimers.refreshToken = 1 as unknown as NodeJS.Timeout;

        localStorage.setItem(ACCESS_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(REFRESH_TOKEN_EXPIRES_AT, Date.now().toString());
        localStorage.setItem(
          PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
          Date.now().toString()
        );

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="delete-account-button"]')
          .trigger("click");

        await flushPromises();

        expect(mainStore.authenticatedUser.id).toBeNull();
        expect(mainStore.authenticatedUser.username).toBeNull();

        expect(mainStore.tokenTimers.accessToken).toBeNull();
        expect(mainStore.tokenTimers.refreshToken).toBeNull();

        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBeNull();
        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBeNull();
        expect(
          localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
        ).toBeNull();
      });

      it("redirects to /register", async () => {
        const { wrapper, router } = createWrapper();

        router.push({ name: "profile" });

        await router.isReady();

        /**
         * We await nextTick so that the button is not disabled anymore.
         */
        await nextTick();

        await wrapper
          .get('[data-test="delete-account-button"]')
          .trigger("click");

        await flushPromises();

        expect(router.currentRoute.value.path).toBe("/register");
      });
    });
  });

  describe("password confirmation", () => {
    it("does not show the button if the password is confirmed", async () => {
      localStorage.setItem(
        PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
        (Date.now() + 1000 * 60 * 5).toString()
      );

      const { wrapper } = createWrapper();

      /**
       * We await nextTick so that the modal-button button is hidden.
       */
      await nextTick();

      expect(
        wrapper
          .get('[data-test="password-confirmation-modal-component"]')
          .isVisible()
      ).toBe(false);
    });

    it("updates the password-confirmation token expiry in localStorage", async () => {
      const passwordConfirmationExpiry = Date.now() + 1000 * 60 * 5; // in 5 minutes

      const { wrapper } = createWrapper();

      wrapper
        .findComponent<typeof PasswordConfirmationModal>(
          '[data-test="password-confirmation-modal-component"]'
        )
        .vm.$emit("password-confirmed", passwordConfirmationExpiry);

      await nextTick();

      expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)).toBe(
        passwordConfirmationExpiry.toString()
      );
    });
  });

  describe("update username", () => {
    describe("on failure", () => {
      it("displays any errors", async () => {
        const errorMessage = "An error occured during the update process.";

        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        wrapper
          .findComponent<typeof UpdateUserField>(
            '[data-test="update-username-field"]'
          )
          .vm.$emit("updateFailure", [errorMessage]);

        await nextTick();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(true);
        expect(
          wrapper.get('[data-test="profile-view-errors"]').text()
        ).toContain(errorMessage);
      });

      it("clears any errors before retrying", async () => {
        const errorMessage = "An error occured during the update process.";

        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });
        const component = wrapper.findComponent<typeof UpdateUserField>(
          '[data-test="update-username-field"]'
        );

        component.vm.$emit("updateFailure", [errorMessage]);
        component.vm.$emit("updateFailure", [errorMessage]);

        await nextTick();

        expect(wrapper.get('[data-test="profile-view-errors"]').text()).toBe(
          errorMessage
        );
      });
    });

    describe("on success", () => {
      it("updates the user's username in the store", async () => {
        const authenticatedUserUsername = "le-username-1001";

        const { wrapper } = createWrapper();
        const mainStore = useMainStore();

        wrapper
          .findComponent<typeof UpdateUserField>(
            '[data-test="update-username-field"]'
          )
          .vm.$emit("updateSuccess", authenticatedUserUsername);

        await nextTick();

        expect(mainStore.authenticatedUser.username).toBe(
          authenticatedUserUsername
        );
      });

      it("clears any previous errors", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });
        const component = wrapper.findComponent<typeof UpdateUserField>(
          '[data-test="update-username-field"]'
        );

        component.vm.$emit("updateFailure", [
          "An error occured during the username update process.",
        ]);

        await nextTick();

        component.vm.$emit("updateSuccess", "le-username");

        await nextTick();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(false);
      });
    });
  });

  describe("update password", () => {
    describe("on failure", () => {
      it("displays any errors", async () => {
        const errorMessage = "An error occured during the update process.";

        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });

        wrapper
          .findComponent<typeof UpdateUserField>(
            '[data-test="update-password-field"]'
          )
          .vm.$emit("updateFailure", [errorMessage]);

        await nextTick();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(true);
        expect(
          wrapper.get('[data-test="profile-view-errors"]').text()
        ).toContain(errorMessage);
      });

      it("clears any errors before retrying", async () => {
        const errorMessage = "An error occured during the update process.";

        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });
        const component = wrapper.findComponent<typeof UpdateUserField>(
          '[data-test="update-password-field"]'
        );

        component.vm.$emit("updateFailure", [errorMessage]);
        component.vm.$emit("updateFailure", [errorMessage]);

        await nextTick();

        expect(wrapper.get('[data-test="profile-view-errors"]').text()).toBe(
          errorMessage
        );
      });
    });

    describe("on success", () => {
      it("clears any previous errors", async () => {
        const { wrapper } = createWrapper({ stubs: { ErrorList: false } });
        const component = wrapper.findComponent<typeof UpdateUserField>(
          '[data-test="update-password-field"]'
        );

        component.vm.$emit("updateFailure", [
          "An error occured during the password update process.",
        ]);

        await nextTick();

        component.vm.$emit("updateSuccess", "le-username");

        await nextTick();

        expect(
          wrapper.get('[data-test="profile-view-errors"]').isVisible()
        ).toBe(false);
      });
    });
  });
});
