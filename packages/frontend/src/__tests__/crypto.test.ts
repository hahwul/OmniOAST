import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Ensure localStorage is available before Pinia/Vue devtools init
if (
  typeof globalThis.localStorage === "undefined" ||
  typeof globalThis.localStorage.getItem !== "function"
) {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = String(value);
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: (index: number) => Object.keys(store)[index] || null,
      get length() {
        return Object.keys(store).length;
      },
    },
  });
}

import { useCryptoService } from "../services/crypto";
import { decryptAesCtr } from "../services/crypto";

describe("Crypto Service - No External Requests", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("should not make external HTTP requests during RSA key generation", async () => {
    const fetchSpy = vi.spyOn(global, "fetch");

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
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockRestore();
  });

  it("should verify crypto operations are local", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("Network access blocked in test"));

    try {
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
      expect(global.fetch).not.toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("encodePublicKey format", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("returns base64(PEM) for interactsh server compatibility", async () => {
    const cryptoService = useCryptoService();
    const encoded = await cryptoService.encodePublicKey();

    const decoded = atob(encoded);
    expect(decoded).toContain("-----BEGIN PUBLIC KEY-----");
    expect(decoded).toContain("-----END PUBLIC KEY-----");
  });
});

describe("NIST SP 800-38A AES-128-CTR test vectors (pure JS AES)", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  function hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  it("should correctly decrypt NIST AES-128-CTR test vectors", () => {
    // NIST SP 800-38A Section F.5.1 — CTR-AES128.Encrypt
    const key = hexToBytes("2b7e151628aed2a6abf7158809cf4f3c");
    const counter = hexToBytes("f0f1f2f3f4f5f6f7f8f9fafbfcfdfeff");

    const expectedPlaintextHex =
      "6bc1bee22e409f96e93d7e117393172a" +
      "ae2d8a571e03ac9c9eb76fac45af8e51" +
      "30c81c46a35ce411e5fbc1191a0a52ef" +
      "f69f2445df4f9b17ad2b417be66c3710";

    // NIST SP 800-38A Section F.5.1 ciphertext
    const ciphertextHex =
      "874d6191b620e3261bef6864990db6ce" +
      "9806f66b7970fdff8617187bb9fffdff" +
      "5ae4df3edbd5d35e5b4f09020db03eab" +
      "1e031dda2fbe03d1792170a0f3009cee";

    const ciphertext = hexToBytes(ciphertextHex);
    const expectedPlaintext = hexToBytes(expectedPlaintextHex);

    // Test pure JS AES-CTR directly at byte level
    const plaintext = decryptAesCtr(key, counter, ciphertext);
    expect(Array.from(plaintext)).toEqual(Array.from(expectedPlaintext));
  });
});

