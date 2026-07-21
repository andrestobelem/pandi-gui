import type { AgentHostEvent } from "../protocol/agent-protocol";

export type AgentEventListener = (event: AgentHostEvent) => void;

export interface AgentEngine {
  subscribe(listener: AgentEventListener): () => void;
  prompt(text: string): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
}
