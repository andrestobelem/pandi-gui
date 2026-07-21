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

Enter a prompt and observe the response as streamed deltas. Use **Cancel** or press **Escape** to abort an active response.

## Verify

```bash
npm run check
npm run typecheck
npm test
npm run package
```

A real-Pi smoke check consists of starting the default application, submitting `Reply exactly PANDI_SMOKE and do not use tools`, and observing `PANDI_SMOKE` in the transcript. This verifies the packaged renderer, preload, Electron IPC, utility process, Pi session and model stream together.

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
