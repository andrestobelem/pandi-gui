import type { AgentEngine, AgentEventListener } from "./agent-engine";

export interface PiSessionPort {
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

  #emit(event: Parameters<AgentEventListener>[0]): void {
    for (const listener of this.#listeners) {
      listener(event);
    }
  }
}

async function createPiSession(workspace: string): Promise<PiSessionPort> {
  const { createAgentSession, SessionManager } = await import(
    "@earendil-works/pi-coding-agent"
  );
  const { session } = await createAgentSession({
    cwd: workspace,
    sessionManager: SessionManager.create(workspace),
  });

  return {
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
