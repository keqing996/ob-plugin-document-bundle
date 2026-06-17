import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const projectRoot = resolve(repoRoot, "documents-bundle");

const pkg = JSON.parse(await readProjectFile("package.json"));
const prd = await readRepoFile("PRD.md");
const readme = await readProjectFile("README.md");
const manualQa = await readProjectFile("docs/manual-qa.md");
const releaseNotes = await readProjectFile("docs/release-notes-0.1.0.md");
const mainTs = await readProjectFile("src/main.ts");
const styles = await readProjectFile("styles.css");

const requiredScripts = [
  "build",
  "test",
  "verify",
  "smoke:obsidian",
  "validate:release",
  "validate:mobile-safety",
  "validate:docs",
  "package:release"
];

const verifyCommands = [
  "npm test",
  "npm run smoke:obsidian",
  "npm run validate:release",
  "npm run validate:mobile-safety",
  "npm run validate:docs",
  "npm audit --audit-level=high",
  "npm run package:release"
];

for (const script of requiredScripts) {
  assert(pkg.scripts?.[script], `package.json missing script: ${script}`);
}

for (const command of verifyCommands) {
  assertIncludes(pkg.scripts.verify, command, `verify script missing command: ${command}`);
  assertIncludes(releaseNotes, command, `release notes missing command: ${command}`);
}

assertIncludes(prd, "## 1. Direction Change", "PRD missing direction change.");
assertIncludes(prd, "## 2. Product Goal", "PRD missing product goal.");
assertIncludes(prd, "## 3. Core Model", "PRD missing core model.");
assertIncludes(prd, "## 4. Required Cleanup First", "PRD missing custom explorer cleanup plan.");
assertIncludes(prd, "## 5. Native File Explorer DOM Patch", "PRD missing native File Explorer DOM patch plan.");
assertIncludes(prd, "Strategy B: DOM patch", "PRD must explicitly choose Strategy B.");
assertIncludes(prd, "Remove the custom Documents Bundle file tree completely", "PRD must state the custom file tree removal direction.");
assertIncludes(prd, "src/views/bundle-explorer.ts", "PRD must name the custom explorer file to delete.");
assertIncludes(prd, "src/views/bundle-menu.ts", "PRD must name the custom explorer menu file to delete.");
assertIncludes(prd, "BundleExplorerView", "PRD must name the custom explorer class to remove.");
assertIncludes(prd, "registerView", "PRD must call out custom view registration removal.");
assertIncludes(prd, "documents-bundle:open-documents-bundle-explorer", "PRD must call out custom explorer command removal.");
assertIncludes(prd, "Make the folder title bold", "PRD must include the first lightweight native File Explorer visual marker.");
assertIncludes(prd, "Hide the Bundle's direct internals", "PRD must include native File Explorer internals hiding.");
assertIncludes(prd, "## 9. Verification", "PRD missing verification section.");
assertIncludes(prd, "Document.md", "PRD must describe the Bundle folder shape.");
assertIncludes(prd, "assets/", "PRD must describe the Bundle assets folder.");

assertIncludes(readme, "npm run verify", "README missing main validation command.");
assertIncludes(readme, "native Files pane", "README missing native Files pane direction.");
assertIncludes(readme, "Hide Bundle internals", "README missing native internals hiding feature.");
assertIncludes(manualQa, "npm run verify", "manual QA missing standard gate.");
assertIncludes(manualQa, "External Gaps", "manual QA missing external gaps.");
assertIncludes(manualQa, "native Files pane", "manual QA missing native Files pane check.");
assertIncludes(manualQa, "are hidden under the Bundle", "manual QA missing Bundle internals hidden check.");
assertIncludes(releaseNotes, "Status: release candidate.", "release notes missing release status.");
assertIncludes(releaseNotes, "Native File Explorer enhancement", "release notes missing native File Explorer inclusion.");
assertIncludes(releaseNotes, "intentionally lightweight", "release notes missing native File Explorer limitation.");
assertIncludes(releaseNotes, "hides their internals", "release notes missing native internals hiding inclusion.");

assertIncludes(mainTs, "NativeFileExplorerPatch", "main.ts must enable the native File Explorer patch.");
assertIncludes(styles, ".documents-bundle-native-bundle-title", "styles.css must include the native Bundle title marker.");
assertIncludes(styles, ".documents-bundle-native-bundle-children", "styles.css must include the native Bundle internals hiding marker.");

assertExcludes(mainTs, "documents-bundle-explorer", "main.ts must not register the deleted custom explorer view type.");
assertExcludes(mainTs, "BundleExplorerView", "main.ts must not import the deleted custom explorer view.");
assertExcludes(mainTs, "open-documents-bundle-explorer", "main.ts must not register the deleted custom explorer command.");

console.log(JSON.stringify({
  docsValidation: true,
  checkedScripts: requiredScripts.length,
  checkedVerifyCommands: verifyCommands.length
}, null, 2));

async function readRepoFile(relativePath) {
  return readFile(resolve(repoRoot, relativePath), "utf8");
}

async function readProjectFile(relativePath) {
  return readFile(resolve(projectRoot, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(source, needle, message) {
  assert(source.includes(needle), message);
}

function assertExcludes(source, needle, message) {
  assert(!source.includes(needle), message);
}
