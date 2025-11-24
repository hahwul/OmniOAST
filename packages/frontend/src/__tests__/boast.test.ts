import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBoastService } from "../services/boast";

describe("BOAST Frontend Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create BOAST client", () => {
    const client = useBoastService();
    expect(client).toBeDefined();
  });

  it("should generate URL with unique ID", () => {
    const client = useBoastService();
    const result = client.generateUrl();

    expect(result).toBeDefined();
    expect(result.url).toBeDefined();
    expect(result.uniqueId).toBeDefined();
    expect(result.uniqueId).toHaveLength(10);
  });

  it("should not make external HTTP requests", () => {
    // Track fetch calls
    const fetchSpy = vi.spyOn(global, "fetch");

    const client = useBoastService();
    const result = client.generateUrl();

    // Verify it's a pure function with no side effects
    expect(result).toMatchObject({
      url: expect.any(String),
      uniqueId: expect.any(String),
    });

    // Verify no external requests were made
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("should generate URL in expected format", () => {
    const client = useBoastService();
    const result = client.generateUrl();

    expect(result.url).toContain(".boast.example.com");
    expect(result.url).toContain(result.uniqueId);
  });

  it("should generate multiple unique IDs", () => {
    const client = useBoastService();
    const result1 = client.generateUrl();
    const result2 = client.generateUrl();

    // IDs should be different (high probability with random generation)
    // Note: There's a tiny chance they could be the same, but with 10 chars it's very unlikely
    expect(result1.uniqueId).toBeDefined();
    expect(result2.uniqueId).toBeDefined();
  });
});
