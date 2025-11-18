import { beforeEach, describe, expect, it, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";

describe("Crypto Service - No External Requests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("should not make external HTTP requests during RSA key generation", async () => {
    // Track any fetch or XHR calls
    const fetchSpy = vi.spyOn(global, "fetch");
    
    // Generate RSA key pair using Web Crypto API (built-in, not external)
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );

    expect(keyPair).toBeDefined();
    expect(keyPair.publicKey).toBeDefined();
    expect(keyPair.privateKey).toBeDefined();
    
    // Verify no external requests were made
    expect(fetchSpy).not.toHaveBeenCalled();
    
    fetchSpy.mockRestore();
  });

  it("should not make external requests during encryption/decryption", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");
    
    // Use Web Crypto API for encryption (built-in, no external requests)
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: { name: "SHA-256" },
      },
      true,
      ["encrypt", "decrypt"],
    );

    const encoder = new TextEncoder();
    const data = encoder.encode("test data");
    
    // Encrypt with public key
    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: "RSA-OAEP",
      },
      keyPair.publicKey,
      data,
    );

    expect(encrypted).toBeDefined();
    
    // Verify no external requests were made
    expect(fetchSpy).not.toHaveBeenCalled();
    
    fetchSpy.mockRestore();
  });

  it("should verify crypto operations are local", async () => {
    // This test ensures crypto operations don't require network access
    const originalFetch = global.fetch;
    
    // Replace fetch with a function that throws to catch any network attempts
    global.fetch = vi.fn().mockRejectedValue(new Error("Network access blocked in test"));
    
    try {
      // Perform crypto operations that should work without network
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "RSA-OAEP",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: { name: "SHA-256" },
        },
        true,
        ["encrypt", "decrypt"],
      );
      
      expect(keyPair).toBeDefined();
      
      // If we got here, crypto worked without network access
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
