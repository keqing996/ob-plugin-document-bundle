import type { BundleInfo, BundlePaths } from "../types";
import { buildBundlePaths, getBundleInfoFromMainFilePath } from "./bundle";
import { getAvailableDocumentName } from "./naming";
import { assertValidDocumentName, basename, dirname, joinVaultPath, sanitizeDocumentName, stripMarkdownExtension } from "./path";

export interface BundleFileSystem {
  exists(path: string): Promise<boolean>;
  createFolder(path: string): Promise<void>;
  createTextFile(path: string, content: string): Promise<void>;
  rename(path: string, newPath: string): Promise<void>;
  copyFolder(sourcePath: string, targetPath: string): Promise<void>;
  delete(path: string): Promise<void>;
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
  await fs.createTextFile(paths.mainFilePath, initialContent);

  return paths;
}

export async function convertMarkdownToBundle(
  fs: BundleFileSystem,
  filePath: string,
  attachmentFolderName = "assets",
  plannedBundle?: BundleInfo
): Promise<BundleInfo> {
  const bundle = plannedBundle ?? await planMarkdownBundleConversion(fs, filePath, attachmentFolderName);

  await fs.createFolder(bundle.folderPath);
  await fs.rename(filePath, bundle.mainFilePath);
  await fs.createFolder(bundle.assetsFolderPath);

  return bundle;
}

export async function planMarkdownBundleConversion(
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

export function requireBundleFromMainFilePath(filePath: string, attachmentFolderName = "assets"): BundleInfo {
  const bundle = getBundleInfoFromMainFilePath(filePath, attachmentFolderName);
  if (!bundle) {
    throw new Error("The current file is not a bundle main document.");
  }

  return bundle;
}
