import { join } from "node:path";
import {
  AGENT_TOOL_ID_MAX_LENGTH,
  AGENT_TOOL_NAME_MAX_LENGTH,
  AGENT_TOOL_TEXT_MAX_LENGTH,
  type AgentHostEvent,
  type TranscriptRun,
} from "../protocol/agent-protocol";
import type { AgentEngine, AgentEventListener } from "./agent-engine";
import { continueWorkspaceSession } from "./workspace-session";

export interface PiSessionPort {
  activeBranch(): unknown[];
  subscribe(listener: (event: unknown) => void): () => void;
  prompt(text: string): Promise<void>;
  abort(): Promise<void>;
  dispose(): void;
}

type PiSessionFactory = (workspace: string) => Promise<PiSessionPort>;

export class PiAgentEngine implements AgentEngine {
  readonly #listeners = new Set<AgentEventListener>();
  readonly #workspace: string;
  readonly #createSession: PiSessionFactory;
  #sessionPromise?: Promise<PiSessionPort>;
  #unsubscribeFromSession?: () => void;

  constructor(
    workspace: string,
    createSession: PiSessionFactory = createPiSession,
  ) {
    this.#workspace = workspace;
    this.#createSession = createSession;
  }

  subscribe(listener: AgentEventListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async restore(): Promise<TranscriptRun[]> {
    return restoredTranscript((await this.#session()).activeBranch());
  }

  async prompt(text: string): Promise<void> {
    const session = await this.#session();

    try {
      await session.prompt(text);
    } catch (error) {
      this.#emit({
        version: 1,
        type: "agent.failed",
        message: error instanceof Error ? error.message : String(error),
      });
      this.#emit({ version: 1, type: "agent.settled" });
    }
  }

  async abort(): Promise<void> {
    if (this.#sessionPromise) {
      await (await this.#sessionPromise).abort();
    }
  }

  async dispose(): Promise<void> {
    this.#unsubscribeFromSession?.();
    if (this.#sessionPromise) {
      (await this.#sessionPromise).dispose();
    }
    this.#listeners.clear();
  }

  async #session(): Promise<PiSessionPort> {
    if (!this.#sessionPromise) {
      this.#sessionPromise = this.#createSession(this.#workspace);
      const session = await this.#sessionPromise;
      this.#unsubscribeFromSession = session.subscribe((event) => {
        this.#receivePiEvent(event);
      });
    }

    return this.#sessionPromise;
  }

  #receivePiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;

    if (event.type === "agent_start") {
      this.#emit({ version: 1, type: "agent.started" });
      return;
    }

    if (event.type === "agent_settled") {
      this.#emit({ version: 1, type: "agent.settled" });
      return;
    }

    if (
      event.type === "tool_execution_start" &&
      typeof event.toolCallId === "string" &&
      typeof event.toolName === "string"
    ) {
      this.#emit({
        version: 1,
        type: "tool.started",
        id: boundedToolIdentifier(event.toolCallId, AGENT_TOOL_ID_MAX_LENGTH),
        name: boundedToolIdentifier(event.toolName, AGENT_TOOL_NAME_MAX_LENGTH),
        input: toolInputText(event.args),
      });
      return;
    }

    if (
      event.type === "tool_execution_end" &&
      typeof event.toolCallId === "string" &&
      typeof event.toolName === "string" &&
      typeof event.isError === "boolean"
    ) {
      this.#emit({
        version: 1,
        type: "tool.completed",
        id: boundedToolIdentifier(event.toolCallId, AGENT_TOOL_ID_MAX_LENGTH),
        name: boundedToolIdentifier(event.toolName, AGENT_TOOL_NAME_MAX_LENGTH),
        result: toolResultText(event.result),
        isError: event.isError,
      });
      return;
    }

    if (
      event.type === "message_update" &&
      isRecord(event.assistantMessageEvent) &&
      event.assistantMessageEvent.type === "text_delta" &&
      typeof event.assistantMessageEvent.delta === "string"
    ) {
      this.#emit({
        version: 1,
        type: "message.delta",
        text: event.assistantMessageEvent.delta,
      });
    }
  }

  #emit(event: AgentHostEvent): void {
    for (const listener of this.#listeners) {
      listener(event);
    }
  }
}

