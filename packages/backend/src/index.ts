import type { DefineAPI, SDK } from "caido:plugin";

const generateRandomString = (sdk: SDK, length: number) => {
  const randomString = Math.random()
    .toString(36)
    .substring(2, length + 2);
  sdk.console.log(`Generating random string: ${randomString}`);
  return randomString;
};

export type API = DefineAPI<{
  generateRandomString: typeof generateRandomString;
}>;

export function init(sdk: SDK<API>) {
  sdk.api.register("generateRandomString", generateRandomString);
}
