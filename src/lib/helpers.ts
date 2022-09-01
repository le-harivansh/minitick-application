import { AxiosError } from "axios";

/**
 * Execute the provided callback, and return its result.
 *
 * If any errors are thrown within the callback, return them in an `errors`
 * object.
 */
export async function nonThrowableRequest<T>(
  callback: () => Promise<T>
): Promise<{ result: T; errors: null } | { result: null; errors: string[] }> {
  try {
    return {
      result: await callback(),
      errors: null,
    };
  } catch (error) {
    let errors = ["An error occured."];

    if (
      error instanceof AxiosError &&
      error.response?.data &&
      error.response.data.message
    ) {
      const errorMessages: string | string[] = error.response.data.message;

      errors = Array.isArray(errorMessages) ? errorMessages : [errorMessages];
    } else if (error instanceof Error) {
      errors = [error.message];
    }

    return {
      result: null,
      errors,
    };
  }
}
