import { describe, it, expect } from "vitest";
import { generateRandomString, arrayBufferToBase64, base64ToArrayBuffer } from "../utils/utils";
import { formatTimestamp, toNumericTimestamp } from "../utils/time";
import { tryCatch } from "../utils/try-catch";

describe("Utility Functions", () => {
  describe("generateRandomString", () => {
    it("should generate a string of the specified length", () => {
      expect(generateRandomString(10)).toHaveLength(10);
      expect(generateRandomString(0)).toHaveLength(0);
      expect(generateRandomString(100)).toHaveLength(100);
    });

    it("should generate only letters when lettersOnly is true", () => {
      const result = generateRandomString(100, true);
      expect(result).toMatch(/^[a-z]+$/);
    });

    it("should generate alphanumeric characters by default", () => {
      const result = generateRandomString(1000);
      expect(result).toMatch(/^[a-z0-9]+$/);
      // It's statistically very likely to have at least one number in 1000 chars
      expect(result).toMatch(/[0-9]/);
    });

    it("should return different strings on subsequent calls", () => {
      const str1 = generateRandomString(10);
      const str2 = generateRandomString(10);
      expect(str1).not.toBe(str2);
    });
  });

  describe("Base64 Utilities", () => {
    it("should correctly encode an ArrayBuffer to Base64", () => {
      const buffer = new Uint8Array([72, 101, 108, 108, 111]).buffer; // "Hello"
      expect(arrayBufferToBase64(buffer)).toBe("SGVsbG8=");
    });

    it("should correctly decode a Base64 string to ArrayBuffer", () => {
      const base64 = "SGVsbG8=";
      const buffer = base64ToArrayBuffer(base64);
      const uint8 = new Uint8Array(buffer);
      expect(uint8).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("should handle round-trip conversion", () => {
      const originalData = new Uint8Array([0, 255, 128, 64, 32]);
      const base64 = arrayBufferToBase64(originalData.buffer);
      const decodedBuffer = base64ToArrayBuffer(base64);
      expect(new Uint8Array(decodedBuffer)).toEqual(originalData);
    });
  });

  describe("Time Utilities", () => {
    it("formatTimestamp should return a formatted string", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(formatTimestamp(date)).toBe(date.toLocaleString());
      expect(formatTimestamp(date.getTime())).toBe(date.toLocaleString());
      expect(formatTimestamp(date.toISOString())).toBe(date.toLocaleString());
    });

    it("toNumericTimestamp should return milliseconds", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      const ms = date.getTime();
      expect(toNumericTimestamp(ms)).toBe(ms);
      expect(toNumericTimestamp(date)).toBe(ms);
      expect(toNumericTimestamp(date.toISOString())).toBe(ms);
    });
  });

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
  });
});
