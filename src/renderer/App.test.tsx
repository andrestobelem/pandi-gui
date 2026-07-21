/** @vitest-environment jsdom */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentHostEvent } from "../protocol/agent-protocol";
import { App } from "./App";

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: scrollIntoView,
  });
});

afterEach(cleanup);

describe("Workspace Session", () => {
  it("orients the Developer before the first Prompt", async () => {
    window.pandi = {
      restore: vi.fn(),
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

  it("restores the latest Session Transcript on startup", () => {
    const restore = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore,
      prompt: vi.fn(),
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    expect(restore).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Do not race restoration" },
    });
    const send = screen.getByRole("button", { name: "Send" });
    expect((send as HTMLButtonElement).disabled).toBe(true);

    act(() => {
      receive({
        version: 1,
        type: "session.restored",
        runs: [
          {
            prompt: "Inspect README.md",
            status: "settled",
            items: [
              { type: "response", text: "I'll inspect it." },
              {
                type: "tool",
                id: "read-1",
                name: "read",
                input: '{"path":"README.md"}',
                result: "# Pandi GUI",
                isError: false,
              },
              { type: "response", text: "The package is Pandi GUI." },
            ],
          },
        ],
      });
    });

    const transcript = screen.getByRole("region", { name: "Transcript" });
    const text = transcript.textContent ?? "";
    expect(text.indexOf("Inspect README.md")).toBeLessThan(
      text.indexOf("I'll inspect it."),
    );
    expect(text.indexOf("I'll inspect it.")).toBeLessThan(
      text.indexOf('{"path":"README.md"}'),
    );
    expect(text.indexOf("# Pandi GUI")).toBeLessThan(
      text.indexOf("The package is Pandi GUI."),
    );
    expect(within(transcript).getByText("Completed")).toBeTruthy();
    expect((send as HTMLButtonElement).disabled).toBe(false);
    expect(
      screen.queryByRole("heading", { name: "What should we build?" }),
    ).toBeNull();
  });

  it("submits a Prompt and renders a streamed Response", () => {
    const prompt = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({ version: 1, type: "session.restored", runs: [] });
      },
      prompt,
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    const promptInput = screen.getByLabelText("Prompt");
    fireEvent.change(promptInput, {
      target: { value: "Hello" },
    });
    fireEvent.keyDown(promptInput, { key: "Enter", shiftKey: true });
    expect(prompt).not.toHaveBeenCalled();
    fireEvent.keyDown(promptInput, { key: "Enter" });
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({ version: 1, type: "message.delta", text: "**Hi " });
      receive({ version: 1, type: "message.delta", text: "there**" });
      receive({ version: 1, type: "agent.settled" });
    });

    expect(prompt).toHaveBeenCalledWith("Hello");
    expect(screen.getByText("Hi there").tagName).toBe("STRONG");
  });

  it("renders restored Markdown without active HTML, links, or images", () => {
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({
          version: 1,
          type: "session.restored",
          runs: [
            {
              prompt: "Show Markdown",
              status: "settled",
              items: [
                {
                  type: "response",
                  text: [
                    "# Result",
                    "",
                    "| Name | State |",
                    "| --- | --- |",
                    "| Pandi | **Ready** |",
                    "",
                    "```ts",
                    "const ready = true;",
                    "```",
                    "",
                    "[unsafe](javascript:alert(1))",
                    "",
                    '<img src="https://example.com/tracker.png" onerror="alert(1)">',
                    "<script>alert('unsafe')</script>",
                  ].join("\n"),
                },
              ],
            },
          ],
        });
      },
      prompt: vi.fn(),
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };

    const { container } = render(<App />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Result" }),
    ).toBeTruthy();
    expect(screen.getByRole("table")).toBeTruthy();
    expect(
      container.querySelector(".response-markdown strong")?.textContent,
    ).toBe("Ready");
    expect(container.querySelector("pre code.language-ts")?.textContent).toBe(
      "const ready = true;\n",
    );
    expect(screen.getByText("unsafe").closest("a")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("script")).toBeNull();
    expect(screen.getByText(/<img src=/)).toBeTruthy();
  });

  it("renders running and completed read Tool Activity", () => {
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({ version: 1, type: "session.restored", runs: [] });
      },
      prompt: vi.fn(),
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Read README.md" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({
        version: 1,
        type: "message.delta",
        text: "I'll inspect it.",
      });
      receive({
        version: 1,
        type: "tool.started",
        id: "read-1",
        name: "read",
        input: '{"path":"README.md"}',
      });
    });

    const runningActivity = screen.getByRole("article", {
      name: "read Tool Activity",
    });
    expect(within(runningActivity).getByText("Running")).toBeTruthy();
    expect(
      within(runningActivity).getByText('{"path":"README.md"}'),
    ).toBeTruthy();

    act(() => {
      receive({
        version: 1,
        type: "tool.completed",
        id: "read-1",
        name: "read",
        result: "# Pandi GUI",
        isError: false,
      });
      receive({ version: 1, type: "message.delta", text: "Read complete." });
    });

    const completedActivity = screen.getByRole("article", {
      name: "read Tool Activity",
    });
    expect(within(completedActivity).getByText("Completed")).toBeTruthy();
    expect(within(completedActivity).getByText("# Pandi GUI")).toBeTruthy();
    expect(within(completedActivity).queryByRole("heading")).toBeNull();

    const transcriptText =
      screen.getByRole("region", { name: "Transcript" }).textContent ?? "";
    expect(transcriptText.indexOf("I'll inspect it.")).toBeLessThan(
      transcriptText.indexOf('{"path":"README.md"}'),
    );
    expect(transcriptText.indexOf("# Pandi GUI")).toBeLessThan(
      transcriptText.indexOf("Read complete."),
    );
  });

  it("renders failed read Tool Activity distinctly", () => {
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({ version: 1, type: "session.restored", runs: [] });
      },
      prompt: vi.fn(),
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Read missing.md" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({
        version: 1,
        type: "tool.started",
        id: "read-1",
        name: "read",
        input: '{"path":"missing.md"}',
      });
      receive({
        version: 1,
        type: "tool.completed",
        id: "read-1",
        name: "read",
        result: "File not found",
        isError: true,
      });
      receive({ version: 1, type: "agent.settled" });
    });

    const failedActivity = screen.getByRole("article", {
      name: "read Tool Activity",
    });
    expect(within(failedActivity).getByText("Failed")).toBeTruthy();
    expect(within(failedActivity).getByText("File not found")).toBeTruthy();
  });

  it("preserves every Run and scrolls to the latest Response", () => {
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({ version: 1, type: "session.restored", runs: [] });
      },
      prompt: vi.fn(),
      abort: vi.fn(),
      workspace: async () => ({ version: 1, name: "pandi-gui" }),
      subscribe(listener) {
        receive = listener;
        return () => {};
      },
    };
    render(<App />);

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "First Prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({ version: 1, type: "message.delta", text: "First Response" });
      receive({ version: 1, type: "agent.settled" });
    });

    fireEvent.change(screen.getByLabelText("Prompt"), {
      target: { value: "Second Prompt" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    act(() => {
      receive({ version: 1, type: "agent.started" });
      receive({ version: 1, type: "message.delta", text: "Second Response" });
      receive({ version: 1, type: "agent.settled" });
    });

    const transcript = screen.getByRole("region", { name: "Transcript" });
    const text = transcript.textContent ?? "";
    expect(text.indexOf("First Prompt")).toBeLessThan(
      text.indexOf("First Response"),
    );
    expect(text.indexOf("First Response")).toBeLessThan(
      text.indexOf("Second Prompt"),
    );
    expect(text.indexOf("Second Prompt")).toBeLessThan(
      text.indexOf("Second Response"),
    );
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("lets the Developer cancel a Run before it settles", () => {
    const abort = vi.fn();
    let receive: (event: AgentHostEvent) => void = () => {};
    window.pandi = {
      restore() {
        receive({ version: 1, type: "session.restored", runs: [] });
      },
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
