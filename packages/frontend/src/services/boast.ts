import { useOastStore } from "@/stores/oastStore";
import { generateRandomString } from "@/utils/utils";

class BoastClient {
  private oastStore = useOastStore();

  constructor() {}

  public generateUrl(): { url: string; uniqueId: string } {
    const uniqueId = generateRandomString(10); // Example unique ID
    const url = `${uniqueId}.boast.example.com`; // Example URL

    this.oastStore.addPolling({
      id: uniqueId,
      payload: url,
      provider: "Boast",
    });

    return { url, uniqueId };
  }
}

export function useBoastService() {
  return new BoastClient();
}
