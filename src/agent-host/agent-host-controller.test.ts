import { describe, expect, it } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { AgentHostController } from "./agent-host-controller";
import { DeterministicAgentEngine } from "./deterministic-agent-engine";

describe("agent host wire seam", () => {
  it("restores an empty deterministic Session", async () => {
    const events: AgentHostEvent[] = [];
    const host = new AgentHostController(
      new DeterministicAgentEngine(),
      (event) => events.push(event),
    );

    await host.receive({ version: 1, type: "session.restore" });

    expect(events).toEqual([
      { version: 1, type: "session.restored", runs: [] },
    ]);
  });

  it("dispatches a prompt command and publishes engine events", async () => {
    const events: AgentHostEvent[] = [];
    const host = new AgentHostController(
      new DeterministicAgentEngine(),
      (event) => events.push(event),
    );

    await host.receive({ version: 1, type: "prompt", text: "Hello" });

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
});
