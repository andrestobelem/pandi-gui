import { type FormEvent, useEffect, useRef, useState } from "react";
import type { TranscriptRun as RestoredRun } from "../protocol/agent-protocol";
import "../protocol/pandi-api";

type IconName = "agent" | "arrow" | "code" | "folder" | "review" | "spark";

type ToolActivity = {
  type: "tool";
  id: string;
  name: string;
  input: string;
  status: "running" | "completed" | "failed";
  result?: string;
};

type TranscriptItem =
  | { type: "response"; id: number; text: string }
  | ToolActivity;

type TranscriptRun = {
  id: number;
  prompt: string;
  items: TranscriptItem[];
  status: "running" | "settled" | "failed";
  error?: string;
};

function restoreRuns(runs: RestoredRun[]): TranscriptRun[] {
  return runs.map((run, runIndex) => ({
    id: runIndex + 1,
    prompt: run.prompt,
    status: run.status,
    error: run.error,
    items: run.items.map((item, itemIndex) =>
      item.type === "response"
        ? { ...item, id: itemIndex }
        : {
            type: "tool",
            id: item.id,
            name: item.name,
            input: item.input,
            status: item.isError ? "failed" : "completed",
            result: item.result,
          },
    ),
  }));
}

function updateLatestRun(
  runs: TranscriptRun[],
  update: (run: TranscriptRun) => TranscriptRun,
): TranscriptRun[] {
  const latest = runs.at(-1);
  if (!latest) return runs;

  return [...runs.slice(0, -1), update(latest)];
}

function appendResponseDelta(
  items: TranscriptItem[],
  text: string,
): TranscriptItem[] {
  const latest = items.at(-1);
  if (latest?.type !== "response") {
    return [...items, { type: "response", id: items.length, text }];
  }

  return [...items.slice(0, -1), { ...latest, text: latest.text + text }];
}

function completeToolActivity(
  items: TranscriptItem[],
  event: {
    id: string;
    result: string;
    isError: boolean;
  },
): TranscriptItem[] {
  return items.map((item) =>
    item.type === "tool" && item.id === event.id
      ? {
          ...item,
          result: event.result,
          status: event.isError ? "failed" : "completed",
        }
      : item,
  );
}

function ToolActivityCard({ activity }: { activity: ToolActivity }) {
  const status = {
    running: "Running",
    completed: "Completed",
    failed: "Failed",
  }[activity.status];

  return (
    <article
      aria-label={`${activity.name} Tool Activity`}
      className={`tool-activity is-${activity.status}`}
    >
      <header className="tool-activity-header">
        <span>
          <Icon name="code" />
          <strong>{activity.name}</strong>
        </span>
        <span className="tool-activity-status">{status}</span>
      </header>
      <div className="tool-activity-payload">
        <span>Input</span>
        <pre>{activity.input}</pre>
      </div>
      {activity.result !== undefined && (
        <div className="tool-activity-payload">
          <span>Result</span>
          <pre>{activity.result}</pre>
        </div>
      )}
    </article>
  );
}

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    agent: (
      <>
        <path d="M8 3.5h8l2.5 4.3v8.4L16 20.5H8l-2.5-4.3V7.8L8 3.5Z" />
        <path d="M9 10h.01M15 10h.01M9.5 15h5" />
      </>
    ),
    arrow: <path d="m5 12 7-7 7 7M12 5v14" />,
    code: <path d="m9 18-6-6 6-6M15 6l6 6-6 6" />,
    folder: <path d="M3 6.5h7l2 2h9v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" />,
    review: (
      <>
        <path d="M4 12a8 8 0 1 0 2.3-5.7L4 8.6" />
        <path d="M4 4v4.6h4.6M9 12l2 2 4-4" />
      </>
    ),
    spark: (
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3ZM18 16l.6 2.4L21 19l-2.4.6L18 22l-.6-2.4L15 19l2.4-.6L18 16Z" />
    ),
  };

  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      >
        {paths[name]}
      </g>
    </svg>
  );
}

