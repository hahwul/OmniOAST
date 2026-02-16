import { describe, it, expect } from "vitest";
import { formatTimestamp, toNumericTimestamp } from "../utils/time";

describe("Time Utilities", () => {
  describe("formatTimestamp", () => {
    it("should format a valid Date object correctly", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(formatTimestamp(date)).toBe(date.toLocaleString());
    });

    it("should format a valid numeric timestamp correctly", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(formatTimestamp(date.getTime())).toBe(date.toLocaleString());
    });

    it("should format a valid date string correctly", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      expect(formatTimestamp(date.toISOString())).toBe(date.toLocaleString());
    });

    it("should handle invalid inputs gracefully", () => {
      expect(formatTimestamp("invalid-date")).toBe("Invalid Date");
    });
  });

  describe("toNumericTimestamp", () => {
    it("should return milliseconds from a Date object", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      const ms = date.getTime();
      expect(toNumericTimestamp(date)).toBe(ms);
    });

    it("should return the input if it is already a number", () => {
      const ms = 1672574400000;
      expect(toNumericTimestamp(ms)).toBe(ms);
    });

    it("should return milliseconds from a date string", () => {
      const date = new Date("2023-01-01T12:00:00Z");
      const ms = date.getTime();
      expect(toNumericTimestamp(date.toISOString())).toBe(ms);
    });

    it("should return NaN for invalid inputs", () => {
      expect(toNumericTimestamp("invalid-date")).toBeNaN();
    });
  });
});
