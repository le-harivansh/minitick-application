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
} from "vitest";
import { useMainStore } from "../stores/main";
import { initializeUserInStoreIfAuthenticated } from "./bootstrap";
import { ACCESS_TOKEN_EXPIRES_AT, REFRESH_TOKEN_EXPIRES_AT } from "./constants";
import { LocalStorageMock } from "./test/helpers";
import {
  refreshAccessTokenAndSaveExpiryToLocalStorage,
  refreshRefreshTokenAndSaveExpiryToLocalStorage,
  setTimeoutToRefreshAccessToken,
  setTimeoutToRefreshRefreshToken,
} from "./token/refresh";

vi.mock("./token/refresh");

describe(initializeUserInStoreIfAuthenticated.name, () => {
  const originalLocalStorage = localStorage;

  const userData = { id: "user-id", username: "user-username" };

  const server = setupServer(
    rest.get("/user", (_, response, context) =>
      response(context.status(200), context.json(userData))
    )
  );

  beforeAll(() => {
    server.listen();
  });

  beforeEach(() => {
    setActivePinia(createPinia());

    localStorage = new LocalStorageMock() as unknown as Storage; // eslint-disable-line no-global-assign
  });

  afterEach(() => {
    localStorage = originalLocalStorage; // eslint-disable-line no-global-assign

    vi.clearAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe("[user-retrieval FAILURE]", () => {
    beforeAll(() => {
      server.use(
        rest.get("/user", (_, response, context) =>
          response(context.status(401))
        )
      );
    });

    afterAll(() => {
      server.resetHandlers();
    });

    it("returns false", () => {
      expect(initializeUserInStoreIfAuthenticated()).resolves.toBe(false);
    });

    it("does not set any user-data in the store", async () => {
      const mainStore = useMainStore();

      await initializeUserInStoreIfAuthenticated();

      expect(mainStore.authenticatedUser).toStrictEqual({
        id: null,
        username: null,
      });
    });
  });

  describe("[user-retrieval SUCCESS]", () => {
    it("adds the authenticated user's data in the store", async () => {
      const mainStore = useMainStore();

      await initializeUserInStoreIfAuthenticated();

      expect(mainStore.authenticatedUser).toStrictEqual(userData);
    });

    describe("[refresh access-token]", () => {
      it("calls `refreshAccessTokenAndSaveExpiryToLocalStorage` if there is no `ACCESS_TOKEN_EXPIRES_AT` key in localStorage", async () => {
        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshAccessTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("calls `refreshAccessTokenAndSaveExpiryToLocalStorage` if the `ACCESS_TOKEN_EXPIRES_AT` key in localStorage points to the past", async () => {
        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          (Date.now() - 1000 * 60 * 1).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshAccessTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("calls `refreshAccessTokenAndSaveExpiryToLocalStorage` if the `ACCESS_TOKEN_EXPIRES_AT` key in localStorage points to the future (within the refresh-threshold)", async () => {
        const accessTokenRefreshThreshold = ms(
          import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          (Date.now() + accessTokenRefreshThreshold).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshAccessTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("does not call `refreshAccessTokenAndSaveExpiryToLocalStorage` if the `ACCESS_TOKEN_EXPIRES_AT` key in localStorage points to the future (not within the refresh-threshold)", async () => {
        const accessTokenRefreshThreshold = ms(
          import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          (Date.now() + accessTokenRefreshThreshold + 1000 * 60 * 1).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshAccessTokenAndSaveExpiryToLocalStorage
        ).not.toHaveBeenCalled();
      });

      it("calls `setTimeoutToRefreshAccessToken` with the correct argument", async () => {
        const accessTokenExpiresAt = Date.now() + 1000 * 60 * 15; // 15 minutes
        const accessTokenRefreshThreshold = ms(
          import.meta.env.VITE_ACCESS_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          ACCESS_TOKEN_EXPIRES_AT,
          accessTokenExpiresAt.toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(setTimeoutToRefreshAccessToken).toHaveBeenCalledOnce();

        expect(
          Math.abs(
            accessTokenExpiresAt -
              Date.now() -
              accessTokenRefreshThreshold -
              (setTimeoutToRefreshAccessToken as ReturnType<typeof vi.fn>).mock
                .calls[0][0]
          )
        ).toBeLessThanOrEqual(1000 * 1);
      });
    });

    describe("[refresh refresh-token]", () => {
      it("calls `refreshRefreshTokenAndSaveExpiryToLocalStorage` if there is no `REFRESH_TOKEN_EXPIRES_AT` key in localStorage", async () => {
        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshRefreshTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("calls `refreshRefreshTokenAndSaveExpiryToLocalStorage` if the `REFRESH_TOKEN_EXPIRES_AT` key in localStorage points to the past", async () => {
        localStorage.setItem(
          REFRESH_TOKEN_EXPIRES_AT,
          (Date.now() - 1000 * 60 * 1).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshRefreshTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("calls `refreshRefreshTokenAndSaveExpiryToLocalStorage` if the `REFRESH_TOKEN_EXPIRES_AT` key in localStorage points to the future (within the refresh-threshold)", async () => {
        const refreshTokenRefreshThreshold = ms(
          import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          REFRESH_TOKEN_EXPIRES_AT,
          (Date.now() + refreshTokenRefreshThreshold).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshRefreshTokenAndSaveExpiryToLocalStorage
        ).toHaveBeenCalledOnce();
      });

      it("does not call `refreshRefreshTokenAndSaveExpiryToLocalStorage` if the `REFRESH_TOKEN_EXPIRES_AT` key in localStorage points to the future (not within the refresh-threshold)", async () => {
        const refreshTokenRefreshThreshold = ms(
          import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          REFRESH_TOKEN_EXPIRES_AT,
          (Date.now() + refreshTokenRefreshThreshold + 1000 * 60 * 1).toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(
          refreshRefreshTokenAndSaveExpiryToLocalStorage
        ).not.toHaveBeenCalled();
      });

      it("calls `setTimeoutToRefreshRefreshToken` with the correct argument", async () => {
        const refreshTokenExpiresAt = Date.now() + 1000 * 60 * 60 * 24 * 7; // 7 days
        const refreshTokenRefreshThreshold = ms(
          import.meta.env.VITE_REFRESH_TOKEN_REFRESH_THRESHOLD
        );

        localStorage.setItem(
          REFRESH_TOKEN_EXPIRES_AT,
          refreshTokenExpiresAt.toString()
        );

        await initializeUserInStoreIfAuthenticated();

        expect(setTimeoutToRefreshAccessToken).toHaveBeenCalledOnce();

        expect(
          Math.abs(
            refreshTokenExpiresAt -
              Date.now() -
              refreshTokenRefreshThreshold -
              (setTimeoutToRefreshRefreshToken as ReturnType<typeof vi.fn>).mock
                .calls[0][0]
          )
        ).toBeLessThanOrEqual(1000 * 1);
      });
    });
  });
});
