import * as CryptoJS from "crypto-js";
import { defineStore } from "pinia";

import { arrayBufferToBase64, base64ToArrayBuffer } from "@/utils/utils";

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return base64ToArrayBuffer(base64);
}

function arrayBufferToPem(buf: ArrayBuffer, label: string): string {
  const base64 = arrayBufferToBase64(buf);
  const wrapped = base64.match(/.{1,64}/g)?.join("\n") || base64;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----`;
}

export const useCryptoService = defineStore("services.crypto", () => {
  let privKey: CryptoKey | undefined = undefined;
  let pubKey: CryptoKey | undefined = undefined;
  let initialized = false;

  async function ensureKeys(): Promise<void> {
    if (initialized && privKey && pubKey) return;
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
    pubKey = keyPair.publicKey;
    privKey = keyPair.privateKey;
    initialized = true;
  }

  async function setKeyPairFromPEM(privateKeyPem: string, publicKeyPem?: string) {
    const algo = { name: "RSA-OAEP", hash: "SHA-256" } as const;
    const pkcs8 = pemToArrayBuffer(privateKeyPem);
    privKey = await window.crypto.subtle.importKey(
      "pkcs8",
      pkcs8,
      algo,
      true,
      ["decrypt"],
    );
    if (publicKeyPem) {
      const spki = pemToArrayBuffer(publicKeyPem);
      pubKey = await window.crypto.subtle.importKey(
        "spki",
        spki,
        algo,
        true,
        ["encrypt"],
      );
    } else {
      // Derive public from private by re-exporting not supported; require both, or fallback to generate
      // For safety, generate a matching public key is not possible without private->public derivation here.
      // So if no publicKeyPem provided, keep existing pubKey or regenerate pair.
      if (!pubKey) await ensureKeys();
    }
    initialized = true;
  }

  function getPrivateKey(): CryptoKey | undefined {
    return privKey;
  }

  function getPublicKey(): CryptoKey | undefined {
    return pubKey;
  }

  async function exportPublicKeyPEM(): Promise<string> {
    if (!pubKey) await ensureKeys();
    const exported = await window.crypto.subtle.exportKey("spki", pubKey as CryptoKey);
    return arrayBufferToPem(exported, "PUBLIC KEY");
  }

  async function exportPrivateKeyPEM(): Promise<string> {
    if (!privKey) await ensureKeys();
    const exported = await window.crypto.subtle.exportKey("pkcs8", privKey as CryptoKey);
    return arrayBufferToPem(exported, "PRIVATE KEY");
  }

  // Backward-compat alias
  async function encodePublicKey(): Promise<string> {
    return btoa(await exportPublicKeyPEM());
  }

  async function decryptRSA(encodedKey: string): Promise<ArrayBuffer> {
    if (!privKey) throw new Error("Private key not initialized");

    const encryptedData = base64ToArrayBuffer(encodedKey);
    return await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      encryptedData,
    );
  }

  async function decryptMessage(
    key: string,
    secureMessage: string,
  ): Promise<string> {
    if (!privKey) throw new Error("Private key is not initialized");

    const decodedKey = base64ToArrayBuffer(key);
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privKey,
      decodedKey,
    );

    const decryptedKey = CryptoJS.lib.WordArray.create(
      new Uint8Array(decryptedKeyBuffer),
    );
    const secureMessageWords = CryptoJS.enc.Base64.parse(secureMessage);

    const ivWords = CryptoJS.lib.WordArray.create(
      secureMessageWords.words.slice(0, 4),
      16,
    );

    const ciphertextWords = CryptoJS.lib.WordArray.create(
      secureMessageWords.words.slice(4),
      secureMessageWords.sigBytes - 16,
    );

    const cipherParams = CryptoJS.lib.CipherParams.create({
      ciphertext: ciphertextWords,
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, decryptedKey, {
      iv: ivWords,
      mode: CryptoJS.mode.CFB,
      padding: CryptoJS.pad.NoPadding,
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  async function decryptAES(
    key: ArrayBuffer,
    iv: ArrayBuffer,
    encryptedData: ArrayBuffer,
  ): Promise<ArrayBuffer> {
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      key,
      { name: "AES-CFB" },
      false,
      ["decrypt"],
    );

    return await window.crypto.subtle.decrypt(
      {
        name: "AES-CFB",
        iv,
      },
      aesKey,
      encryptedData,
    );
  }

  return {
    getPrivateKey,
    getPublicKey,
    exportPublicKeyPEM,
    exportPrivateKeyPEM,
    setKeyPairFromPEM,
    encodePublicKey,
    decryptRSA,
    decryptMessage,
    decryptAES,
  };
});
