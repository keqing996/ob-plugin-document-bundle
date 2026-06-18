import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

const manifest = await readJson("manifest.json");
const mainTs = await readText("src/main.ts");
const assetsFolderTs = await readText("src/obsidian/assets-folder.ts");
const assetsFolderTest = await readText("tests/assets-folder.test.ts");
const mainJs = await readText("main.js");

if (manifest.isDesktopOnly !== false) {
  throw new Error("manifest.isDesktopOnly must remain false for mobile-compatible installation.");
}

assertDoesNotMatch(mainTs, /from\s+["']electron["']|import\s+.+["']electron["']/, "src/main.ts must not import electron at module scope.");
assertDoesNotMatch(mainTs, /import\s+.+shell.+from\s+["']electron["']/, "src/main.ts must not import electron.shell at module scope.");

const electronRequireMatches = [...mainTs.matchAll(/require\(["']electron["']\)/g)];
if (electronRequireMatches.length !== 1) {
  throw new Error(`src/main.ts must contain exactly one guarded electron require, found ${electronRequireMatches.length}.`);
}

const openAssetsStart = mainTs.indexOf("async openAssetsFolder(");
const openAssetsEnd = mainTs.indexOf("\n  getBundleInfoForFile", openAssetsStart);
if (openAssetsStart === -1 || openAssetsEnd === -1) {
  throw new Error("Could not locate openAssetsFolder method in src/main.ts.");
}

const openAssetsMethod = mainTs.slice(openAssetsStart, openAssetsEnd);
assertIncludes(openAssetsMethod, "Platform.isDesktopApp", "openAssetsFolder must pass Platform.isDesktopApp into the fallback helper.");
assertIncludes(openAssetsMethod, "require(\"electron\")", "openAssetsFolder must keep electron access localized to the desktop openPath callback.");

const nonDesktopCheckIndex = assetsFolderTs.indexOf("if (!context.isDesktopApp)");
const openPathCheckIndex = assetsFolderTs.indexOf("if (!context.openPath)");
const fullPathIndex = assetsFolderTs.indexOf("getFullPath");
if (nonDesktopCheckIndex === -1 || openPathCheckIndex === -1 || fullPathIndex === -1) {
  throw new Error("assets-folder fallback helper is missing one of the required desktop safety checks.");
}
if (!(nonDesktopCheckIndex < openPathCheckIndex && nonDesktopCheckIndex < fullPathIndex)) {
  throw new Error("assets-folder fallback helper must check non-desktop mode before resolving full paths or opening OS folders.");
}

assertIncludes(assetsFolderTs, "reason: \"not-desktop\"", "assets-folder helper must return a not-desktop fallback reason.");
assertIncludes(assetsFolderTest, "uses a Notice fallback on mobile or other non-desktop Obsidian shells", "mobile fallback unit test is missing.");
assertIncludes(assetsFolderTest, "openPath should not be called", "mobile fallback test must prove openPath is not called on non-desktop shells.");

if (!mainJs.includes("isDesktopApp")) {
  throw new Error("main.js must retain the Platform.isDesktopApp guard.");
}
if (!mainJs.includes("require(\"electron\")")) {
  throw new Error("main.js should contain the localized desktop electron require for opening assets folders.");
}

console.log(JSON.stringify({
  mobileSafetyValidation: true,
  checks: {
    manifestDesktopOnly: manifest.isDesktopOnly,
    guardedElectronRequireCount: electronRequireMatches.length,
    nonDesktopFallbackBeforeDesktopPathResolution: true,
    nonDesktopFallbackUnitTest: true,
    bundledDesktopGuard: true
  }
}, null, 2));

async function readJson(relativePath: string): Promise<Record<string, any>> {
  return JSON.parse(await readText(relativePath));
}

async function readText(relativePath: string): Promise<string> {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

function assertIncludes(source: string, needle: string, message: string): void {
  if (!source.includes(needle)) {
    throw new Error(message);
  }
}

function assertDoesNotMatch(source: string, pattern: RegExp, message: string): void {
  if (pattern.test(source)) {
    throw new Error(message);
  }
}
