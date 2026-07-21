import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

interface CandidateManifest {
  schemaVersion: 1;
  commitSha: string;
  filename: string;
  sha256: string;
  bytes: number;
  platform: NodeJS.Platform;
  architecture: string;
}

const root = process.cwd();
const commitSha = resolveCommitSha();
const platform = process.platform;
const architecture = process.arch;

if (platform !== "darwin") {
  throw new Error(`Candidate creation is not implemented for ${platform}`);
}

const packagedApp = path.join(
  root,
  "out",
  `Pandi GUI-${platform}-${architecture}`,
  "Pandi GUI.app",
);
const candidateDirectory = path.join(root, "candidate");
const filename = `pandi-gui-${commitSha}-${platform}-${architecture}.zip`;
const archive = path.join(candidateDirectory, filename);

await rm(candidateDirectory, { force: true, recursive: true });
await mkdir(candidateDirectory, { recursive: true });

const packagedAppStats = await stat(packagedApp);
if (!packagedAppStats.isDirectory()) {
  throw new Error(`Packaged application not found at ${packagedApp}`);
}

execFileSync(
  "ditto",
  ["-c", "-k", "--sequesterRsrc", "--keepParent", packagedApp, archive],
  { stdio: "inherit" },
);

const manifest: CandidateManifest = {
  schemaVersion: 1,
  commitSha,
  filename,
  sha256: await sha256(archive),
  bytes: (await stat(archive)).size,
  platform,
  architecture,
};

await writeFile(
  path.join(candidateDirectory, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
console.log(JSON.stringify(manifest));

function resolveCommitSha(): string {
  const sha =
    process.env.GITHUB_SHA ??
    execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  const normalizedSha = sha.trim().toLowerCase();

  if (!/^[0-9a-f]{40}$/.test(normalizedSha)) {
    throw new Error(`Expected a full commit SHA, received ${normalizedSha}`);
  }

  return normalizedSha;
}

async function sha256(file: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) {
    hash.update(chunk);
  }
  return hash.digest("hex");
}
