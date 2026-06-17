import type { BundleInfo, BundlePaths } from "../types";
import { buildBundlePaths, getBundleInfoFromMainFilePath } from "./bundle";
import { getAvailableDocumentName } from "./naming";
import { assertValidDocumentName, basename, dirname, joinVaultPath, sanitizeDocumentName, stripMarkdownExtension } from "./path";

export interface BundleFileSystem {
  exists(path: string): Promise<boolean>;
  createFolder(path: string): Promise<void>;
  createTextFile(path: string, content: string): Promise<void>;
  readTextFile(path: string): Promise<string>;
  writeTextFile(path: string, content: string): Promise<void>;
  rename(path: string, newPath: string): Promise<void>;
  copyFolder(sourcePath: string, targetPath: string): Promise<void>;
  delete(path: string): Promise<void>;
}

export type BundleRepairAction =
  | { type: "create-assets-folder"; path: string }
  | { type: "create-main-file"; path: string }
  | { type: "rename-main-file"; from: string; to: string };

export interface BundleRepairPlan {
  bundle: BundleInfo;
  actions: BundleRepairAction[];
}

export async function createBundleDocument(
  fs: BundleFileSystem,
  parentPath: string,
  preferredName: string,
  attachmentFolderName = "assets",
  initialContent = ""
): Promise<BundlePaths> {
  assertValidDocumentName(preferredName);

  const safeName = sanitizeDocumentName(preferredName);
  const availableName = await getAvailableDocumentName(fs, parentPath, safeName);
  const paths = buildBundlePaths(parentPath, availableName, attachmentFolderName);

  await fs.createFolder(paths.folderPath);
  await fs.createFolder(paths.assetsFolderPath);
  await fs.createTextFile(paths.mainFilePath, withBundleAliasFrontmatter(initialContent, availableName));

  return paths;
}

export async function convertMarkdownToBundle(
  fs: BundleFileSystem,
  filePath: string,
  attachmentFolderName = "assets"
): Promise<BundleInfo> {
  const fileName = basename(filePath);
  if (!fileName.toLowerCase().endsWith(".md")) {
    throw new Error("Only Markdown files can be converted to bundles.");
  }

  const parentPath = dirname(filePath);
  const documentName = stripMarkdownExtension(fileName);
  const targetName = await getAvailableDocumentName(fs, parentPath, documentName);
  const paths = buildBundlePaths(parentPath, targetName, attachmentFolderName);

  await fs.createFolder(paths.folderPath);
  await fs.rename(filePath, paths.mainFilePath);
  await fs.createFolder(paths.assetsFolderPath);
  await ensureBundleAlias(fs, paths.mainFilePath, targetName);

  return {
    folderPath: paths.folderPath,
    folderName: targetName,
    mainFilePath: paths.mainFilePath,
    assetsFolderPath: paths.assetsFolderPath
  };
}

export async function renameBundle(
  fs: BundleFileSystem,
  bundle: BundleInfo,
  preferredName: string,
  attachmentFolderName = "assets"
): Promise<BundleInfo> {
  assertValidDocumentName(preferredName);

  const safeName = sanitizeDocumentName(preferredName);
  const parentPath = dirname(bundle.folderPath);
  const targetFolderPath = joinVaultPath(parentPath, safeName);
  const targetMainFilePath = joinVaultPath(targetFolderPath, `${safeName}.md`);

  if (targetFolderPath !== bundle.folderPath && await fs.exists(targetFolderPath)) {
    throw new Error(`Cannot rename bundle: target folder "${safeName}" already exists.`);
  }

  await fs.rename(bundle.folderPath, targetFolderPath);

  const movedMainFilePath = joinVaultPath(targetFolderPath, basename(bundle.mainFilePath));
  if (movedMainFilePath !== targetMainFilePath) {
    await fs.rename(movedMainFilePath, targetMainFilePath);
  }
  await ensureBundleAlias(fs, targetMainFilePath, safeName);

  return {
    folderPath: targetFolderPath,
    folderName: safeName,
    mainFilePath: targetMainFilePath,
    assetsFolderPath: joinVaultPath(targetFolderPath, attachmentFolderName)
  };
}

export async function copyBundle(
  fs: BundleFileSystem,
  bundle: BundleInfo,
  targetParentPath: string,
  attachmentFolderName = "assets"
): Promise<BundleInfo> {
  const availableName = await getAvailableDocumentName(fs, targetParentPath, `${bundle.folderName} copy`);
  const targetPaths = buildBundlePaths(targetParentPath, availableName, attachmentFolderName);

  await fs.copyFolder(bundle.folderPath, targetPaths.folderPath);

  const copiedMainPath = joinVaultPath(targetPaths.folderPath, basename(bundle.mainFilePath));
  if (copiedMainPath !== targetPaths.mainFilePath) {
    if (await fs.exists(copiedMainPath)) {
      await fs.rename(copiedMainPath, targetPaths.mainFilePath);
    } else if (!await fs.exists(targetPaths.mainFilePath)) {
      throw new Error(`Copied bundle main file missing: ${targetPaths.mainFilePath}`);
    }
  }
  await ensureBundleAlias(fs, targetPaths.mainFilePath, availableName);

  return {
    folderPath: targetPaths.folderPath,
    folderName: availableName,
    mainFilePath: targetPaths.mainFilePath,
    assetsFolderPath: targetPaths.assetsFolderPath
  };
}

