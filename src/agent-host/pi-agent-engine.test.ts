import { describe, expect, it } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { PiAgentEngine, type PiSessionPort } from "./pi-agent-engine";

describe("Pi agent engine adapter", () => {
  it("translates Pi session events into the application contract", async () => {
    const prompts: string[] = [];
    let listener: (event: unknown) => void = () => {};
    const session: PiSessionPort = {
      subscribe(nextListener) {
        listener = nextListener;
        return () => {};
      },
      async prompt(text) {
        prompts.push(text);
        listener({ type: "agent_start" });
        listener({
          type: "message_update",
          assistantMessageEvent: { type: "text_delta", delta: "Hello" },
        });
        listener({ type: "agent_settled" });
      },
      async abort() {},
      dispose() {},
    };
    const engine = new PiAgentEngine("/workspace", async () => session);
    const events: AgentHostEvent[] = [];
    engine.subscribe((event) => events.push(event));

    await engine.prompt("Introduce yourself");

    expect(prompts).toEqual(["Introduce yourself"]);
    expect(events).toEqual([
      { version: 1, type: "agent.started" },
      { version: 1, type: "message.delta", text: "Hello" },
      { version: 1, type: "agent.settled" },
    ]);
  });
});
