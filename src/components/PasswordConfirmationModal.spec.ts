import { createTestingPinia } from "@pinia/testing";
import { flushPromises, shallowMount } from "@vue/test-utils";
import { rest } from "msw";
import { setupServer } from "msw/node";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import PasswordConfirmationModal from "./PasswordConfirmationModal.vue";
import { stubbedRoutes } from "../lib/test/helpers";

function createWrapper(mountOptions?: { stubs: Record<string, boolean> }) {
  return shallowMount(PasswordConfirmationModal, {
    global: {
      plugins: [
        createTestingPinia({ createSpy: vi.fn }),
        createRouter({ history: createWebHistory(), routes: stubbedRoutes }),
      ],
      stubs: {
        teleport: true,
        ...(mountOptions?.stubs ?? {}),
      },
    },
  });
}

describe("PasswordConfirmationModal", () => {
  const server = setupServer();

  beforeAll(() => {
    server.listen();
  });

  afterAll(() => {
    server.close();
  });

  it("only displays the modal-button", () => {
    const wrapper = createWrapper();

    expect(
      wrapper
        .get('[data-test="show-password-confirmation-modal-button"]')
        .isVisible()
    ).toBe(true);
    expect(
      wrapper.find('[data-test="password-confirmation-modal"]').exists()
    ).toBe(false);
  });

  it("displays the password-confirmation modal when the button is clicked", async () => {
    const wrapper = createWrapper();

    await wrapper
      .get('[data-test="show-password-confirmation-modal-button"]')
      .trigger("click");

    expect(
      wrapper.get('[data-test="password-confirmation-modal"]').isVisible()
    ).toBe(true);
  });

  it("hides the modal when the 'close' button is clicked", async () => {
    const wrapper = createWrapper();

    await wrapper
      .get('[data-test="show-password-confirmation-modal-button"]')
      .trigger("click");
    await wrapper
      .get('[data-test="close-password-confirmation-modal-button"]')
      .trigger("click");

    expect(
      wrapper.find('[data-test="password-confirmation-modal"]').exists()
    ).toBe(false);
  });

  it("clears the password confirmation input everytime the modal is closed", async () => {
    const wrapper = createWrapper();

    await wrapper
      .get('[data-test="show-password-confirmation-modal-button"]')
      .trigger("click");

    await wrapper.get("#password").setValue("a-password");

    await wrapper
      .get('[data-test="close-password-confirmation-modal-button"]')
      .trigger("click");
    await wrapper
      .get('[data-test="show-password-confirmation-modal-button"]')
      .trigger("click");

    expect(wrapper.find<HTMLInputElement>("#password").element.value).toBe("");
  });

  describe("on request failure", () => {
    const refreshPasswordConfirmationTokenErrors =
      "The password provided is incorrect.";

    beforeAll(() => {
      server.use(
        rest.post(
          "/refresh/password-confirmation-token",
          (_, response, context) =>
            response(
              context.status(400),
              context.json({ message: refreshPasswordConfirmationTokenErrors })
            )
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("displays any errors from the request", async () => {
      const wrapper = createWrapper({ stubs: { ErrorList: false } });

      await wrapper
        .get('[data-test="show-password-confirmation-modal-button"]')
        .trigger("click");

      await wrapper.get("#password").setValue("a-password");
      await wrapper
        .get('[data-test="submit-confirm-password-form"]')
        .trigger("submit");

      await flushPromises();

      expect(
        wrapper.get('[data-test="password-confirmation-errors"]').isVisible()
      ).toBe(true);
      expect(
        wrapper.get('[data-test="password-confirmation-errors"]').text()
      ).toContain(refreshPasswordConfirmationTokenErrors);
    });

    it("clears any errors before retrying", async () => {
      const wrapper = createWrapper({ stubs: { ErrorList: false } });

      await wrapper
        .get('[data-test="show-password-confirmation-modal-button"]')
        .trigger("click");

      await wrapper.get("#password").setValue("a-password");
      await wrapper
        .get('[data-test="submit-confirm-password-form"]')
        .trigger("submit");

      await flushPromises();

      await wrapper
        .get('[data-test="submit-confirm-password-form"]')
        .trigger("submit");

      await flushPromises();

      expect(
        wrapper.get('[data-test="password-confirmation-errors"]').text()
      ).toBe(refreshPasswordConfirmationTokenErrors);
    });
  });

  describe("on request success", () => {
    const passwordConfirmationTokenExpiresAt = Date.now() + 1000 * 60 * 5; // in 5 minutes

    beforeAll(() => {
      server.use(
        rest.post(
          "/refresh/password-confirmation-token",
          (_, response, context) =>
            response(
              context.status(204),
              context.json({
                expiresAt: passwordConfirmationTokenExpiresAt,
              })
            )
        )
      );
    });

    afterEach(() => {
      localStorage.clear();
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("automatically closes the modal", async () => {
      const wrapper = createWrapper();

      await wrapper
        .get('[data-test="show-password-confirmation-modal-button"]')
        .trigger("click");

      await wrapper.get("#password").setValue("a-password");
      await wrapper
        .get('[data-test="submit-confirm-password-form"]')
        .trigger("submit");

      await flushPromises();

      expect(
        wrapper.find('[data-test="password-confirmation-modal"]').exists()
      ).toBe(false);
    });

    it("emits the received password-confirmation token's expiry", async () => {
      const wrapper = createWrapper();

      await wrapper
        .get('[data-test="show-password-confirmation-modal-button"]')
        .trigger("click");

      await wrapper.get("#password").setValue("a-password");
      await wrapper
        .get('[data-test="submit-confirm-password-form"]')
        .trigger("submit");

      await flushPromises();

      expect(wrapper.emitted("passwordConfirmed")).toHaveLength(1);
      expect(wrapper.emitted("passwordConfirmed")![0]).toStrictEqual([
        passwordConfirmationTokenExpiresAt,
      ]);
    });
  });
});
