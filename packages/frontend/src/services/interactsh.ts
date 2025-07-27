import axios, { type AxiosInstance } from "axios";
import { ref, type Ref } from "vue";

import { useCryptoService } from "@/services/crypto";
import { tryCatch } from "@/utils/try-catch";
import { generateRandomString } from "@/utils/utils";

/**
 * Enum representing the possible states of the Interactsh client
 */
enum State {
  Idle,
  Polling,
  Closed,
}

/**
 * Configuration options for the Interactsh client
 */
interface Options {
  serverURL: string;
  token: string;
  correlationIdLength?: number;
  correlationIdNonceLength?: number;
  httpClient?: AxiosInstance;
  sessionInfo?: SessionInfo;
  keepAliveInterval?: number;
}

/**
 * Session information for restoring a previous Interactsh session
 */
interface SessionInfo {
  serverURL: string;
  token: string;
  privateKey: string;
  correlationID: string;
  secretKey: string;
  publicKey?: string;
}

class InteractshClient {
  private state: Ref<State>;
  private correlationID: Ref<string | undefined>;
  private secretKey: Ref<string | undefined>;
  private serverURL: Ref<URL | undefined>;
  private token: Ref<string | undefined>;
  private quitPollingFlag: Ref<boolean>;
  private pollingInterval: Ref<number>;
  private cryptoService = useCryptoService();

  private httpClient: AxiosInstance;
  private correlationIdNonceLength: number;
  private interactionCallback:
    | ((interaction: Record<string, unknown>) => void)
    | undefined;

  constructor() {
    this.state = ref<State>(State.Idle);
    this.correlationID = ref<string>();
    this.secretKey = ref<string>();
    this.serverURL = ref<URL>();
    this.token = ref<string>();
    this.quitPollingFlag = ref(false);
    this.pollingInterval = ref(5000);

    this.httpClient = axios.create({ timeout: 10000 });
    this.correlationIdNonceLength = 13;
    this.interactionCallback = undefined;
  }

  private defaultInteractionHandler = () => {};

  /**
   * Registers the client with the Interactsh server
   * @param serverURL URL of the Interactsh server
   * @param token Authentication token for the server
   * @param payload Registration payload containing keys and correlation ID
   */
  private async performRegistration(
    serverURL: string,
    token: string,
    payload: object,
  ) {
    const url = new URL("/register", serverURL).toString();
    const { data, error } = await tryCatch(
      this.httpClient.post(url, payload, {
        headers: { "Content-Type": "application/json", Authorization: token },
      }),
    );

    if (error) {
      console.error("Registration error:", error);
      throw new Error(
        "Registration failed, please check your server URL and token",
      );
    }

    if (data?.status !== undefined && data.status === 200) {
      this.state.value = State.Idle;
    } else {
      throw new Error("Registration failed");
    }
  }

  /**
   * Fetches interactions from the Interactsh server
   * @param callback Function to call for each interaction received
   */
  private async getInteractions(
    callback: (interaction: Record<string, unknown>) => void,
  ) {
    if (
      this.correlationID.value === undefined ||
      this.secretKey.value === undefined ||
      this.serverURL.value === undefined
    ) {
      throw new Error("Missing required client configuration");
    }

    const url = new URL(
      `/poll?id=${this.correlationID.value}&secret=${this.secretKey.value}`,
      this.serverURL.value.toString(),
    ).toString();

    const { data, error } = await tryCatch(this.httpClient.get(url));

    if (error) {
      console.error("Error polling interactions:", error);
      throw new Error("Error polling interactions");
    }

    if (data?.status !== undefined && data.status !== 200) {
      if (data?.status !== undefined && data.status === 401) {
        throw new Error("Couldn't authenticate to the server");
      }
      throw new Error(`Could not poll interactions: ${data?.data}`);
    }

    if (data?.data?.data !== undefined && Array.isArray(data.data.data)) {
      for (const item of data.data.data) {
        const { data: decryptedData, error: decryptError } = await tryCatch(
          this.cryptoService.decryptMessage(data.data.aes_key, item),
        );

        if (decryptError) {
          console.error("Failed to decrypt interaction:", decryptError);
          continue;
        }

        try {
          const interaction = JSON.parse(decryptedData.toString());
          callback(interaction);
        } catch (err) {
          console.error("Failed to parse interaction:", err);
        }
      }
    }
  }

  /**
   * Initializes the Interactsh client with the provided options
   * @param options Configuration options
   * @param interactionCallbackParam Callback for handling interactions
   */
  private async initialize(
    options: Options,
    interactionCallbackParam?: (interaction: Record<string, unknown>) => void,
  ) {
    this.httpClient =
      options.httpClient ||
      axios.create({
        timeout: 10000,
        headers: options.token ? { Authorization: options.token } : {},
      });

    this.serverURL.value = new URL(options.serverURL);
    this.token.value = options.token;

    this.correlationID.value =
      options.sessionInfo?.correlationID ||
      generateRandomString(options.correlationIdLength || 20);
    this.secretKey.value =
      options.sessionInfo?.secretKey ||
      generateRandomString(options.correlationIdNonceLength || 13);

    if (interactionCallbackParam) {
      this.interactionCallback = interactionCallbackParam;
    }

    if (options.sessionInfo !== undefined) {
      this.correlationID.value = options.sessionInfo.correlationID;
      this.secretKey.value = options.sessionInfo.secretKey;
      this.token.value = options.sessionInfo.token;
      this.serverURL.value = new URL(options.sessionInfo.serverURL);
    }

    const publicKey = await this.cryptoService.encodePublicKey();
    await this.performRegistration(
      this.serverURL.value.toString(),
      this.token.value,
      {
        "public-key": publicKey,
        "secret-key": this.secretKey.value,
        "correlation-id": this.correlationID.value,
      },
    );

    if (options.keepAliveInterval !== undefined) {
      this.pollingInterval.value = options.keepAliveInterval;
      this.startPolling(
        this.interactionCallback || this.defaultInteractionHandler,
      );
    }
  }

