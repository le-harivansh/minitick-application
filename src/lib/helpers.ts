import { AxiosError, type AxiosResponse } from "axios";

/**
 * Make an axios request to the server, and return the data or any errors
 * that were thrown.
 */
export async function nonThrowableServerRequest<T>(
  callback: () => Promise<AxiosResponse<T>>
): Promise<{ result: T; errors: null } | { result: null; errors: string[] }> {
  try {
    return {
      result: (await callback()).data,
      errors: null,
    };
  } catch (error) {
    let errors = ["An error occured."];

    if (
      error instanceof AxiosError &&
      error.response?.data &&
      error.response.data.message
    ) {
      errors = Array.isArray(error.response.data.message)
        ? error.response.data.message
        : [error.response.data.message];
    } else if (error instanceof Error) {
      errors = [error.message];
    }

    return {
      result: null,
      errors,
    };
  }
}
