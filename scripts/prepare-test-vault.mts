import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");
const vaultRoot = resolve(projectRoot, "test-vault");
const pluginRoot = resolve(vaultRoot, ".obsidian", "plugins", "documents-bundle");

await rm(vaultRoot, { force: true, recursive: true });
await mkdir(pluginRoot, { recursive: true });

for (const file of ["main.js", "manifest.json", "styles.css"]) {
  await copyFile(resolve(projectRoot, file), resolve(pluginRoot, file));
}

await writeFile(
  resolve(vaultRoot, ".obsidian", "community-plugins.json"),
  JSON.stringify(["documents-bundle"], null, 2)
);

await writeFile(
  resolve(vaultRoot, ".obsidian", "app.json"),
  JSON.stringify({ safeMode: false }, null, 2)
);

await mkdir(resolve(vaultRoot, "Existing Bundle", "assets"), { recursive: true });
await writeFile(resolve(vaultRoot, "Existing Bundle", "Existing Bundle.md"), "# Existing Bundle\n\n");

await mkdir(resolve(vaultRoot, "Regular Folder"), { recursive: true });
await writeFile(resolve(vaultRoot, "Regular Folder", "Loose Note.md"), "# Loose Note\n\n");
await writeFile(resolve(vaultRoot, "Standalone.md"), "# Standalone\n\n");

await mkdir(resolve(vaultRoot, "Legacy Attachments", "Project", "assets"), { recursive: true });
await mkdir(resolve(vaultRoot, "Legacy Attachments", "External"), { recursive: true });
await writeFile(
  resolve(vaultRoot, "Legacy Attachments", "Project", "Project.md"),
  [
    "# Project",
    "",
    "![Diagram](../External/diagram.png)",
    "",
    "[Brief](../External/brief.pdf)",
    "",
    "![[Legacy Attachments/External/chart.png|Chart]]",
    ""
  ].join("\n")
);
await writeFile(resolve(vaultRoot, "Legacy Attachments", "External", "diagram.png"), "fake png\n");
await writeFile(resolve(vaultRoot, "Legacy Attachments", "External", "brief.pdf"), "fake pdf\n");
await writeFile(resolve(vaultRoot, "Legacy Attachments", "External", "chart.png"), "fake chart\n");

await mkdir(resolve(vaultRoot, "Shared Attachment", "Alpha", "assets"), { recursive: true });
await mkdir(resolve(vaultRoot, "Shared Attachment", "Beta", "assets"), { recursive: true });
await mkdir(resolve(vaultRoot, "Shared Attachment", "External"), { recursive: true });
await writeFile(
  resolve(vaultRoot, "Shared Attachment", "Alpha", "Alpha.md"),
  "# Alpha\n\n![Shared](../External/shared.png)\n"
);
await writeFile(
  resolve(vaultRoot, "Shared Attachment", "Beta", "Beta.md"),
  "# Beta\n\n![Shared](../External/shared.png)\n"
);
await writeFile(resolve(vaultRoot, "Shared Attachment", "External", "shared.png"), "fake shared png\n");

await mkdir(resolve(vaultRoot, "Conversion Links"), { recursive: true });
await mkdir(resolve(vaultRoot, "Conversion Links", "External"), { recursive: true });
await writeFile(
  resolve(vaultRoot, "Conversion Links", "Plan.md"),
  [
    "# Plan",
    "",
    "![Cover](External/cover.png)",
    "",
    "[Brief](External/brief.pdf)",
    "",
    "![[Conversion Links/External/chart.png|Chart]]",
    ""
  ].join("\n")
);
await writeFile(
  resolve(vaultRoot, "Conversion Links", "Index.md"),
  "# Index\n\n[Plan](Plan.md)\n\n[[Plan|Plan wiki link]]\n"
);
await writeFile(resolve(vaultRoot, "Conversion Links", "External", "cover.png"), "fake cover\n");
await writeFile(resolve(vaultRoot, "Conversion Links", "External", "brief.pdf"), "fake conversion pdf\n");
await writeFile(resolve(vaultRoot, "Conversion Links", "External", "chart.png"), "fake conversion chart\n");

console.log(`Prepared test vault: ${vaultRoot}`);
