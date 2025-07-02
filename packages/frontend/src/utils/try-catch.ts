// Types for the result object with discriminated union
/**
 * Represents a successful operation with data and no error
 */
type Success<T> = {
  data: T;
  error: undefined;
};

/**
 * Represents a failed operation with an error and no data
 */
type Failure<E> = {
  data: undefined;
  error: E;
};

/**
 * Combined result type using a discriminated union to represent either success or failure
 */
type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * A utility function that wraps a promise to handle errors without try-catch blocks
 * Returns a standardized Result object with either data or error
 *
 * @param promise - The promise to be executed
 * @returns A Result object containing either the resolved data or caught error
 */
export async function tryCatch<T, E = Error>(
  promise: Promise<T>,
): Promise<Result<T, E>> {
  try {
    const data = await promise;
    return { data, error: undefined };
  } catch (error) {
    return { data: undefined, error: error as E };
  }
}
