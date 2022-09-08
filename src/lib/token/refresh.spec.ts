import { flushPromises } from "@vue/test-utils";
import ms from "ms";
import { rest } from "msw";
import { setupServer } from "msw/node";
import { createPinia, setActivePinia } from "pinia";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from "vitest";
import { useMainStore } from "../../stores/main";
import {
  ACCESS_TOKEN_EXPIRES_AT,
  REFRESH_TOKEN_EXPIRES_AT,
} from "../constants";
import {
  refreshAccessTokenAndSaveExpiryToLocalStorage,
  refreshRefreshTokenAndSaveExpiryToLocalStorage,
  setTimeoutToRefreshAccessToken,
  setTimeoutToRefreshRefreshToken,
} from "./refresh";

describe("Token-refresh helpers", () => {
  const server = setupServer();

  beforeAll(() => {
    vi.useFakeTimers();

    server.listen();
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();

    vi.useRealTimers();
  });

  describe(refreshAccessTokenAndSaveExpiryToLocalStorage.name, () => {
    it("saves the access-token's expiry date in localStorage if the refresh was successful", async () => {
      const accessTokenExpiresAt = Date.now() + 1000 * 60 * 15;

      server.use(
        rest.get("/refresh/access-token", (_, response, context) =>
          response(
            context.status(200),
            context.json({
              expiresAt: accessTokenExpiresAt,
            })
          )
        )
      );

      expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBeNull();

      const accessTokenExpiry =
        await refreshAccessTokenAndSaveExpiryToLocalStorage();

      expect(accessTokenExpiry).toBe(accessTokenExpiresAt);
      expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
        accessTokenExpiresAt.toString()
      );
    });
  });

  describe(refreshRefreshTokenAndSaveExpiryToLocalStorage.name, () => {
    it("saves the refresh-token's expiry date in localStorage if the refresh was successful", async () => {
      const refreshTokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7;

      server.use(
        rest.get("/refresh/refresh-token", (_, response, context) =>
          response(
            context.status(200),
            context.json({
              expiresAt: refreshTokenExpiresAt,
            })
          )
        )
      );

      expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBeNull();

      const refreshTokenExpiry =
        await refreshRefreshTokenAndSaveExpiryToLocalStorage();

      expect(refreshTokenExpiry).toBe(refreshTokenExpiresAt);
      expect(localStorage.getItem(REFRESH_TOKEN_EXPIRES_AT)).toBe(
        refreshTokenExpiresAt.toString()
      );
    });
  });

  describe(setTimeoutToRefreshAccessToken.name, () => {
    beforeAll(() => {
      vi.spyOn(global, "setTimeout");
    });

    beforeEach(() => {
      setActivePinia(createPinia());
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.clearAllTimers();
    });

    it("creates a new timer and sets the timer-id to the store", () => {
      const initialTimeout = 1000 * 4;
      const mainStore = useMainStore();

      setTimeoutToRefreshAccessToken(initialTimeout);

      expect(setTimeout).toHaveBeenCalledOnce();
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        initialTimeout
      );

      expect(mainStore.tokenTimers.accessToken).toStrictEqual(
        (
          setTimeout as unknown as Mock<
            Parameters<typeof setTimeout>,
            ReturnType<typeof setTimeout>
          >
        ).mock.results[0].value
      );
    });

    it("sets another timeout if the previous timeout's callback executes successfully", async () => {
      const initialTimeout = 1000 * 3;

      const newAccessTokenWillExpireAfter = 1000 * 60 * 15; // 15 minutes
      const newAccessTokenExpiresAt =
        Date.now() + newAccessTokenWillExpireAfter;

      const accessTokenRefreshThreshold = ms(
        import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
      );

      const mainStore = useMainStore();

      server.use(
        rest.get("/refresh/access-token", (_, response, context) =>
          response(
            context.status(200),
            context.json({ expiresAt: newAccessTokenExpiresAt })
          )
        )
      );

      setTimeoutToRefreshAccessToken(initialTimeout);

      const initialAccessTokenTimer = mainStore.tokenTimers.accessToken;

      vi.runOnlyPendingTimers();

      await flushPromises();

      const currentAccessTokenTimer = mainStore.tokenTimers.accessToken;

      expect(currentAccessTokenTimer).not.toStrictEqual(
        initialAccessTokenTimer
      );

      const setTimeoutAsSpy = setTimeout as unknown as Mock<
        Parameters<typeof setTimeout>,
        ReturnType<typeof setTimeout>
      >;

      expect(
        setTimeoutAsSpy.mock.calls[setTimeoutAsSpy.mock.calls.length - 1][1]
      ).toBe(
        newAccessTokenWillExpireAfter -
          initialTimeout -
          accessTokenRefreshThreshold
      );
    });
  });

  describe(setTimeoutToRefreshRefreshToken.name, () => {
    beforeAll(() => {
      vi.spyOn(global, "setTimeout");
    });

    beforeEach(() => {
      setActivePinia(createPinia());
    });

    afterEach(() => {
      vi.clearAllMocks();
      vi.clearAllTimers();
    });

    it("creates a new timer and sets the timer-id to the store", () => {
      const initialTimeout = 1000 * 60 * 60 * 24 * 7;
      const mainStore = useMainStore();

      setTimeoutToRefreshRefreshToken(initialTimeout);

      expect(setTimeout).toHaveBeenCalledOnce();
      expect(setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        initialTimeout
      );

      expect(mainStore.tokenTimers.refreshToken).toStrictEqual(
        (
          setTimeout as unknown as Mock<
            Parameters<typeof setTimeout>,
            ReturnType<typeof setTimeout>
          >
        ).mock.results[0].value
      );
    });

    it("sets another timeout if the previous timeout's callback executes successfully", async () => {
      const initialTimeout = 1000 * 60 * 5;

      const newRefreshTokenWillExpireAfter = 1000 * 60 * 60 * 24 * 7; // 1 week
      const newRefreshTokenExpiresAt =
        Date.now() + newRefreshTokenWillExpireAfter;

      const refreshTokenRefreshThreshold = ms(
        import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
      );

      const mainStore = useMainStore();

      server.use(
        rest.get("/refresh/refresh-token", (_, response, context) =>
          response(
            context.status(200),
            context.json({ expiresAt: newRefreshTokenExpiresAt })
          )
        )
      );

      setTimeoutToRefreshRefreshToken(initialTimeout);

      const initialRefreshTokenTimer = mainStore.tokenTimers.refreshToken;

      vi.runOnlyPendingTimers();

      await flushPromises();

      const currentRefreshTokenTimer = mainStore.tokenTimers.refreshToken;

      expect(currentRefreshTokenTimer).not.toStrictEqual(
        initialRefreshTokenTimer
      );

      const setTimeoutAsSpy = setTimeout as unknown as Mock<
        Parameters<typeof setTimeout>,
        ReturnType<typeof setTimeout>
      >;

      expect(
        setTimeoutAsSpy.mock.calls[setTimeoutAsSpy.mock.calls.length - 1][1]
      ).toBe(
        newRefreshTokenWillExpireAfter -
          initialTimeout -
          refreshTokenRefreshThreshold
      );
    });
  });
});
