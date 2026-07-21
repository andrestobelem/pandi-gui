import {
  type AgentHostEvent,
  parseAgentHostCommand,
} from "../protocol/agent-protocol";
import type { AgentEngine } from "./agent-engine";

export class AgentHostController {
  readonly #unsubscribe: () => void;

  constructor(
    private readonly engine: AgentEngine,
    publish: (event: AgentHostEvent) => void,
  ) {
    this.#unsubscribe = engine.subscribe(publish);
  }

  async receive(value: unknown): Promise<void> {
    const command = parseAgentHostCommand(value);

    if (command.type === "prompt") {
      await this.engine.prompt(command.text);
      return;
    }

    await this.engine.abort();
  }

  async dispose(): Promise<void> {
    this.#unsubscribe();
    await this.engine.dispose();
  }
}
