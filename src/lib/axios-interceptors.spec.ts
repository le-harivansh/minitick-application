import axios, { AxiosError } from "axios";
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
import { retryUnauthorizedRequestsAfterRefreshingAccessToken } from "./axios-interceptors";
import { ACCESS_TOKEN_EXPIRES_AT } from "./constants";

describe(retryUnauthorizedRequestsAfterRefreshingAccessToken.name, () => {
  const server = setupServer();

  const interceptor = vi.fn(
    retryUnauthorizedRequestsAfterRefreshingAccessToken()
  );

  let interceptorId: number;

  beforeAll(() => {
    server.listen();
    interceptorId = axios.interceptors.response.use(undefined, interceptor);
  });

  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    server.resetHandlers();
    vi.restoreAllMocks();
    vi.clearAllTimers();
  });

  afterAll(() => {
    server.close();
    axios.interceptors.response.eject(interceptorId);
  });

  it("calls the interceptor only once; does not attempt to refresh the access-token, and throws the original error if the http-status of the response is not 401", async () => {
    const routeError = {
      statusCode: 404,
      message: "Invalid route.",
      error: "Not Found Error",
    };

    server.use(
      rest.get("/invalid-route", (_, response, context) =>
        response(context.status(404), context.json(routeError))
      )
    );

    vi.spyOn(axios, "get");

    try {
      await axios.get("/invalid-route");
    } catch (error) {
      if (error instanceof AxiosError) {
        expect(interceptor).toHaveBeenCalledOnce();
        expect(axios.get).not.toHaveBeenCalledWith("/refresh/access-token");
        expect(error.response?.status).toBe(404);
        expect(error.response?.data).toStrictEqual(routeError);
      }
    }
  });

  it("re-attempts the original request after refreshing the access-token if the request initially fails with a http-status of 401 - but the access-token is successfully refreshed", async () => {
    const responseBody = { success: true };
    let isForbidden = true;

    server.use(
      rest.get("/refresh/access-token", (_, response, context) => {
        isForbidden = false;

        return response(
          context.status(204),
          context.json({ expiresAt: Date.now() })
        );
      })
    );

    server.use(
      rest.get("/retry-route", (_, response, context) => {
        if (isForbidden) {
          return response(context.status(401));
        }

        return response(context.status(200), context.json(responseBody));
      })
    );

    const response = await axios.get("/retry-route");

    expect(interceptor).toHaveBeenCalledOnce();
    expect(response.data).toStrictEqual(responseBody);
  });

  it("saves the newly retrieved access-token expiration in localStorage, and the new timer-id the store", async () => {
    let isForbidden = true;
    const accessTokenExpiresAt = Date.now() + 1000 * 60 * 15;

    server.use(
      rest.get("/refresh/access-token", (_, response, context) => {
        isForbidden = false;

        return response(
          context.status(204),
          context.json({ expiresAt: accessTokenExpiresAt })
        );
      })
    );

    server.use(
      rest.get("/retry-route", (_, response, context) => {
        if (isForbidden) {
          return response(context.status(401));
        }

        return response(context.status(200));
      })
    );

    const mainStore = useMainStore();

    expect(mainStore.tokenTimers.accessToken).toBeNull();

    await axios.get("/retry-route");

    expect(mainStore.tokenTimers.accessToken).not.toBeNull();
    expect(localStorage.getItem(ACCESS_TOKEN_EXPIRES_AT)).toBe(
      accessTokenExpiresAt.toString()
    );
  });

  it("calls the interceptor twice before throwing the original error - if the request fails with a http-status of 401, and the access-token refresh fails", async () => {
    const routeError = {
      statusCode: 401,
      message: "Unauthorized.",
      error: "Unauthorized",
    };

    server.use(
      rest.get("/refresh/access-token", (_, response, context) =>
        response(context.status(401))
      )
    );

    server.use(
      rest.post("/secret", (_, response, context) =>
        response(context.status(401), context.json(routeError))
      )
    );

    try {
      await axios.post("/secret");
    } catch (error) {
      if (!(error instanceof AxiosError)) {
        throw new Error("A non-AxiosError was thrown.");
      }

      expect(interceptor).toBeCalledTimes(2);
      expect(error.response?.status).toBe(401);
      expect(error.response?.data).toStrictEqual(routeError);
    }
  });

  it.each<{ method: "get" | "post"; route: string }>([
    { method: "post", route: "/login" },
    { method: "get", route: "/refresh/access-token" },
    { method: "get", route: "/refresh/refresh-token" },
  ])(
    "should not attempt to refresh the access-token if the captured response's route is in the route-blacklist [$method $route]",
    async ({ method, route }) => {
      vi.spyOn(axios, "get");

      server.use(
        rest[method](route, (_, response, context) =>
          response(context.status(401))
        )
      );

      try {
        await axios[method](route);
      } catch (error) {
        if (route === "/refresh/access-token") {
          expect(axios.get).toHaveBeenCalledOnce();
        } else {
          expect(axios.get).not.toHaveBeenCalledWith("/refresh/access-token");
        }
      }
    }
  );
});
