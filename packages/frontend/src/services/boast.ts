import { generateRandomString } from "@/utils/utils";

class BoastClient {
  constructor() {}

  public generateUrl(): { url: string; uniqueId: string } {
    const uniqueId = generateRandomString(10); // Example unique ID
    const url = `${uniqueId}.boast.example.com`; // Example URL
    return { url, uniqueId };
  }
}

export function useBoastService() {
  return new BoastClient();
}
