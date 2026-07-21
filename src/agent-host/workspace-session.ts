import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

interface SessionManagerFactory<T> {
  continueRecent(workspace: string, sessionDirectory: string): T;
  create(workspace: string, sessionDirectory: string): T;
}

export function continueWorkspaceSession<T>(
  sessionManager: SessionManagerFactory<T>,
  workspace: string,
  storageRoot: string,
): T {
  return sessionManager.continueRecent(
    workspace,
    workspaceSessionDirectory(workspace, storageRoot),
  );
}

export function createWorkspaceSession<T>(
  sessionManager: SessionManagerFactory<T>,
  workspace: string,
  storageRoot: string,
): T {
  return sessionManager.create(
    workspace,
    workspaceSessionDirectory(workspace, storageRoot),
  );
}

function workspaceSessionDirectory(
  workspace: string,
  storageRoot: string,
): string {
  const workspaceKey = createHash("sha256")
    .update(resolve(workspace))
    .digest("hex");
  return join(storageRoot, workspaceKey);
}
