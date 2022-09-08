import { AxiosError, type AxiosResponse } from "axios";
import { describe, expect, it } from "vitest";
import { nonThrowableServerRequest } from "./helpers";

describe(nonThrowableServerRequest.name, () => {
  it("returns the result of the provided callback", async () => {
    const callbackResult = { hello: "world" };
    const callback = () =>
      Promise.resolve({ data: callbackResult } as unknown as AxiosResponse<
        typeof callbackResult
      >);

    expect(nonThrowableServerRequest(callback)).resolves.toStrictEqual({
      result: callbackResult,
      errors: null,
    });
  });

  it("returns a generic error message if the exception thrown is does not have a proper message", async () => {
    const callback = () => {
      throw "Something wrong happened.";
    };

    expect(nonThrowableServerRequest(callback)).resolves.toStrictEqual({
      result: null,
      errors: ["An error occured."],
    });
  });

  it("returns the thrown error's message if it is not an instance of AxiosError", async () => {
    const errorMessage = "Something wrong happened.";
    const callback = () => {
      throw new Error(errorMessage);
    };

    expect(nonThrowableServerRequest(callback)).resolves.toStrictEqual({
      result: null,
      errors: [errorMessage],
    });
  });

  it("returns any provided AxiosError response error-messages (array) if found", async () => {
    const errorMessages = ["Error #1", "Error #2"];
    const callback = () => {
      throw new AxiosError(undefined, undefined, undefined, undefined, {
        data: { message: errorMessages },
      } as AxiosResponse);
    };

    expect(nonThrowableServerRequest(callback)).resolves.toStrictEqual({
      result: null,
      errors: errorMessages,
    });
  });
});
