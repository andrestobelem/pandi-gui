import { describe, expect, it } from "vitest";
import {
  AGENT_TOOL_ID_MAX_LENGTH,
  AGENT_TOOL_NAME_MAX_LENGTH,
  AGENT_TOOL_TEXT_MAX_LENGTH,
  type AgentHostEvent,
  parseAgentHostEvent,
} from "../protocol/agent-protocol";
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
          type: "tool_execution_start",
          toolCallId: "read-1",
          toolName: "read",
          args: { path: "README.md" },
        });
        listener({
          type: "tool_execution_end",
          toolCallId: "read-1",
          toolName: "read",
          result: { content: [{ type: "text", text: "# Pandi GUI" }] },
          isError: false,
        });
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
      {
        version: 1,
        type: "tool.started",
        id: "read-1",
        name: "read",
        input: '{"path":"README.md"}',
      },
      {
        version: 1,
        type: "tool.completed",
        id: "read-1",
        name: "read",
        result: "# Pandi GUI",
        isError: false,
      },
      { version: 1, type: "message.delta", text: "Hello" },
      { version: 1, type: "agent.settled" },
    ]);
  });

  it("bounds textual payloads and preserves Pi tool errors", async () => {
    let listener: (event: unknown) => void = () => {};
    const oversizedId = "i".repeat(AGENT_TOOL_ID_MAX_LENGTH + 1);
    const oversizedName = "n".repeat(AGENT_TOOL_NAME_MAX_LENGTH + 1);
    const oversizedText = "x".repeat(AGENT_TOOL_TEXT_MAX_LENGTH + 1);
    const session: PiSessionPort = {
      subscribe(nextListener) {
        listener = nextListener;
        return () => {};
      },
      async prompt() {
        listener({
          type: "tool_execution_start",
          toolCallId: oversizedId,
          toolName: oversizedName,
          args: { path: oversizedText },
        });
        listener({
          type: "tool_execution_end",
          toolCallId: oversizedId,
          toolName: oversizedName,
          result: { content: [{ type: "text", text: oversizedText }] },
          isError: true,
        });
      },
      async abort() {},
      dispose() {},
    };
    const engine = new PiAgentEngine("/workspace", async () => session);
    const events: AgentHostEvent[] = [];
    engine.subscribe((event) => events.push(event));

    await engine.prompt("Read a large file");

    const [started, completed] = events;
    expect(started?.type).toBe("tool.started");
    if (started?.type !== "tool.started") throw new Error("Missing tool start");
    expect(started.id).toHaveLength(AGENT_TOOL_ID_MAX_LENGTH);
    expect(started.name).toHaveLength(AGENT_TOOL_NAME_MAX_LENGTH);
    expect(started.input).toHaveLength(AGENT_TOOL_TEXT_MAX_LENGTH);
    expect(parseAgentHostEvent(started)).toEqual(started);

    expect(completed?.type).toBe("tool.completed");
    if (completed?.type !== "tool.completed") {
      throw new Error("Missing tool completion");
    }
    expect(completed.id).toHaveLength(AGENT_TOOL_ID_MAX_LENGTH);
    expect(completed.name).toHaveLength(AGENT_TOOL_NAME_MAX_LENGTH);
    expect(completed.result).toHaveLength(AGENT_TOOL_TEXT_MAX_LENGTH);
    expect(completed.result).toContain("[truncated]");
    expect(completed.isError).toBe(true);
    expect(parseAgentHostEvent(completed)).toEqual(completed);
  });
});
