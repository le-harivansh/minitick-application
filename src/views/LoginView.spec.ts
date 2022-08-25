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
import { createTestingPinia } from "@pinia/testing";
import LoginView from "./LoginView.vue";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
  PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT,
} from "../lib/constants";
import { useMainStore } from "../stores/main";
import { LocalStorageMock, type UnArray } from "../lib/test-helpers";

describe("LoginView", () => {
  const originalLocalStorage = localStorage;

  const userLoginData: {
    user: { id?: string; username: string; password: string };
    errors?: string[];
    tokenData?: {
      accessToken: { expiresAt: number };
      refreshToken: { expiresAt: number };
      passwordConfirmationToken: { expiresAt: number };
    };
  }[] = [];

  const server = setupServer(
    rest.post("/login", async (request, response, context) => {
      const { username, password } = await request.json<{
        username: string;
        password: string;
      }>();

      const retrievedUserLoginData: UnArray<typeof userLoginData> | undefined =
        userLoginData.find(
          ({ user: { username: username_, password: password_ } }) =>
            username_ === username && password_ === password
        );

      if (!retrievedUserLoginData) {
        throw new Error("Invalid request data.");
      }

      return retrievedUserLoginData.errors
        ? response(
            context.status(400),
            context.json({
              statusCode: 400,
              message: retrievedUserLoginData.errors,
              error: "Bad Request",
            })
          )
        : response(
            context.status(200),
            context.json(retrievedUserLoginData.tokenData)
          );
    }),
    rest.get("/user", (_, response, context) =>
      response(
        context.status(200),
        context.json({
          id: userLoginData[0].user.id ?? "user-id",
          username: userLoginData[0].user.username,
        })
      )
    ),
    rest.get("/refresh/access-token", (_, response, context) =>
      response(
        context.status(200),
        context.json({ expiresAt: Date.now() + 1000 * 60 * 15 })
      )
    ),
    rest.get("/refresh/refresh-token", (_, response, context) =>
      response(
        context.status(200),
        context.json({ expiresAt: Date.now() + 1000 * 60 * 60 * 24 * 7 })
      )
    )
  );

  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", name: "home", component: defineComponent(() => undefined) },
    ],
  });

  let wrapper: VueWrapper;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    wrapper = mount(LoginView, {
      global: {
        plugins: [
          router,
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
      },
    });

    localStorage = new LocalStorageMock() as unknown as Storage; // eslint-disable-line no-global-assign
  });

  afterEach(() => {
    userLoginData.splice(0, userLoginData.length);
    server.resetHandlers();

    localStorage = originalLocalStorage; // eslint-disable-line no-global-assign

    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  afterAll(() => {
    server.close();
  });

  it("saves the received token-data to localStorage on successful login", async () => {
    const accessTokenExpiresAt = Date.now() + 1000 * 60 * 15;
    const refreshTokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
    const passwordConfirmationTokenExpiresAt = Date.now() + 1000 * 60 * 5;

    userLoginData.push({
      user: {
        username: "username-0",
        password: "password-0",
      },
      tokenData: {
        accessToken: { expiresAt: accessTokenExpiresAt },
        refreshToken: { expiresAt: refreshTokenExpiresAt },
        passwordConfirmationToken: {
          expiresAt: passwordConfirmationTokenExpiresAt,
        },
      },
    });

    expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBeNull();
    expect(
      localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)
    ).toBeNull();

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
      accessTokenExpiresAt.toString()
    );
    expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBe(
      refreshTokenExpiresAt.toString()
    );
    expect(localStorage.getItem(PASSWORD_CONFIRMATION_TOKEN_EXPIRES_AT)).toBe(
      passwordConfirmationTokenExpiresAt.toString()
    );
  });

  it("retrieves the user data and saves it to the store after a successful authentication attempt", async () => {
    const userData = {
      id: "user-id",
      username: "le-username",
      password: "le-password",
    };

    userLoginData.push({
      user: userData,
      tokenData: {
        accessToken: { expiresAt: Date.now() },
        refreshToken: { expiresAt: Date.now() },
        passwordConfirmationToken: { expiresAt: Date.now() },
      },
    });

    const mainStore = useMainStore();

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    expect(mainStore.authenticatedUser).toStrictEqual({
      id: userData.id,
      username: userData.username,
    });
  });

  it("sets the tokens' refreshing callbacks", async () => {
    userLoginData.push({
      user: { username: "username", password: "password" },
      tokenData: {
        accessToken: { expiresAt: Date.now() },
        refreshToken: { expiresAt: Date.now() },
        passwordConfirmationToken: { expiresAt: Date.now() },
      },
    });

    const mainStore = useMainStore();

    expect(mainStore.tokenTimers.accessToken).toBeNull();
    expect(mainStore.tokenTimers.refreshToken).toBeNull();

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    expect(mainStore.tokenTimers.accessToken).not.toBeNull();
    expect(mainStore.tokenTimers.refreshToken).not.toBeNull();
  });

  it("redirects to /home on successful login", async () => {
    userLoginData.push({
      user: {
        username: "le-username",
        password: "le-password",
      },
      tokenData: {
        accessToken: { expiresAt: Date.now() },
        refreshToken: { expiresAt: Date.now() },
        passwordConfirmationToken: { expiresAt: Date.now() },
      },
    });

    vi.spyOn(router, "push");

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    expect(router.push).toHaveBeenCalledOnce();
    expect(router.push).toBeCalledWith({ name: "home" });
  });

  it("displays any number of returned login error-messages", async () => {
    userLoginData.push({
      user: {
        username: "invalid-username-0",
        password: "invalid-password-0",
      },
      errors: ["Invalid credentials."],
    });

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    expect(wrapper.get('[data-test="errors"]').isVisible()).toBe(true);

    userLoginData[0].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).contains(errorMessage)
    );
  });

  it("clears any errors before retrying to login", async () => {
    userLoginData.push({
      user: {
        username: "invalid-username-00",
        password: "invalid-password-00",
      },
      errors: ["Invalid credentials."],
    });

    userLoginData.push({
      user: {
        username: "invalid-username-2",
        password: "invalid-password-2",
      },
      errors: [
        "This is an error for `invalid-username-2`.",
        "This is an error for `invalid-password-2`.",
      ],
    });

    await wrapper.get("#username").setValue(userLoginData[0].user.username);
    await wrapper.get("#password").setValue(userLoginData[0].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    await wrapper.get("#username").setValue(userLoginData[1].user.username);
    await wrapper.get("#password").setValue(userLoginData[1].user.password);
    await wrapper.get('[data-test="login-form"]').trigger("submit");

    await flushPromises();

    userLoginData[1].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).contains(errorMessage)
    );

    userLoginData[0].errors!.forEach((errorMessage) =>
      expect(wrapper.get('[data-test="errors"]').text()).not.contains(
        errorMessage
      )
    );
  });
});
