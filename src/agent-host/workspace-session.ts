import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";

export function continueWorkspaceSession(
  workspace: string,
  storageRoot: string,
): SessionManager {
  const workspaceKey = createHash("sha256")
    .update(resolve(workspace))
    .digest("hex");

  return SessionManager.continueRecent(
    workspace,
    join(storageRoot, workspaceKey),
  );
}
