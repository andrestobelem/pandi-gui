import { type FormEvent, useEffect, useState } from "react";
import "../protocol/pandi-api";

export function App() {
  const [input, setInput] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [assistantMessage, setAssistantMessage] = useState("");
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  useEffect(
    () =>
      window.pandi.subscribe((event) => {
        switch (event.type) {
          case "agent.started":
            setAssistantMessage("");
            setError("");
            setIsRunning(true);
            break;
          case "message.delta":
            setAssistantMessage((current) => current + event.text);
            break;
          case "agent.failed":
            setError(event.message);
            setIsRunning(false);
            break;
          case "agent.settled":
            setIsRunning(false);
            break;
        }
      }),
    [],
  );

  useEffect(() => {
    if (!isRunning) return;

    const abortOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") window.pandi.abort();
    };
    window.addEventListener("keydown", abortOnEscape);
    return () => window.removeEventListener("keydown", abortOnEscape);
  }, [isRunning]);

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const prompt = input.trim();
    if (!prompt || isRunning) return;

    setUserMessage(prompt);
    setInput("");
    window.pandi.prompt(prompt);
  }

  return (
    <main>
      <header>
        <p>Pandi GUI</p>
        <h1>A hackable home for coding agents.</h1>
      </header>

      <section aria-label="Conversation">
        {userMessage && (
          <article>
            <strong>You</strong>
            <p>{userMessage}</p>
          </article>
        )}
        {(assistantMessage || isRunning) && (
          <article aria-live="polite">
            <strong>Agent</strong>
            <p>{assistantMessage || "Thinking…"}</p>
          </article>
        )}
        {error && <p role="alert">{error}</p>}
      </section>

      <form onSubmit={submit}>
        <label htmlFor="prompt">Prompt</label>
        <textarea
          id="prompt"
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask Pandi to inspect your workspace…"
          rows={4}
          value={input}
        />
        <div>
          <button
            disabled={isRunning || input.trim().length === 0}
            type="submit"
          >
            Send
          </button>
          {isRunning && (
            <button onClick={() => window.pandi.abort()} type="button">
              Cancel
            </button>
          )}
        </div>
      </form>
    </main>
  );
}
