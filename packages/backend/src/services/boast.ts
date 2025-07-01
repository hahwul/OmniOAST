import { OASTService } from "./provider";
import { OASTEvent } from "../../types";

// 'caido:utils'에서 필요한 클래스와 타입을 모두 import 합니다.
// 'import type'이 아닌 일반 'import'를 사용해야 합니다.
import { RequestSpec, RequestResponse } from "caido:utils";
import type { CaidoBackendSDK } from "../../types";

export class BoastService implements OASTService {
  private url: string;
  private secret: string;
  private id: string | null = null;
  private domain: string | null = null;
  private sdk: CaidoBackendSDK;
  private payloadUrl: string | null = null;

  constructor(url: string, secret: string, sdk: CaidoBackendSDK) {
    this.url = url;
    this.secret = secret;
    this.sdk = sdk;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    try {
      // Caido SDK의 RequestSpec 생성 및 헤더 설정
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`); // sdk.requests.send()를 통해 요청 전송

      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as any;
      if (!this.id && data.id) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`; // payloadUrl도 여기서 생성
        this.payloadUrl = `http://${this.domain}`;
      }

      return data.events.map((event: any) => ({
        id: event.id,
        type: "BOAST",
        destination: this.domain,
        timestamp: new Date(event.time),
        data: event,
        method: event.receiver,
        source: event.remoteAddress,
        correlationId: event.id,
        rawRequest: event.dump,
        rawResponse: event.dump,
      }));
    } catch (error) {
      this.sdk.console.error("Error fetching BOAST events:", error);
      return [];
    }
  }

  public getId(): string | null {
    return this.id;
  }

  public getDomain(): string | null {
    return this.domain;
  } // 최초 호출 시 payloadUrl을 생성해 반환

  public async registerAndGetPayload(): Promise<{
    id: string;
    payloadUrl: string;
  } | null> {
    // Secret(token)이 없으면 에러 반환
    if (!this.secret || this.secret.trim() === "") {
      this.sdk.console.error(
        "BOAST provider requires a non-empty token (Secret) for registration.",
      );
      throw new Error("BOAST provider requires a non-empty token (Secret).");
    } // 이미 payloadUrl이 있으면 바로 반환

    if (this.payloadUrl && this.id) {
      return { id: this.id!, payloadUrl: this.payloadUrl! };
    }
    try {
      // Caido SDK의 RequestSpec 생성 및 헤더 설정
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`);
      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      const data = body.toJson() as any;

      if (!data.id || !data.canary) {
        throw new Error("BOAST registration response missing id or canary");
      }

      this.id = data.id;
      const urlObj = new URL(this.url); // canary 기반 payloadUrl 생성 (http/https는 원본 url 기준)
      const protocol = urlObj.protocol === "https:" ? "https" : "http";
      this.payloadUrl = `${protocol}://${data.id}.${urlObj.hostname}`;

      return { id: this.id!, payloadUrl: this.payloadUrl! };
    } catch (err) {
      this.sdk.console.error("Error during BOAST registration:", err);
      return null;
    }
  }
}