export function App() {
  const [input, setInput] = useState("");
  const [workspaceName, setWorkspaceName] = useState("Current Workspace");
  const [runs, setRuns] = useState<TranscriptRun[]>([]);
  const [isRestoring, setIsRestoring] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const transcriptEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    void window.pandi
      .workspace()
      .then(({ name }) => {
        if (isMounted) setWorkspaceName(name);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = window.pandi.subscribe((event) => {
      switch (event.type) {
        case "session.restored":
          setRuns(restoreRuns(event.runs));
          setIsRestoring(false);
          setIsRunning(false);
          break;
        case "agent.started":
          setIsRestoring(false);
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              items: [],
              status: "running",
              error: undefined,
            })),
          );
          setIsRunning(true);
          break;
        case "message.delta":
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              items: appendResponseDelta(run.items, event.text),
            })),
          );
          break;
        case "tool.started":
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              items: [
                ...run.items,
                {
                  type: "tool",
                  id: event.id,
                  name: event.name,
                  input: event.input,
                  status: "running",
                },
              ],
            })),
          );
          break;
        case "tool.completed":
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              items: completeToolActivity(run.items, event),
            })),
          );
          break;
        case "agent.failed":
          setIsRestoring(false);
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              status: "failed",
              error: event.message,
            })),
          );
          setIsRunning(false);
          break;
        case "agent.settled":
          setRuns((current) =>
            updateLatestRun(current, (run) => ({
              ...run,
              status: run.status === "failed" ? "failed" : "settled",
            })),
          );
          setIsRunning(false);
          break;
      }
    });
    window.pandi.restore();
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const abortOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") window.pandi.abort();
    };
    window.addEventListener("keydown", abortOnEscape);
    return () => window.removeEventListener("keydown", abortOnEscape);
  }, [isRunning]);

  useEffect(() => {
    if (runs.length === 0) return;
    transcriptEnd.current?.scrollIntoView({ block: "end" });
  }, [runs]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isRestoring || isRunning) return;

    setRuns((current) => [
      ...current,
      {
        id: (current.at(-1)?.id ?? 0) + 1,
        prompt,
        items: [],
        status: "running",
      },
    ]);
    setInput("");
    setIsRunning(true);
    window.pandi.prompt(prompt);
  }

  const hasTranscript = runs.length > 0;

  return (
    <div className="app-shell">
      <aside aria-label="Workspace" className="sidebar">
        <div className="brand">
          <span className="brand-mark">
            <Icon name="agent" />
          </span>
          <span>
            <strong>Pandi</strong>
            <small>Coding workspace</small>
          </span>
        </div>

        <nav aria-label="Workspace navigation" className="sidebar-nav">
          <div className="nav-group">
            <p className="eyebrow">Workspace</p>
            <div className="nav-item">
              <Icon name="folder" />
              <span>
                <strong>{workspaceName}</strong>
                <small>Local Workspace</small>
              </span>
            </div>
          </div>

          <div className="nav-group">
            <p className="eyebrow">Session</p>
            <div className="nav-item nav-item-active">
              <span className="session-indicator" />
              <span>
                <strong>Active Session</strong>
                <small>{isRunning ? "Run in progress" : "Ready"}</small>
              </span>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>
            <strong>Coding Agent</strong>
            <small>Connected locally</small>
          </span>
        </div>
      </aside>

      <main aria-label="Session" className="session-shell">
        <header className="session-header">
          <div>
            <p className="eyebrow">Current Workspace</p>
            <h1>Active Session</h1>
          </div>
          <span className={`run-status${isRunning ? " is-running" : ""}`}>
            <span className="status-dot" />
            {isRunning ? "Running" : "Agent ready"}
          </span>
        </header>

        <section aria-label="Transcript" className="transcript">
          {!hasTranscript && (
            <div className="empty-state">
              <span className="empty-mark">
                <Icon name="agent" />
              </span>
              <p className="eyebrow">Start a Session</p>
              <h2>What should we build?</h2>
              <p className="empty-copy">
                Give the Coding Agent a clear outcome. It can explore the
                Workspace, implement a change, or review existing work.
              </p>
              <div className="capability-grid">
                <article>
                  <span className="capability-icon violet">
                    <Icon name="spark" />
                  </span>
                  <strong>Explore the Workspace</strong>
                  <p>Investigate the code and explain what you find.</p>
                </article>
                <article>
                  <span className="capability-icon blue">
                    <Icon name="code" />
                  </span>
                  <strong>Build a feature</strong>
                  <p>Turn an outcome into a small, verifiable change.</p>
                </article>
                <article>
                  <span className="capability-icon green">
                    <Icon name="review" />
                  </span>
                  <strong>Review changes</strong>
                  <p>Inspect the implementation and surface risks.</p>
                </article>
              </div>
            </div>
          )}

          {hasTranscript && (
            <div className="messages">
              {runs.map((run) => (
                <div className="transcript-run" key={run.id}>
                  <article className="message developer-message">
                    <div className="message-author">
                      <span className="avatar developer-avatar">D</span>
                      <strong>Developer</strong>
                    </div>
                    <p>{run.prompt}</p>
                  </article>
                  {run.items.length === 0 && run.status === "running" && (
                    <article
                      aria-live="polite"
                      className="message agent-message"
                    >
                      <div className="message-author">
                        <span className="avatar agent-avatar">
                          <Icon name="agent" />
                        </span>
                        <strong>Coding Agent</strong>
                      </div>
                      <p>Thinking…</p>
                    </article>
                  )}
                  {run.items.map((item) =>
                    item.type === "tool" ? (
                      <ToolActivityCard
                        activity={item}
                        key={`tool-${item.id}`}
                      />
                    ) : (
                      <article
                        aria-live={run.status === "running" ? "polite" : "off"}
                        className="message agent-message"
                        key={`response-${run.id}-${item.id}`}
                      >
                        <div className="message-author">
                          <span className="avatar agent-avatar">
                            <Icon name="agent" />
                          </span>
                          <strong>Coding Agent</strong>
                        </div>
                        <p>{item.text}</p>
                      </article>
                    ),
                  )}
                  {run.error && (
                    <p className="error-message" role="alert">
                      {run.error}
                    </p>
                  )}
                </div>
              ))}
              <div aria-hidden="true" ref={transcriptEnd} />
            </div>
          )}
        </section>

        <div className="composer-dock">
          <form className="composer" onSubmit={submit}>
            <div className="composer-context">
              <Icon name="folder" />
              <span>{workspaceName}</span>
            </div>
            <label className="sr-only" htmlFor="prompt">
              Prompt
            </label>
            <textarea
              id="prompt"
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Pandi to work in this Workspace…"
              rows={3}
              value={input}
            />
            <div className="composer-toolbar">
              <span className="agent-mode">
                <Icon name="agent" />
                Coding Agent
              </span>
              <div className="composer-actions">
                {isRunning && (
                  <button
                    className="cancel-button"
                    onClick={() => window.pandi.abort()}
                    type="button"
                  >
                    Cancel
                  </button>
                )}
                <button
                  aria-label="Send"
                  className="send-button"
                  disabled={
                    isRestoring || isRunning || input.trim().length === 0
                  }
                  type="submit"
                >
                  <Icon name="arrow" />
                </button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
