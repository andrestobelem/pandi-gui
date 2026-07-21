import { describe, expect, it } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { DeterministicAgentEngine } from "./deterministic-agent-engine";

describe("deterministic agent engine", () => {
  it("streams a response through the agent engine contract", async () => {
    const engine = new DeterministicAgentEngine();
    const events: AgentHostEvent[] = [];
    engine.subscribe((event) => events.push(event));

    await engine.prompt("Hello");

    expect(events).toEqual([
      { version: 1, type: "agent.started" },
      {
        version: 1,
        type: "tool.started",
        id: "deterministic-read",
        name: "read",
        input: '{"path":"README.md"}',
      },
      {
        version: 1,
        type: "tool.completed",
        id: "deterministic-read",
        name: "read",
        result: "# Pandi GUI",
        isError: false,
      },
      { version: 1, type: "message.delta", text: "Echo: " },
      { version: 1, type: "message.delta", text: "Hello" },
      { version: 1, type: "agent.settled" },
    ]);
  });

  it("settles without further deltas when aborted", async () => {
    const engine = new DeterministicAgentEngine(100);
    const events: AgentHostEvent[] = [];
    engine.subscribe((event) => events.push(event));

    const prompt = engine.prompt("Hello");
    await engine.abort();
    await prompt;

    expect(events).toEqual([
      { version: 1, type: "agent.started" },
      { version: 1, type: "agent.settled" },
    ]);
  });
});
