import { createHash } from "node:crypto";
import { join, resolve } from "node:path";

interface SessionManagerFactory<T> {
  continueRecent(workspace: string, sessionDirectory: string): T;
}

export function continueWorkspaceSession<T>(
  sessionManager: SessionManagerFactory<T>,
  workspace: string,
  storageRoot: string,
): T {
  const workspaceKey = createHash("sha256")
    .update(resolve(workspace))
    .digest("hex");

  return sessionManager.continueRecent(
    workspace,
    join(storageRoot, workspaceKey),
  );
}
