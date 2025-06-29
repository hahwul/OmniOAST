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

  constructor(url: string, secret: string, sdk: CaidoBackendSDK) {
    this.url = url;
    this.secret = secret;
    this.sdk = sdk;
  }

  public async getEvents(): Promise<OASTEvent[]> {
    try {
      // Caido SDK의 RequestSpec 생성 및 헤더 설정
      const spec = new RequestSpec(this.url);
      spec.setHeader("Authorization", `Secret ${this.secret}`);

      // sdk.requests.send()를 통해 요청 전송
      const res: RequestResponse = await this.sdk.requests.send(spec);

      if (res.response.getCode() >= 300) {
        throw new Error(`HTTP error! status: ${res.response.getCode()}`);
      }

      const body = res.response.getBody();
      if (!body) {
        throw new Error("Response body is empty");
      }

      // --- 최종 수정된 부분 ---
      // Body 객체의 toJson() 메소드를 직접 호출하여 JSON 객체를 얻습니다.
      // 이 메소드는 동기적으로 작동하므로 await가 필요 없습니다.
      const data = body.toJson() as any; // any로 캐스팅하여 후속 코드에서 사용
      // --- 여기까지 수정 ---

      if (!this.id && data.id) {
        this.id = data.id;
        const urlObj = new URL(this.url);
        this.domain = `${this.id}.${urlObj.hostname}`;
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
  }
}
