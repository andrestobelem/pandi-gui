/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { App } from "./App";

afterEach(cleanup);

describe("Workspace Session", () => {
  it("orients the Developer before the first Prompt", async () => {
    window.pandi = {
      prompt: vi.fn(),
      abort: vi.fn(),
      subscribe: () => () => {},
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
    };

    render(<App />);

    expect(
      screen.getByRole("complementary", { name: "Workspace" }),
    ).toBeTruthy();
    expect(screen.getByRole("region", { name: "Transcript" })).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "What should we build?" }),
    ).toBeTruthy();
    expect(screen.getByLabelText("Prompt")).toBeTruthy();
    expect(await screen.findAllByText("pandi-gui")).toHaveLength(2);
  });

  it("submits a Prompt and renders a streamed Response", () => {
    const prompt = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      prompt,
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({ version: 1, type: "message.delta", text: "Hi " });
      receive({ version: 1, type: "message.delta", text: "there" });
      receive({ version: 1, type: "agent.settled" });
    });

    expect(prompt).toHaveBeenCalledWith("Hello");
    expect(screen.getByText("Hi there")).toBeTruthy();
  });

  it("lets the Developer cancel a Run before it settles", () => {
    const abort = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      prompt: vi.fn(),
      abort,
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Wait for me" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(abort).toHaveBeenCalledOnce();

    act(() => receive({ version: 1, type: "agent.settled" }));
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    expect(screen.queryByText("Thinking…")).toBeNull();
  });
});
