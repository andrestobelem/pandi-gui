import { describe, expect, it } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { AgentHostController } from "./agent-host-controller";
import { DeterministicAgentEngine } from "./deterministic-agent-engine";

describe("agent host wire seam", () => {
  it("dispatches a prompt command and publishes engine events", async () => {
    const events: AgentHostEvent[] = [];
    const host = new AgentHostController(
      new DeterministicAgentEngine(),
      (event) => events.push(event),
    );

    await host.receive({ version: 1, type: "prompt", text: "Hello" });

    expect(events).toEqual([
      { version: 1, type: "agent.started" },
      { version: 1, type: "message.delta", text: "Echo: " },
      { version: 1, type: "message.delta", text: "Hello" },
      { version: 1, type: "agent.settled" },
    ]);
  });
});
