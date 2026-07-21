import {
  type AgentHostEvent,
  parseAgentHostCommand,
} from "../protocol/agent-protocol";
import type { AgentEngine } from "./agent-engine";

export class AgentHostController {
  readonly #unsubscribe: () => void;

  constructor(
    private readonly engine: AgentEngine,
    private readonly publish: (event: AgentHostEvent) => void,
  ) {
    this.#unsubscribe = engine.subscribe(publish);
  }

  async receive(value: unknown): Promise<void> {
    const command = parseAgentHostCommand(value);

    if (command.type === "prompt") {
      await this.engine.prompt(command.text);
      return;
    }

    if (command.type === "abort") {
      await this.engine.abort();
      return;
    }

    if (command.type === "session.restore") {
      this.publish({
        version: 1,
        type: "session.restored",
        runs: await this.engine.restore(),
      });
      return;
    }

    await this.engine.newSession();
    this.publish({ version: 1, type: "session.created" });
  }

  async dispose(): Promise<void> {
    this.#unsubscribe();
    await this.engine.dispose();
  }
}
