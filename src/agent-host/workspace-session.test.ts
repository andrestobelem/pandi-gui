import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it } from "vitest";
import {
  continueWorkspaceSession,
  createWorkspaceSession,
  listWorkspaceSessions,
  openWorkspaceSession,
} from "./workspace-session";

const temporaryDirectories: string[] = [];

function persistProbe(session: SessionManager, source: string): void {
  session.appendCustomEntry("probe", { source });
  session.appendMessage({ role: "user", content: source, timestamp: 0 });
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

    const newPandiSession = createWorkspaceSession(
      SessionManager,
      workspaceA,
      join(root, "pandi"),
    );
    expect(newPandiSession.getEntries()).toEqual([]);
    expect(newPandiSession.getSessionId()).not.toBe(
      restoredPandiSession.getSessionId(),
    );
    persistProbe(newPandiSession, "New Pandi Session");
    expect(
      await SessionManager.list(workspaceA, newPandiSession.getSessionDir()),
    ).toHaveLength(2);

    const otherWorkspaceSession = continueWorkspaceSession(
      SessionManager,
      workspaceB,
      join(root, "pandi"),
    );
    expect(otherWorkspaceSession.getEntries()).toEqual([]);
  });

  it("lists and opens only known Session IDs in the Workspace", async () => {
    const root = await mkdtemp(join(tmpdir(), "pandi-session-list-"));
    temporaryDirectories.push(root);
    const workspaceA = join(root, "workspace-a");
    const workspaceB = join(root, "workspace-b");
    await Promise.all([mkdir(workspaceA), mkdir(workspaceB)]);
    const storageRoot = join(root, "pandi");
    const first = createWorkspaceSession(
      SessionManager,
      workspaceA,
      storageRoot,
    );
    persistProbe(first, "Inspect README.md");
    const second = createWorkspaceSession(
      SessionManager,
      workspaceA,
      storageRoot,
    );
    persistProbe(second, "Fix the composer");
    const otherWorkspace = createWorkspaceSession(
      SessionManager,
      workspaceB,
      storageRoot,
    );
    persistProbe(otherWorkspace, "Do not expose me");

    const sessions = await listWorkspaceSessions(
      SessionManager,
      workspaceA,
      storageRoot,
    );

    expect(sessions.map(({ id, title }) => ({ id, title }))).toEqual(
      expect.arrayContaining([
        { id: first.getSessionId(), title: "Inspect README.md" },
        { id: second.getSessionId(), title: "Fix the composer" },
      ]),
    );
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).not.toHaveProperty("path");

    const opened = await openWorkspaceSession(
      SessionManager,
      workspaceA,
      storageRoot,
      first.getSessionId(),
    );
    expect(opened.getEntries()).toEqual(first.getEntries());
    await expect(
      openWorkspaceSession(
        SessionManager,
        workspaceA,
        storageRoot,
        otherWorkspace.getSessionId(),
      ),
    ).rejects.toThrow("Unknown Workspace Session");
  });
});