export async function moveBundle(
  fs: BundleFileSystem,
  bundle: BundleInfo,
  targetParentPath: string,
  attachmentFolderName = "assets"
): Promise<BundleInfo> {
  const targetFolderPath = joinVaultPath(targetParentPath, bundle.folderName);
  if (targetFolderPath !== bundle.folderPath && await fs.exists(targetFolderPath)) {
    throw new Error(`Cannot move bundle: target folder "${bundle.folderName}" already exists.`);
  }

  await fs.rename(bundle.folderPath, targetFolderPath);

  return {
    folderPath: targetFolderPath,
    folderName: bundle.folderName,
    mainFilePath: joinVaultPath(targetFolderPath, `${bundle.folderName}.md`),
    assetsFolderPath: joinVaultPath(targetFolderPath, attachmentFolderName)
  };
}

export async function deleteBundle(fs: BundleFileSystem, bundle: BundleInfo): Promise<void> {
  await fs.delete(bundle.folderPath);
}

export function planBundleRepair(folderPath: string, childNames: string[], attachmentFolderName = "assets"): BundleRepairPlan {
  const folderName = basename(folderPath);
  const expectedMainName = `${folderName}.md`;
  const expectedMainPath = joinVaultPath(folderPath, expectedMainName);
  const assetsFolderPath = joinVaultPath(folderPath, attachmentFolderName);
  const markdownChildNames = childNames.filter((name) => name.toLowerCase().endsWith(".md"));
  const actions: BundleRepairAction[] = [];

  if (!childNames.includes(expectedMainName)) {
    if (markdownChildNames.length === 0) {
      actions.push({ type: "create-main-file", path: expectedMainPath });
    } else if (markdownChildNames.length === 1) {
      actions.push({
        type: "rename-main-file",
        from: joinVaultPath(folderPath, markdownChildNames[0]),
        to: expectedMainPath
      });
    } else {
      throw new Error(`Cannot repair bundle "${folderName}": multiple Markdown files found.`);
    }
  }

  if (!childNames.includes(attachmentFolderName)) {
    actions.push({ type: "create-assets-folder", path: assetsFolderPath });
  }

  return {
    bundle: {
      folderPath,
      folderName,
      mainFilePath: expectedMainPath,
      assetsFolderPath
    },
    actions
  };
}

export async function repairBundleStructure(
  fs: BundleFileSystem,
  folderPath: string,
  childNames: string[],
  attachmentFolderName = "assets"
): Promise<BundleRepairPlan> {
  const plan = planBundleRepair(folderPath, childNames, attachmentFolderName);

  for (const action of plan.actions) {
    if (action.type === "create-assets-folder") {
      await fs.createFolder(action.path);
    } else if (action.type === "create-main-file") {
      await fs.createTextFile(action.path, withBundleAliasFrontmatter("", plan.bundle.folderName));
    } else {
      await fs.rename(action.from, action.to);
      await ensureBundleAlias(fs, action.to, plan.bundle.folderName);
    }
  }

  if (await fs.exists(plan.bundle.mainFilePath)) {
    await ensureBundleAlias(fs, plan.bundle.mainFilePath, plan.bundle.folderName);
  }

  return plan;
}

export async function ensureBundleAlias(fs: BundleFileSystem, mainFilePath: string, alias: string): Promise<void> {
  const content = await fs.readTextFile(mainFilePath);
  const nextContent = withBundleAliasFrontmatter(content, alias);
  if (nextContent !== content) {
    await fs.writeTextFile(mainFilePath, nextContent);
  }
}

export function withBundleAliasFrontmatter(content: string, alias: string): string {
  const quotedAlias = quoteYamlString(alias);
  if (content.startsWith("---\n")) {
    const closingIndex = content.indexOf("\n---", 4);
    if (closingIndex > -1) {
      const frontmatter = content.slice(4, closingIndex);
      const rest = content.slice(closingIndex);
      if (frontmatterIncludesAlias(frontmatter, alias)) {
        return content;
      }

      const lines = frontmatter.split("\n");
      const aliasesLineIndex = lines.findIndex((line) => /^aliases\s*:/i.test(line));
      if (aliasesLineIndex > -1) {
        const aliasesLine = lines[aliasesLineIndex];
        const inlineAliases = aliasesLine.match(/^aliases\s*:\s*\[(.*)]\s*$/i);
        if (inlineAliases) {
          const existingAliases = inlineAliases[1]
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean);
          lines.splice(aliasesLineIndex, 1, "aliases:", `  - ${quotedAlias}`, ...existingAliases.map((value) => `  - ${value}`));
        } else {
          lines.splice(aliasesLineIndex + 1, 0, `  - ${quotedAlias}`);
        }
      } else {
        lines.unshift(`aliases:\n  - ${quotedAlias}`);
      }
      return `---\n${lines.join("\n")}${rest}`;
    }
  }

  return `---\naliases:\n  - ${quotedAlias}\n---\n\n${content}`;
}

function frontmatterIncludesAlias(frontmatter: string, alias: string): boolean {
  const escaped = escapeRegExp(alias);
  return new RegExp(`(^|\\n)\\s*-\\s*["']?${escaped}["']?\\s*(\\n|$)`).test(frontmatter)
    || new RegExp(`\\baliases?\\s*:\\s*\\[[^\\]]*["']?${escaped}["']?[^\\]]*\\]`, "i").test(frontmatter);
}

function quoteYamlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"")}"`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function requireBundleFromMainFilePath(filePath: string, attachmentFolderName = "assets"): BundleInfo {
  const bundle = getBundleInfoFromMainFilePath(filePath, attachmentFolderName);
  if (!bundle) {
    throw new Error("The current file is not a bundle main document.");
  }

  return bundle;
}
