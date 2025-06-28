import { createHash } from "crypto";

export function sha256Hash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
}

export const generateID = () => {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 12).padStart(12, "0")
  );
};

export const Uint8ArrayToString = (data: Uint8Array) => {
  // Fallback to displaying as a binary string
  let output = "";
  const chunkSize = 256;
  for (let i = 0; i < data.length; i += chunkSize) {
    output += String.fromCharCode(...data.subarray(i, i + chunkSize));
  }

  return output;
};

export const isPresent = <T>(value: T | undefined): value is T => {
  return value !== undefined;
};
