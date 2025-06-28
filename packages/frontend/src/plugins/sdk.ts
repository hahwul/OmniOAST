import type { Caido } from "@caido/sdk-frontend";
import type { API } from "backend";
import type { OASTProvider, OASTHistory } from "shared/src/types";

type CaidoSDK = Caido<API>;

let _sdk: CaidoSDK | undefined = undefined;

export const initSDK = (sdkInstance: CaidoSDK) => {
  _sdk = sdkInstance;
  console.log("SDK initialized in plugins/sdk.ts:", _sdk);
};

// 오버로드 시그니처
export function call(
  method: "addOASTProvider" | "updateOASTProvider",
  arg: OASTProvider,
): Promise<OASTProvider>;
export function call(
  method: "deleteOASTProvider",
  arg: string,
): Promise<{ id: string }>;
export function call(method: "getOASTProviders"): Promise<OASTProvider[]>;
export function call(
  method: "getOASTHistory",
  arg: string,
): Promise<OASTHistory[]>;
// 실제 구현
export async function call(
  method:
    | "addOASTProvider"
    | "updateOASTProvider"
    | "deleteOASTProvider"
    | "getOASTProviders"
    | "getOASTHistory",
  arg?: any,
): Promise<any> {
  if (!_sdk) {
    console.error("SDK not initialized in call function!");
    throw new Error("SDK not available");
  }
  // Strict validation for addOASTProvider and updateOASTProvider payload
  if (method === "addOASTProvider" || method === "updateOASTProvider") {
    const p = arg as any;
    if (
      !p ||
      typeof p !== "object" ||
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      typeof p.url !== "string"
    ) {
      console.error(`call() ${method}: Invalid payload`, p);
      throw new Error(`call() ${method}: Invalid payload`);
    }
  }
  try {
    let result;
    switch (method) {
      case "addOASTProvider":
      case "updateOASTProvider":
        result = await _sdk.backend[method](arg as OASTProvider);
        break;
      case "deleteOASTProvider":
        result = await _sdk.backend[method](arg as string);
        break;
      case "getOASTProviders":
        result = await _sdk.backend[method]();
        break;
      case "getOASTHistory":
        result = await _sdk.backend[method](arg as string);
        break;
      default:
        throw new Error(`Unknown method: ${method}`);
    }
    console.log(`SDK backend call result:`, result);
    return result;
  } catch (error: unknown) {
    console.error(`SDK backend call error:`, error);
    throw error;
  }
}
