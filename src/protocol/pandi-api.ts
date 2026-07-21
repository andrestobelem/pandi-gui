import { z } from "zod";
import type { AgentHostEvent } from "./agent-protocol";

export const WORKSPACE_INFO_CHANNEL = "workspace:info";

const workspaceInfoSchema = z.object({
  version: z.literal(1),
  name: z.string().trim().min(1),
});

export type WorkspaceInfo = z.infer<typeof workspaceInfoSchema>;

export function parseWorkspaceInfo(value: unknown): WorkspaceInfo {
  return workspaceInfoSchema.parse(value);
}

export interface PandiApi {
  restore(): void;
  newSession(): void;
  prompt(text: string): void;
  abort(): void;
  subscribe(listener: (event: AgentHostEvent) => void): () => void;
  workspace(): Promise<WorkspaceInfo>;
}

declare global {
  interface Window {
    pandi: PandiApi;
  }
}