function restoredTranscript(entries: unknown[]): TranscriptRun[] {
  const runs: TranscriptRun[] = [];
  const pendingTools = new Map<TranscriptRun, Set<string>>();
  let currentRun: TranscriptRun | undefined;

  for (const entry of entries) {
    if (!isRecord(entry) || entry.type !== "message") continue;
    const message = entry.message;
    if (!isRecord(message) || typeof message.role !== "string") continue;

    if (message.role === "user") {
      currentRun = {
        prompt: messageContentText(message.content),
        items: [],
        status: "failed",
        error: "Run did not settle before Pandi stopped",
      };
      runs.push(currentRun);
      pendingTools.set(currentRun, new Set());
      continue;
    }

    if (!currentRun) continue;

    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (const content of message.content) {
        if (!isRecord(content) || typeof content.type !== "string") continue;
        if (content.type === "text" && typeof content.text === "string") {
          appendRestoredResponse(currentRun, content.text);
        } else if (
          content.type === "toolCall" &&
          typeof content.id === "string" &&
          typeof content.name === "string"
        ) {
          const id = boundedToolIdentifier(
            content.id,
            AGENT_TOOL_ID_MAX_LENGTH,
          );
          currentRun.items.push({
            type: "tool",
            id,
            name: boundedToolIdentifier(
              content.name,
              AGENT_TOOL_NAME_MAX_LENGTH,
            ),
            input: toolInputText(content.arguments),
            result: "Tool execution did not complete",
            isError: true,
          });
          pendingTools.get(currentRun)?.add(id);
        }
      }
      if (message.stopReason === "error") {
        currentRun.status = "failed";
        currentRun.error =
          typeof message.errorMessage === "string"
            ? message.errorMessage
            : "Coding Agent failed";
      } else if (
        message.stopReason === "stop" ||
        message.stopReason === "length" ||
        message.stopReason === "aborted"
      ) {
        currentRun.status = "settled";
        currentRun.error = undefined;
      }
      continue;
    }

    if (
      message.role === "toolResult" &&
      typeof message.toolCallId === "string" &&
      typeof message.isError === "boolean"
    ) {
      const completedId = completeRestoredTool(currentRun, message);
      if (completedId) pendingTools.get(currentRun)?.delete(completedId);
    }
  }

  for (const [run, pendingIds] of pendingTools) {
    if (pendingIds.size > 0) {
      run.status = "failed";
      run.error ??= "Run did not settle before Pandi stopped";
    }
  }

  return runs;
}

function messageContentText(content: unknown): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";

  return content
    .filter(
      (item): item is Record<string, unknown> =>
        isRecord(item) && item.type === "text" && typeof item.text === "string",
    )
    .map((item) => String(item.text))
    .join("\n");
}

function appendRestoredResponse(run: TranscriptRun, text: string): void {
  const latest = run.items.at(-1);
  if (latest?.type === "response") {
    latest.text += text;
    return;
  }
  run.items.push({ type: "response", text });
}

function completeRestoredTool(
  run: TranscriptRun,
  message: Record<string, unknown>,
): string | undefined {
  const toolCallId = boundedToolIdentifier(
    String(message.toolCallId),
    AGENT_TOOL_ID_MAX_LENGTH,
  );
  for (let index = run.items.length - 1; index >= 0; index -= 1) {
    const item = run.items[index];
    if (item?.type === "tool" && item.id === toolCallId) {
      item.result = toolResultText({ content: message.content });
      item.isError = message.isError === true;
      return toolCallId;
    }
  }
  return undefined;
}

function boundedToolIdentifier(text: string, maxLength: number): string {
  return text.slice(0, maxLength);
}

function boundedToolText(text: string): string {
  if (text.length <= AGENT_TOOL_TEXT_MAX_LENGTH) return text;

  const marker = "\n… [truncated]";
  return `${text.slice(0, AGENT_TOOL_TEXT_MAX_LENGTH - marker.length)}${marker}`;
}

function serializedToolValue(value: unknown): string {
  if (typeof value === "string") return boundedToolText(value);

  try {
    return boundedToolText(JSON.stringify(value) ?? String(value));
  } catch {
    return boundedToolText(String(value));
  }
}

function toolInputText(args: unknown): string {
  return serializedToolValue(args);
}

function toolResultText(result: unknown): string {
  if (isRecord(result) && Array.isArray(result.content)) {
    const content = result.content.map((item) => {
      if (
        isRecord(item) &&
        item.type === "text" &&
        typeof item.text === "string"
      ) {
        return item.text;
      }
      if (isRecord(item) && item.type === "image") {
        return "[Image content omitted]";
      }
      return serializedToolValue(item);
    });
    return boundedToolText(content.join("\n"));
  }

  return serializedToolValue(result);
}

async function createPiSession(workspace: string): Promise<PiSessionPort> {
  const {
    createAgentSession,
    DefaultResourceLoader,
    getAgentDir,
    SessionManager,
    SettingsManager,
  } = await import("@earendil-works/pi-coding-agent");
  const agentDir = getAgentDir();
  const settingsManager = SettingsManager.create(workspace, agentDir);
  const resourceLoader = new DefaultResourceLoader({
    agentDir,
    cwd: workspace,
    noExtensions: true,
    noPromptTemplates: true,
    noSkills: true,
    noThemes: true,
    settingsManager,
  });
  await resourceLoader.reload();

  const { session } = await createAgentSession({
    agentDir,
    cwd: workspace,
    tools: ["read"],
    resourceLoader,
    sessionManager: continueWorkspaceSession(
      SessionManager,
      workspace,
      process.env.PANDI_SESSION_ROOT ?? join(agentDir, "pandi-sessions"),
    ),
    settingsManager,
  });

  return {
    activeBranch() {
      return session.sessionManager.getBranch();
    },
    subscribe(listener) {
      return session.subscribe((event) => listener(event));
    },
    prompt(text) {
      return session.prompt(text);
    },
    abort() {
      return session.abort();
    },
    dispose() {
      session.dispose();
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
