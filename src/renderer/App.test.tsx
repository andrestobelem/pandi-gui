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

describe("agent conversation", () => {
  it("submits a prompt and renders streamed text", () => {
    const prompt = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      prompt,
      abort: vi.fn(),
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

  it("can cancel immediately and settles when the host confirms it", () => {
    const abort = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      prompt: vi.fn(),
      abort,
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
