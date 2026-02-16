import { describe, it, expect } from "vitest";
import { tryCatch } from "../utils/try-catch";

describe("tryCatch Utility", () => {
  it("should return data on success", async () => {
    const promise = Promise.resolve("success");
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: "success", error: undefined });
  });

  it("should return error on failure", async () => {
    const error = new Error("failure");
    const promise = Promise.reject(error);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: undefined, error: error });
  });

  it("should handle resolved numbers", async () => {
    const promise = Promise.resolve(123);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: 123, error: undefined });
  });

  it("should handle resolved objects", async () => {
    const data = { foo: "bar" };
    const promise = Promise.resolve(data);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data, error: undefined });
  });

  it("should handle resolved arrays", async () => {
    const data = [1, 2, 3];
    const promise = Promise.resolve(data);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data, error: undefined });
  });

  it("should handle resolved null", async () => {
    const promise = Promise.resolve(null);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: null, error: undefined });
  });

  it("should handle rejection with string", async () => {
    const error = "string error";
    const promise = Promise.reject(error);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: undefined, error });
  });

  it("should handle rejection with object", async () => {
    const error = { message: "object error" };
    const promise = Promise.reject(error);
    const result = await tryCatch(promise);
    expect(result).toEqual({ data: undefined, error });
  });

  class CustomError extends Error {
    code: number;
    constructor(message: string, code: number) {
      super(message);
      this.code = code;
    }
  }

  it("should handle custom error classes", async () => {
    const error = new CustomError("custom error", 500);
    const promise = Promise.reject(error);
    const result = await tryCatch<unknown, CustomError>(promise);
    expect(result).toEqual({ data: undefined, error });
    expect((result.error as CustomError).code).toBe(500);
  });

  it("should work with async functions", async () => {
    const asyncFn = async () => {
      return "async result";
    };
    const result = await tryCatch(asyncFn());
    expect(result).toEqual({ data: "async result", error: undefined });
  });

  it("should catch errors thrown in async functions", async () => {
    const asyncFn = async () => {
      throw new Error("async error");
    };
    const result = await tryCatch(asyncFn());
    expect(result.data).toBeUndefined();
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toBe("async error");
  });
});
