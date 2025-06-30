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
      } // --- 최종 수정된 부분 ---
      // Body 객체의 toJson() 메소드를 직접 호출하여 JSON 객체를 얻습니다.
      // 이 메소드는 동기적으로 작동하므로 await가 필요 없습니다.

      const data = body.toJson() as any; // any로 캐스팅하여 후속 코드에서 사용
      // --- 여기까지 수정 ---
      if (!this.id && data.id) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`; // payloadUrl도 여기서 생성
        this.payloadUrl = `http://${this.domain}`;
      }

      return data.events.map((event: any) => ({
        id: event.id,
        type: "BOAST",
        timestamp: new Date(event.timestamp),
        data: event,
        correlationId: event.id,
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
      // --- FIX START ---
      // `if` 조건문에서 null이 아님을 확인했으므로 `!` 연산자로 타입 단언
      return { id: this.id!, payloadUrl: this.payloadUrl! };
      // --- FIX END ---
    } // 이벤트를 한 번 불러와서 id/domain/payloadUrl을 초기화
    // 그리고 canary 값을 파싱해 payloadUrl을 생성
    // canary는 BOAST 응답에 포함됨
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
      this.payloadUrl = `${protocol}://${data.canary}.${urlObj.hostname}`;

      // --- FIX START ---
      // 이 시점에는 `this.id`와 `this.payloadUrl`에 반드시 문자열이 할당되므로
      // `!` 연산자로 타입 단언
      return { id: this.id!, payloadUrl: this.payloadUrl! };
      // --- FIX END ---
    } catch (err) {
      this.sdk.console.error("Error during BOAST registration:", err);
      return null;
    }
  }
}
