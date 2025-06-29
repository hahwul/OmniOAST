import { sdk } from "../plugins/sdk";

export async function addBoastPublicProvider() {
  try {
    const provider = await sdk.api.createProvider({
      name: "Public BOAST",
      type: "BOAST",
      url: "https://odiss.eu:2096/events",
      token: "", // Public BOAST might not require a token, or it's handled differently
    });
    if (provider) {
      console.log("Public BOAST provider added successfully:", provider);
      return provider;
    } else {
      console.error("Failed to add public BOAST provider.");
      return null;
    }
  } catch (error) {
    console.error("Error adding public BOAST provider:", error);
    return null;
  }
}
