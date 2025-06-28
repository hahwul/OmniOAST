import type { Caido } from "@caido/sdk-frontend";
import type { API } from "backend";

type CaidoSDK = Caido<API>;

let _sdk: CaidoSDK | undefined = undefined;

export const initSDK = (sdkInstance: CaidoSDK) => {
  _sdk = sdkInstance;
  console.log("SDK initialized in plugins/sdk.ts:", _sdk);
};

export const call = async <T extends keyof API>(
  method: T,
  ...args: Parameters<API[T]>
): Promise<ReturnType<API[T]>> => {
  if (!_sdk) {
    console.error("SDK not initialized in call function!");
    throw new Error("SDK not available");
  }
  console.log(`Calling SDK backend method: ${String(method)}`);
  try {
    const result = (await _sdk.backend[method](...args)) as ReturnType<API[T]>;
    console.log(`SDK backend call result:`, result);
    return result;
  } catch (error: unknown) {
    console.error(`SDK backend call error:`, error);
    throw error;
  }
};
