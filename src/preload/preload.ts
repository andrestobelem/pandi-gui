import { contextBridge, ipcRenderer } from "electron";
import {
  AGENT_COMMAND_CHANNEL,
  AGENT_EVENT_CHANNEL,
  parseAgentHostEvent,
} from "../protocol/agent-protocol";
import {
  type PandiApi,
  parseWorkspaceInfo,
  WORKSPACE_INFO_CHANNEL,
} from "../protocol/pandi-api";

const api: PandiApi = {
  restore() {
    ipcRenderer.send(AGENT_COMMAND_CHANNEL, {
      version: 1,
      type: "session.restore",
    });
  },
  prompt(text) {
    ipcRenderer.send(AGENT_COMMAND_CHANNEL, {
      version: 1,
      type: "prompt",
      text,
    });
  },
  abort() {
    ipcRenderer.send(AGENT_COMMAND_CHANNEL, { version: 1, type: "abort" });
  },
  subscribe(listener) {
    const receive = (_event: Electron.IpcRendererEvent, value: unknown) => {
      listener(parseAgentHostEvent(value));
    };
    ipcRenderer.on(AGENT_EVENT_CHANNEL, receive);
    return () => ipcRenderer.removeListener(AGENT_EVENT_CHANNEL, receive);
  },
  async workspace() {
    return parseWorkspaceInfo(await ipcRenderer.invoke(WORKSPACE_INFO_CHANNEL));
  },
};

contextBridge.exposeInMainWorld("pandi", api);