  /**
   * Starts polling the server for interactions
   * @param callback Function to call for each interaction received
   */
  private startPolling(
    callback: (interaction: Record<string, unknown>) => void,
  ) {
    if (this.state.value === State.Polling) {
      throw new Error("Client is already polling");
    }

    this.quitPollingFlag.value = false;
    this.state.value = State.Polling;

    const pollingLoop = async () => {
      while (!this.quitPollingFlag.value) {
        try {
          await this.getInteractions(callback);
        } catch (err) {
          console.error("Polling error:", err);
          throw new Error("Polling error");
        }
        await new Promise((resolve) =>
          setTimeout(resolve, this.pollingInterval.value),
        );
      }
    };

    pollingLoop();
  }

  /**
   * Manually polls the server once for interactions
   */
  public async poll() {
    try {
      await this.getInteractions(
        this.interactionCallback || this.defaultInteractionHandler,
      );
    } catch (err) {
      console.error("Polling error:", err);
      throw new Error("Polling error");
    }
  }

  /**
   * Stops the polling process
   */
  public stopPolling() {
    if (this.state.value !== State.Polling) {
      throw new Error("Client is not polling");
    }

    this.quitPollingFlag.value = true;
    this.state.value = State.Idle;
  }

  /**
   * Sets the polling interval in seconds
   * @param seconds Number of seconds between polls
   */
  public setRefreshTimeSecond(seconds: number) {
    if (seconds < 5 || seconds > 3600) {
      throw new Error(
        "The polling interval must be between 5 and 3600 seconds",
      );
    }
    this.pollingInterval.value = seconds * 1000;

    // Restart polling with new interval if currently polling
    if (this.state.value === State.Polling) {
      this.stopPolling();
      this.startPolling(
        this.interactionCallback || this.defaultInteractionHandler,
      );
    }
  }

  /**
   * Updates the polling interval in milliseconds
   * @param ms New polling interval in milliseconds
   */
  public updatePollingInterval(ms: number) {
    // Convert to seconds for validation
    const seconds = Math.floor(ms / 1000);
    this.setRefreshTimeSecond(seconds);
  }

  /**
   * Deregisters the client from the Interactsh server
   */
  public async close() {
    if (this.state.value === State.Polling) {
      throw new Error("Client should stop polling before closing");
    }
    if (this.state.value === State.Closed) {
      throw new Error("Client is already closed");
    }

    const url = new URL(
      "/deregister",
      this.serverURL.value?.toString(),
    ).toString();

    const { data, error } = await tryCatch(
      this.httpClient.post(
        url,
        {
          correlationID: this.correlationID.value,
          secretKey: this.secretKey.value,
        },
        { headers: { "Content-Type": "application/json" } },
      ),
    );

    if (error) {
      console.error("Failed to deregister:", error);
      throw new Error("Could not deregister from server");
    }

    if (data?.status !== undefined && data.status !== 200) {
      throw new Error(`Could not deregister from server: ${data?.data}`);
    }

    this.state.value = State.Closed;
  }

  /**
   * Starts the Interactsh client with the provided options
   * @param options Configuration options
   * @param interactionCallbackParam Callback for handling interactions
   */
  public async start(
    options: Options,
    interactionCallbackParam?: (interaction: Record<string, unknown>) => void,
  ) {
    await this.initialize(options, interactionCallbackParam);
  }

  /**
   * Stops polling and closes the client
   */
  public async stop() {
    if (this.state.value === State.Polling) {
      this.stopPolling();
    }
    await this.close();
  }

  /**
   * Generates a unique URL for the current session
   * @param incrementNumber Optional increment number for uniqueness
   * @returns A unique Interactsh URL and its unique ID
   */
  public generateUrl(incrementNumber = 0): { url: string; uniqueId: string } {
    if (
      this.state.value === State.Closed ||
      this.correlationID.value === undefined ||
      this.serverURL.value === undefined
    ) {
      return { url: "", uniqueId: "" };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const increment = incrementNumber;
    const arr = new ArrayBuffer(8);
    const view = new DataView(arr);
    view.setUint32(0, timestamp, false);
    view.setUint32(4, increment, false);
    const randomId = generateRandomString(this.correlationIdNonceLength);
    const url = `${this.correlationID.value}${randomId}.${this.serverURL.value.host}`;
    const uniqueId = `${this.correlationID.value}${randomId}`;
    return { url, uniqueId };
  }
}

/**
 * Creates and returns an Interactsh client service
 */
export function useClientService() {
  return new InteractshClient();
}
