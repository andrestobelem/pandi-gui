import type { AgentEngine } from "./agent-engine";
import { AgentHostController } from "./agent-host-controller";
import { DeterministicAgentEngine } from "./deterministic-agent-engine";
import { PiAgentEngine } from "./pi-agent-engine";

const parentPort = process.parentPort;

if (!parentPort) {
  throw new Error("The agent host must run as an Electron utility process");
}

const workspace = process.env.PANDI_WORKSPACE ?? process.cwd();
const engine: AgentEngine =
  process.env.PANDI_AGENT_ENGINE === "deterministic"
    ? new DeterministicAgentEngine(20)
    : new PiAgentEngine(workspace);
const controller = new AgentHostController(engine, (event) => {
  parentPort.postMessage(event);
});

parentPort.on("message", (event) => {
  void controller.receive(event.data).catch((error: unknown) => {
    parentPort.postMessage({
      version: 1,
      type: "agent.failed",
      message: error instanceof Error ? error.message : String(error),
    });
    parentPort.postMessage({ version: 1, type: "agent.settled" });
  });
});

async function shutdown(): Promise<void> {
  await controller.dispose();
  process.exit(0);
}

process.once("SIGTERM", () => void shutdown());
process.once("SIGINT", () => void shutdown());
