import type {
  AgentHostEvent,
  SessionSummary,
  TranscriptRun,
} from "../protocol/agent-protocol";

export type AgentEventListener = (event: AgentHostEvent) => void;

export interface AgentEngine {
  subscribe(listener: AgentEventListener): () => void;
  restore(): Promise<TranscriptRun[]>;
  newSession(): Promise<void>;
  listSessions(): Promise<SessionSummary[]>;
  openSession(id: string): Promise<TranscriptRun[]>;
  prompt(text: string): Promise<void>;
  abort(): Promise<void>;
  dispose(): Promise<void>;
}