describe("End-to-end RSA + AES-CTR decrypt", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  /**
   * Helper: AES-CTR encrypt using Web Crypto (mirrors the server's Go cipher.NewCTR).
   */
  async function aesCtrEncrypt(
    aesKeyBytes: Uint8Array,
    iv: Uint8Array,
    plaintext: Uint8Array,
  ): Promise<Uint8Array> {
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      new Uint8Array(aesKeyBytes),
      { name: "AES-CTR" },
      false,
      ["encrypt"],
    );

    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-CTR", counter: iv, length: 128 },
      aesKey,
      plaintext,
    );

    return new Uint8Array(encrypted);
  }

  it("should encrypt and decrypt a message round-trip", async () => {
    const cryptoService = useCryptoService();
    const pubKeyEncoded = await cryptoService.encodePublicKey();

    // Parse the PEM-encoded public key (simulating what the server does)
    const pemString = atob(pubKeyEncoded);
    const derBase64 = pemString
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "");
    const pubKeyDer = Uint8Array.from(atob(derBase64), (c) =>
      c.charCodeAt(0),
    );
    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      pubKeyDer.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );

    // Generate random AES-256 key
    const aesKey = window.crypto.getRandomValues(new Uint8Array(32));

    // RSA-OAEP encrypt the AES key
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      aesKey,
    );

    // AES-CTR encrypt the plaintext (simulating Go server's cipher.NewCTR)
    const plaintext = '{"protocol":"dns","full-id":"test123.oast.fun"}';
    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const plaintextBytes = new TextEncoder().encode(plaintext);
    const ciphertextBytes = await aesCtrEncrypt(aesKey, iv, plaintextBytes);

    // Build the secure message: base64(IV + ciphertext)
    const combined = new Uint8Array(iv.length + ciphertextBytes.length);
    combined.set(iv, 0);
    combined.set(ciphertextBytes, iv.length);
    const secureMessage = btoa(String.fromCharCode(...combined));

    // Build the aes_key: base64(RSA-encrypted AES key)
    const aesKeyB64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedAesKey)),
    );

    // Decrypt using our implementation
    const decrypted = await cryptoService.decryptMessage(
      aesKeyB64,
      secureMessage,
    );

    expect(decrypted).toBe(plaintext);

    const parsed = JSON.parse(decrypted);
    expect(parsed.protocol).toBe("dns");
    expect(parsed["full-id"]).toBe("test123.oast.fun");
  });

  it("should handle plaintext with non-16-byte-aligned length", async () => {
    const cryptoService = useCryptoService();
    const pubKeyEncoded = await cryptoService.encodePublicKey();

    const pemString = atob(pubKeyEncoded);
    const derBase64 = pemString
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "");
    const pubKeyDer = Uint8Array.from(atob(derBase64), (c) =>
      c.charCodeAt(0),
    );
    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      pubKeyDer.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );

    const aesKey = window.crypto.getRandomValues(new Uint8Array(32));
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      aesKey,
    );

    // 17 bytes - NOT a multiple of 16
    const plaintext17 = '{"proto":"dns"}xx';
    expect(new TextEncoder().encode(plaintext17).length).toBe(17);

    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const plaintextBytes = new TextEncoder().encode(plaintext17);
    const ciphertextBytes = await aesCtrEncrypt(aesKey, iv, plaintextBytes);

    const combined = new Uint8Array(iv.length + ciphertextBytes.length);
    combined.set(iv, 0);
    combined.set(ciphertextBytes, iv.length);
    const secureMessage = btoa(String.fromCharCode(...combined));
    const aesKeyB64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedAesKey)),
    );

    const decrypted = await cryptoService.decryptMessage(
      aesKeyB64,
      secureMessage,
    );
    expect(decrypted).toBe(plaintext17);
  });

  it("should handle large JSON interaction data", async () => {
    const cryptoService = useCryptoService();
    const pubKeyEncoded = await cryptoService.encodePublicKey();

    const pemString = atob(pubKeyEncoded);
    const derBase64 = pemString
      .replace(/-----BEGIN PUBLIC KEY-----/, "")
      .replace(/-----END PUBLIC KEY-----/, "")
      .replace(/\s+/g, "");
    const pubKeyDer = Uint8Array.from(atob(derBase64), (c) =>
      c.charCodeAt(0),
    );
    const pubKey = await window.crypto.subtle.importKey(
      "spki",
      pubKeyDer.buffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"],
    );

    const aesKey = window.crypto.getRandomValues(new Uint8Array(32));
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      pubKey,
      aesKey,
    );

    // Realistic interactsh interaction JSON (~500 bytes)
    const interaction = JSON.stringify({
      protocol: "http",
      "unique-id": "abcdefghij1234567890abcdefghij12",
      "full-id": "abcdefghij1234567890abcdefghij12klmnopqrstuvw.oast.fun",
      "q-type": "",
      "raw-request":
        "GET / HTTP/1.1\r\nHost: abcdefghij1234567890abcdefghij12klmnopqrstuvw.oast.fun\r\nUser-Agent: curl/7.68.0\r\nAccept: */*\r\n\r\n",
      "raw-response": "HTTP/1.1 200 OK\r\nContent-Length: 0\r\n\r\n",
      "remote-address": "192.168.1.100",
      timestamp: "2026-03-13T20:43:46Z",
    });

    const iv = window.crypto.getRandomValues(new Uint8Array(16));
    const plaintextBytes = new TextEncoder().encode(interaction);
    const ciphertextBytes = await aesCtrEncrypt(aesKey, iv, plaintextBytes);

    const combined = new Uint8Array(iv.length + ciphertextBytes.length);
    combined.set(iv, 0);
    combined.set(ciphertextBytes, iv.length);
    const secureMessage = btoa(String.fromCharCode(...combined));
    const aesKeyB64 = btoa(
      String.fromCharCode(...new Uint8Array(encryptedAesKey)),
    );

    const decrypted = await cryptoService.decryptMessage(
      aesKeyB64,
      secureMessage,
    );
    expect(decrypted).toBe(interaction);
    expect(JSON.parse(decrypted).protocol).toBe("http");
  });
});
