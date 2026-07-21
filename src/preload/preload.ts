import { contextBridge, ipcRenderer } from "electron";
import {
  AGENT_COMMAND_CHANNEL,
  AGENT_EVENT_CHANNEL,
  parseAgentHostEvent,
} from "../protocol/agent-protocol";
import type { PandiApi } from "../protocol/pandi-api";

const api: PandiApi = {
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
};

contextBridge.exposeInMainWorld("pandi", api);
