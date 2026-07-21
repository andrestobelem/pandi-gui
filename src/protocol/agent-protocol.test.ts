import { describe, expect, it } from "vitest";
import { parseAgentHostCommand, parseAgentHostEvent } from "./agent-protocol";

describe("agent host wire protocol", () => {
  it("accepts a versioned prompt command", () => {
    const command = {
      version: 1,
      type: "prompt",
      text: "Explain this repository",
    };

    expect(parseAgentHostCommand(command)).toEqual(command);
  });

  it("accepts a versioned abort command", () => {
    const command = { version: 1, type: "abort" };

    expect(parseAgentHostCommand(command)).toEqual(command);
  });

  it("accepts an agent started event", () => {
    const event = { version: 1, type: "agent.started" };

    expect(parseAgentHostEvent(event)).toEqual(event);
  });

  it("accepts a streamed text delta event", () => {
    const event = { version: 1, type: "message.delta", text: "Hello" };

    expect(parseAgentHostEvent(event)).toEqual(event);
  });

  it("accepts an agent settled event", () => {
    const event = { version: 1, type: "agent.settled" };

    expect(parseAgentHostEvent(event)).toEqual(event);
  });

  it("accepts an agent failure event", () => {
    const event = {
      version: 1,
      type: "agent.failed",
      message: "No model configured",
    };

    expect(parseAgentHostEvent(event)).toEqual(event);
  });
});
