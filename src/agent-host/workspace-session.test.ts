import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import { continueWorkspaceSession } from "./workspace-session";

const temporaryDirectories: string[] = [];

function persistProbe(session: SessionManager, source: string): void {
  session.appendCustomEntry("probe", { source });
  session.appendMessage({
    role: "assistant",
    content: [{ type: "text", text: "Persisted" }],
    api: "test",
    provider: "test",
    model: "test",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0,
      },
    },
    stopReason: "stop",
    timestamp: 0,
  });
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("Pandi Workspace Session storage", () => {
  it("continues only Pandi history for the same Workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "pandi-session-"));
    temporaryDirectories.push(root);
    const workspaceA = join(root, "workspace-a");
    const workspaceB = join(root, "workspace-b");
    await Promise.all([mkdir(workspaceA), mkdir(workspaceB)]);

    const cliSession = SessionManager.create(workspaceA, join(root, "pi-cli"));
    persistProbe(cliSession, "Pi CLI");

    const firstPandiSession = continueWorkspaceSession(
      SessionManager,
      workspaceA,
      join(root, "pandi"),
    );
    expect(firstPandiSession.getEntries()).toEqual([]);
    persistProbe(firstPandiSession, "Pandi");

    const restoredPandiSession = continueWorkspaceSession(
      SessionManager,
      workspaceA,
      join(root, "pandi"),
    );
    expect(restoredPandiSession.getBranch()).toContainEqual(
      expect.objectContaining({
        type: "custom",
        customType: "probe",
        data: { source: "Pandi" },
      }),
    );

    const otherWorkspaceSession = continueWorkspaceSession(
      SessionManager,
      workspaceB,
      join(root, "pandi"),
    );
    expect(otherWorkspaceSession.getEntries()).toEqual([]);
  });
});
