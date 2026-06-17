import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import type { SpawnSyncReturns } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const distRoot = resolve(projectRoot, "dist");
const artifacts = ["main.js", "manifest.json", "styles.css"];

const manifest = JSON.parse(await readCommand("node", ["-e", "process.stdout.write(require('fs').readFileSync('manifest.json', 'utf8'))"], {
  cwd: projectRoot,
  action: "read manifest.json"
}));
const archiveName = `${manifest.id}-${manifest.version}.zip`;
const archivePath = resolve(distRoot, archiveName);

run("npm", ["run", "validate:release"], {
  cwd: projectRoot,
  action: "validate release artifacts before packaging"
});

await mkdir(distRoot, { recursive: true });
await rm(archivePath, { force: true });

run("zip", ["-q", "-X", archivePath, ...artifacts], {
  cwd: projectRoot,
  action: "create release zip"
});

const archivedFiles = (await readCommand("unzip", ["-Z1", archivePath], {
  cwd: projectRoot,
  action: "list release zip contents"
}))
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .sort();

const expectedFiles = [...artifacts].sort();
if (JSON.stringify(archivedFiles) !== JSON.stringify(expectedFiles)) {
  throw new Error(`Unexpected release zip contents: ${JSON.stringify(archivedFiles)}`);
}

console.log(JSON.stringify({
  releasePackage: true,
  archive: archivePath,
  files: archivedFiles
}, null, 2));

type CommandContext = {
  cwd: string;
  action: string;
};

async function readCommand(command: string, args: string[], { cwd, action }: CommandContext): Promise<string> {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8"
  });
  if (result.status === 0) {
    return result.stdout.trim();
  }

  throw commandError(command, args, action, result);
}

function run(command: string, args: string[], { cwd, action }: CommandContext): void {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status !== 0) {
    throw commandError(command, args, action, result);
  }
}

function commandError(command: string, args: string[], action: string, result: SpawnSyncReturns<string>): Error {
  const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
  return new Error(`Command failed while trying to ${action}: ${command} ${args.join(" ")}\n${output}`);
}
