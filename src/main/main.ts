import path from "node:path";
import {
  app,
  BrowserWindow,
  ipcMain,
  type UtilityProcess,
  utilityProcess,
} from "electron";
import {
  AGENT_COMMAND_CHANNEL,
  AGENT_EVENT_CHANNEL,
  parseAgentHostCommand,
  parseAgentHostEvent,
} from "../protocol/agent-protocol";
import { WORKSPACE_INFO_CHANNEL } from "../protocol/pandi-api";

let mainWindow: BrowserWindow | undefined;
let agentHost: UtilityProcess | undefined;
let isQuitting = false;

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 720,
    minHeight: 560,
    backgroundColor: "#f6f7fa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void window.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void window.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return window;
}

function startAgentHost(
  workspace: string,
  sessionStorageRoot: string,
): UtilityProcess {
  const child = utilityProcess.fork(path.join(__dirname, "agent-host.js"), [], {
    cwd: workspace,
    env: {
      ...process.env,
      PANDI_SESSION_ROOT: sessionStorageRoot,
      PANDI_WORKSPACE: workspace,
    },
    serviceName: "Pandi Agent Host",
    stdio: "pipe",
  });

  child.on("message", (value) => {
    const event = parseAgentHostEvent(value);
    mainWindow?.webContents.send(AGENT_EVENT_CHANNEL, event);
  });
  child.on("exit", (code) => {
    if (!isQuitting) {
      mainWindow?.webContents.send(AGENT_EVENT_CHANNEL, {
        version: 1,
        type: "agent.failed",
        message: `Agent host exited with code ${code}`,
      });
      mainWindow?.webContents.send(AGENT_EVENT_CHANNEL, {
        version: 1,
        type: "agent.settled",
      });
    }
  });
  child.stderr?.on("data", (data: Buffer) => {
    console.error(`[agent-host] ${data.toString().trimEnd()}`);
  });

  return child;
}

app.whenReady().then(() => {
  const workspace = process.env.PANDI_WORKSPACE ?? process.cwd();
  const sessionStorageRoot = path.join(app.getPath("userData"), "sessions");
  agentHost = startAgentHost(workspace, sessionStorageRoot);
  mainWindow = createWindow();

  ipcMain.handle(WORKSPACE_INFO_CHANNEL, () => ({
    version: 1,
    name: path.basename(workspace) || workspace,
  }));
  ipcMain.on(AGENT_COMMAND_CHANNEL, (_event, value: unknown) => {
    agentHost?.postMessage(parseAgentHostCommand(value));
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
    }
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  agentHost?.kill();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
