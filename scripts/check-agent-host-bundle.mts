import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const bundle = resolve(import.meta.dirname, "../.vite/build/agent-host.js");
const result = spawnSync(process.execPath, [bundle], { encoding: "utf8" });
const output = `${result.stdout}${result.stderr}`;
const expectedBoundaryError =
  "The agent host must run as an Electron utility process";

if (!output.includes(expectedBoundaryError)) {
  throw new Error(
    `Agent Host bundle failed before its utility-process boundary:\n${output}`,
  );
}

console.log("Agent Host bundle loaded to its utility-process boundary");
