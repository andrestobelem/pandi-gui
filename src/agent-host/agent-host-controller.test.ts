import { describe, expect, it } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import type { AgentEngine } from "./agent-engine";
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

  it("creates a new deterministic Session", async () => {
    const events: AgentHostEvent[] = [];
    const host = new AgentHostController(
      new DeterministicAgentEngine(),
      (event) => events.push(event),
    );

    await host.receive({ version: 1, type: "session.new" });

    expect(events).toEqual([{ version: 1, type: "session.created" }]);
  });

  it("lists and opens a persisted Workspace Session", async () => {
    const events: AgentHostEvent[] = [];
    const engine = {
      subscribe() {
        return () => {};
      },
      async restore() {
        return [];
      },
      async newSession() {},
      async listSessions() {
        return [
          {
            id: "session-1",
            title: "Inspect the repository",
            modifiedAt: "2026-03-22T12:00:00.000Z",
            isActive: false,
          },
        ];
      },
      async openSession() {
        return [
          {
            prompt: "Inspect the repository",
            items: [],
            status: "settled" as const,
          },
        ];
      },
      async prompt() {},
      async abort() {},
      async dispose() {},
    } as AgentEngine;
    const host = new AgentHostController(engine, (event) => events.push(event));

    await host.receive({ version: 1, type: "session.list" });
    await host.receive({ version: 1, type: "session.open", id: "session-1" });

    expect(events).toEqual([
      {
        version: 1,
        type: "sessions.listed",
        sessions: [
          {
            id: "session-1",
            title: "Inspect the repository",
            modifiedAt: "2026-03-22T12:00:00.000Z",
            isActive: false,
          },
        ],
      },
      {
        version: 1,
        type: "session.opened",
        id: "session-1",
        runs: [
          {
            prompt: "Inspect the repository",
            items: [],
            status: "settled",
          },
        ],
      },
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
