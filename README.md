# Pandi GUI

A hackable desktop harness for coding agents.

## Prerequisites

- Node `22.23.1` (`.nvmrc`)
- npm `12.0.1`
- Pi model credentials configured in `~/.pi/agent`

```bash
nvm use
npm install --global npm@12.0.1
npm ci
```

## Run

Start with the real Pi adapter:

```bash
npm start
```

The current directory becomes the agent workspace. To exercise the UI without model credentials or token usage, select the deterministic engine:

```bash
PANDI_AGENT_ENGINE=deterministic npm start
```

Enter a prompt and observe the Response stream as rendered Markdown. Use **Cancel** or press **Escape** to abort an active Response. When Pandi starts again in the same Workspace, it restores its latest Session and Transcript; Pandi sessions are stored separately from sessions created with the Pi CLI. Use **New Session** while the Coding Agent is idle to clear the Transcript and start with fresh model context; the previous Session remains stored for future session-management features.

## Markdown artifacts

Generate a self-contained, readable HTML file next to any Markdown artifact:

```bash
npm run docs:html -- docs/research/pi-extension-examples.md
```

The generated document includes responsive light/dark styles, a table of contents and printable formatting. Raw HTML in the Markdown is escaped.

## Commit stage

Run the same secret-free commit stage used by CI:

```bash
npm ci
npm run commit-stage
```

It runs formatting/lint checks, type checking, deterministic tests and the dependency audit before packaging once. It then writes the packaged macOS candidate and `manifest.json` to `candidate/`; the manifest binds the archive to the full commit SHA and its SHA-256 digest.

GitHub Actions runs this command for pull requests and pushes to `main`, cancels superseded branch runs and uploads the candidate for 14 days. The current Continuous Delivery boundary ends at an unsigned macOS ARM64 candidate. Signing, notarization, multi-platform packages and release promotion require separate decisions and credentials; later stages must consume this candidate rather than rebuild it.

Real-Pi smoke checks remain manual:

1. Start the default application, submit `Reply exactly PANDI_SMOKE and do not use tools`, and observe `PANDI_SMOKE` in the Transcript.
2. Submit `Use the read tool to read package.json, then tell me the package name.` Observe a `read` Tool Activity card transition from **Running** to **Completed**, with the requested path as input and file content as its result, followed by the Coding Agent Response.
3. Submit `Remember the marker PANDI_SESSION_SMOKE and reply READY.`, wait for the Run to settle, quit Pandi, and restart it from the same Workspace. Observe the restored Prompt and Response, then submit `What marker did I ask you to remember?` and verify that the Coding Agent replies `PANDI_SESSION_SMOKE`.

The real Pi Session exposes only the built-in `read` tool: extensions, bash and mutating tools remain disabled. These checks verify the packaged renderer, preload, Electron IPC, utility process, Pi Session persistence, read execution and model stream together.

## Architecture

```text
React renderer
    │ validated Electron IPC
preload / main process
    │ validated utility-process messages
agent host
    └── application AgentEngine interface
          ├── Pi adapter
          └── deterministic test engine
```

The renderer has no Node or Pi access. The main process owns windows and transport only; the agent host runs separately so it can be restarted without blocking the UI.
