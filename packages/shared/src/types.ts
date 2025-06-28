export interface OASTProvider {
  id: string;
  name: string;
  type: "interactsh" | "boast" | "custom";
  url: string;
  token?: string;
}

export interface OASTHistory {
  id: string;
  providerId: string;
  timestamp: string;
  remoteAddress: string;
  request: string;
  response?: string;
}
