import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { SESSION_TITLE_MAX_LENGTH } from "../protocol/agent-protocol";

interface StoredSessionInfo {
  path: string;
  id: string;
  modified: Date;
  firstMessage: string;
}

interface SessionManagerFactory<T> {
  continueRecent(workspace: string, sessionDirectory: string): T;
  create(workspace: string, sessionDirectory: string): T;
  open(path: string, sessionDirectory: string, workspace: string): T;
  list(
    workspace: string,
    sessionDirectory: string,
  ): Promise<StoredSessionInfo[]>;
}

export interface WorkspaceSessionInfo {
  id: string;
  title: string;
  modifiedAt: string;
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

export async function listWorkspaceSessions<T>(
  sessionManager: SessionManagerFactory<T>,
  workspace: string,
  storageRoot: string,
): Promise<WorkspaceSessionInfo[]> {
  const sessions = await sessionManager.list(
    workspace,
    workspaceSessionDirectory(workspace, storageRoot),
  );

  return sessions
    .sort((left, right) => right.modified.getTime() - left.modified.getTime())
    .map((session) => ({
      id: session.id,
      title: sessionTitle(session.firstMessage),
      modifiedAt: session.modified.toISOString(),
    }));
}

export async function openWorkspaceSession<T>(
  sessionManager: SessionManagerFactory<T>,
  workspace: string,
  storageRoot: string,
  sessionId: string,
): Promise<T> {
  const sessionDirectory = workspaceSessionDirectory(workspace, storageRoot);
  const session = (await sessionManager.list(workspace, sessionDirectory)).find(
    ({ id }) => id === sessionId,
  );
  if (!session) throw new Error("Unknown Workspace Session");

  return sessionManager.open(session.path, sessionDirectory, workspace);
}

function sessionTitle(firstMessage: string): string {
  const title = firstMessage.replace(/\s+/g, " ").trim();
  return (title || "Untitled Session").slice(0, SESSION_TITLE_MAX_LENGTH);
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
