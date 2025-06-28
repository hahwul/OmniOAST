import type { DefineAPI, SDK } from "caido:plugin";

interface OASTConfig {
  id: string;
  name: string;
  url: string;
  token: string;
}

const oastConfigs = new Map<string, OASTConfig>();

const saveOASTConfig = (sdk: SDK, config: OASTConfig) => {
  oastConfigs.set(config.id, config);
  sdk.console.log(`Saved OAST config: ${config.name} (${config.id})`);
  return true;
};

const fetchInteractions = async (sdk: SDK, oastId: string) => {
  const config = oastConfigs.get(oastId);
  if (!config) {
    sdk.console.error(`OAST config not found for ID: ${oastId}`);
    return null;
  }

  // Placeholder for Interactsh API call
  // In a real implementation, you would make an HTTP request to the Interactsh server
  // using config.url and config.token to fetch interactions.
  sdk.console.log(`Fetching interactions for OAST: ${config.name} (${config.id}) from ${config.url}`);

  try {
    // Example: Replace with actual HTTP request to Interactsh server
    const response = await fetch(`${config.url}/interactions?token=${config.token}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    sdk.console.log(`Fetched interactions: ${JSON.stringify(data)}`);
    return data;
  } catch (error) {
    sdk.console.error(`Error fetching interactions: ${error}`);
    return null;
  }
};

export type API = DefineAPI<{
  saveOASTConfig: typeof saveOASTConfig;
  fetchInteractions: typeof fetchInteractions;
}>;

export function init(sdk: SDK<API>) {
  sdk.api.register("saveOASTConfig", saveOASTConfig);
  sdk.api.register("fetchInteractions", fetchInteractions);
}