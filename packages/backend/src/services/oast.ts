import { OASTProvider } from "@/shared/types";
import {
  getOASTProviders as getProviders,
  saveOASTProviders,
} from "../stores/oast";
import type { SDK } from "caido:plugin";
import type { API } from "../index";

let sdkInstance: SDK<API>;

export const initOASTService = (sdk: SDK<API>) => {
  sdkInstance = sdk;
};

export const getOASTProviders = async () => {
  sdkInstance.console.log("getOASTProviders service called");
  return await getProviders();
};

export const addOASTProvider = async (provider: OASTProvider) => {
  sdkInstance.console.log("addOASTProvider service called with provider:", provider);
  try {
    const providers = await getProviders();
    sdkInstance.console.log("Current providers before adding:", providers);
    providers.push(provider);
    sdkInstance.console.log("Providers after adding:", providers);
    await saveOASTProviders(providers);
    sdkInstance.console.log("Providers saved successfully.");
    return provider;
  } catch (error) {
    sdkInstance.console.error("Error adding OAST provider:", error);
    throw error;
  }
};

export const updateOASTProvider = async (provider: OASTProvider) => {
  sdkInstance.console.log("updateOASTProvider service called with provider:", provider);
  try {
    let providers = await getProviders();
    sdkInstance.console.log("Current providers before updating:", providers);
    providers = providers.map((p) => (p.id === provider.id ? provider : p));
    sdkInstance.console.log("Providers after updating:", providers);
    await saveOASTProviders(providers);
    sdkInstance.console.log("Providers saved successfully.");
    return provider;
  } catch (error) {
    sdkInstance.console.error("Error updating OAST provider:", error);
    throw error;
  }
};

export const deleteOASTProvider = async (id: string) => {
  sdkInstance.console.log("deleteOASTProvider service called with id:", id);
  try {
    let providers = await getProviders();
    sdkInstance.console.log("Current providers before deleting:", providers);
    providers = providers.filter((p) => p.id !== id);
    sdkInstance.console.log("Providers after deleting:", providers);
    await saveOASTProviders(providers);
    sdkInstance.console.log("Providers saved successfully.");
    return { id };
  } catch (error) {
    sdkInstance.console.error("Error deleting OAST provider:", error);
    throw error;
  }
};
