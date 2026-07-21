import type { TranscriptRun } from "../protocol/agent-protocol";
import type { AgentEngine, AgentEventListener } from "./agent-engine";

export class DeterministicAgentEngine implements AgentEngine {
  readonly #listeners = new Set<AgentEventListener>();
  readonly #delayMs: number;
  #activeController?: AbortController;

  constructor(delayMs = 0) {
    this.#delayMs = delayMs;
  }

  subscribe(listener: AgentEventListener): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async restore(): Promise<TranscriptRun[]> {
    return [];
  }

  async prompt(text: string): Promise<void> {
    const controller = new AbortController();
    this.#activeController = controller;
    this.#emit({ version: 1, type: "agent.started" });

    try {
      await wait(this.#delayMs, controller.signal);
      if (controller.signal.aborted) return;
      this.#emit({
        version: 1,
        type: "tool.started",
        id: "deterministic-read",
        name: "read",
        input: '{"path":"README.md"}',
      });

      await wait(this.#delayMs, controller.signal);
      if (controller.signal.aborted) return;
      this.#emit({
        version: 1,
        type: "tool.completed",
        id: "deterministic-read",
        name: "read",
        result: "# Pandi GUI",
        isError: false,
      });
      this.#emit({ version: 1, type: "message.delta", text: "Echo: " });

      await wait(this.#delayMs, controller.signal);
      if (controller.signal.aborted) return;
      this.#emit({ version: 1, type: "message.delta", text });
    } finally {
      if (this.#activeController === controller) {
        this.#activeController = undefined;
      }
      this.#emit({ version: 1, type: "agent.settled" });
    }
  }

  async abort(): Promise<void> {
    this.#activeController?.abort();
  }

  async dispose(): Promise<void> {
    await this.abort();
    this.#listeners.clear();
  }

  #emit(event: Parameters<AgentEventListener>[0]): void {
    for (const listener of this.#listeners) {
      listener(event);
    }
  }
}

function wait(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
  });
}
