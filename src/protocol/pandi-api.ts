import type { AgentHostEvent } from "./agent-protocol";

export interface PandiApi {
  prompt(text: string): void;
  abort(): void;
  subscribe(listener: (event: AgentHostEvent) => void): () => void;
}

declare global {
  interface Window {
    pandi: PandiApi;
  }
}
