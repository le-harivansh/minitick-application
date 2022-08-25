import { flushPromises, shallowMount } from "@vue/test-utils";
import ms from "ms";
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
  vi,
} from "vitest";
import { createTestingPinia } from "@pinia/testing";
import ClaxApplication from "./ClaxApplication.vue";
import { useMainStore } from "./stores/main";
import { LocalStorageMock } from "./lib/test-helpers";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "./lib/constants";

describe("ClaxApplication", () => {
  const userData = {
    id: "user-id",
    username: "username",
  };

  const server = setupServer(
    rest.get("/user", (_, response, context) =>
      response(context.status(200), context.json(userData))
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

  const originalLocalStorage = localStorage;

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    localStorage = new LocalStorageMock() as unknown as Storage; // eslint-disable-line no-global-assign

    vi.useFakeTimers();
  });

  afterEach(() => {
    server.resetHandlers();

    vi.clearAllTimers();
    vi.useRealTimers();

    localStorage = originalLocalStorage; // eslint-disable-line no-global-assign
  });

  afterAll(() => {
    server.close();
  });

  describe("onMount", () => {
    it("refreshes the user's data in the store", async () => {
      shallowMount(ClaxApplication, {
        global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
      });

      const mainStore = useMainStore();

      await flushPromises();

      expect(mainStore.authenticatedUser.id).toBe(userData.id);
      expect(mainStore.authenticatedUser.username).toBe(userData.username);
    });

    describe("refresh tokens", () => {
      it("attempts to refresh the user's access-token if it is within the refresh threshold", async () => {
        const accessTokenExpiresAt = Date.now() + 1000 * 60 * 15;
        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          accessTokenExpiresAt.toString()
        );

        const accessTokenRefreshThreshold =
          accessTokenExpiresAt -
          ms(import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD);
        vi.setSystemTime(accessTokenRefreshThreshold);

        const newAccessTokenExpiresAt = Date.now() + 1000 * 60 * 15;

        server.use(
          rest.get("/refresh/access-token", (_, response, context) =>
            response(
              context.status(200),
              context.json({
                expiresAt: newAccessTokenExpiresAt,
              })
            )
          )
        );

        shallowMount(ClaxApplication, {
          global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
        });

        await flushPromises();

        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
          newAccessTokenExpiresAt.toString()
        );
      });

      it("attempts to refresh the user's refresh-token if it is within the refresh threshold", async () => {
        const refreshTokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;
        localStorage.setItem(
          REFRESH_TOKEN_EXPIRES_AT,
          refreshTokenExpiresAt.toString()
        );

        const refreshTokenRefreshThreshold =
          refreshTokenExpiresAt -
          ms(import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD);
        vi.setSystemTime(refreshTokenRefreshThreshold);

        const newRefreshTokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

        server.use(
          rest.get("/refresh/refresh-token", (_, response, context) =>
            response(
              context.status(200),
              context.json({
                expiresAt: newRefreshTokenExpiresAt,
              })
            )
          )
        );

        shallowMount(ClaxApplication, {
          global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
        });

        await flushPromises();

        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBe(
          newRefreshTokenExpiresAt.toString()
        );
      });

      it("sets the appropriate callback to refresh the user's access-token, and saves the setTimeout-id to the store", async () => {
        const accessTokenExpiryTimeStamps = [
          Date.now() + 1000 * 60 * 15,
          Date.now() + 1000 * 60 * 30,
        ];

        let callCount = 0;

        server.use(
          rest.get("/refresh/access-token", (_, response, context) =>
            response(
              context.status(200),
              context.json({
                expiresAt: accessTokenExpiryTimeStamps[callCount++],
              })
            )
          )
        );

        shallowMount(ClaxApplication, {
          global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
        });

        const mainStore = useMainStore();

        await flushPromises();

        expect(mainStore.tokenTimers.accessToken).not.toBeNull();

        vi.runOnlyPendingTimers();

        await flushPromises();

        expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
          accessTokenExpiryTimeStamps[1].toString()
        );
      });

      it("sets the appropriate callback to refresh the user's refresh-token, and saves the setTimeout-id to the store", async () => {
        const refreshTokenExpiryTimeStamps = [
          Date.now() + 1000 * 60 * 60 * 7,
          Date.now() + 1000 * 60 * 60 * 14,
        ];

        let callCount = 0;

        server.use(
          rest.get("/refresh/refresh-token", (_, response, context) =>
            response(
              context.status(200),
              context.json({
                expiresAt: refreshTokenExpiryTimeStamps[callCount++],
              })
            )
          )
        );

        shallowMount(ClaxApplication, {
          global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
        });

        const mainStore = useMainStore();

        await flushPromises();

        expect(mainStore.tokenTimers.refreshToken).not.toBeNull();

        vi.runOnlyPendingTimers();

        await flushPromises();

        expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBe(
          refreshTokenExpiryTimeStamps[1].toString()
        );
      });
    });
  });
});
