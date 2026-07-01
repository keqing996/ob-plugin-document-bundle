import type { BundleInfo, BundlePaths } from "../types";
import { basename, dirname, joinVaultPath, sanitizeDocumentName, stripMarkdownExtension } from "./path";

export function buildBundlePaths(parentPath: string, documentName: string, attachmentFolderName = "assets"): BundlePaths {
  const safeName = sanitizeDocumentName(documentName);
  const folderPath = joinVaultPath(parentPath, safeName);

  return {
    folderPath,
    mainFilePath: joinVaultPath(folderPath, `${safeName}.md`),
    assetsFolderPath: joinVaultPath(folderPath, attachmentFolderName)
  };
}

export function getExpectedBundlePaths(folderPath: string, attachmentFolderName = "assets"): BundlePaths {
  const folderName = basename(folderPath);

  return {
    folderPath,
    mainFilePath: joinVaultPath(folderPath, `${folderName}.md`),
    assetsFolderPath: joinVaultPath(folderPath, attachmentFolderName)
  };
}

export function getBundleInfoFromFolderPath(folderPath: string, attachmentFolderName = "assets"): BundleInfo {
  const paths = getExpectedBundlePaths(folderPath, attachmentFolderName);

  return {
    folderPath: paths.folderPath,
    folderName: basename(paths.folderPath),
    mainFilePath: paths.mainFilePath,
    assetsFolderPath: paths.assetsFolderPath
  };
}

export function getBundleInfoFromMainFilePath(mainFilePath: string, attachmentFolderName = "assets"): BundleInfo | null {
  const fileName = basename(mainFilePath);
  if (!fileName.toLowerCase().endsWith(".md")) {
    return null;
  }

  const folderPath = dirname(mainFilePath);
  if (folderPath.length === 0) {
    return null;
  }

  const folderName = basename(folderPath);
  if (stripMarkdownExtension(fileName) !== folderName) {
    return null;
  }

  return {
    folderPath,
    folderName,
    mainFilePath,
    assetsFolderPath: joinVaultPath(folderPath, attachmentFolderName)
  };
}

export type BundleFolderChildSnapshot =
  | string
  | {
      name: string;
      type: "file" | "folder";
    };

export function isBundleFolderSnapshot(folderPath: string, children: BundleFolderChildSnapshot[], attachmentFolderName = "assets"): boolean {
  const folderName = basename(folderPath);
  const expectedMainName = `${folderName}.md`;
  let mainFileCount = 0;
  let assetsFolderCount = 0;

  for (const child of children) {
    const childName = childSnapshotName(child);
    const childType = childSnapshotType(child);

    if (childName === expectedMainName) {
      if (childType === "folder") {
        return false;
      }
      mainFileCount += 1;
      continue;
    }

    if (childName === attachmentFolderName) {
      if (childType === "file") {
        return false;
      }
      assetsFolderCount += 1;
      continue;
    }

    return false;
  }

  return mainFileCount === 1 && assetsFolderCount <= 1;
}

function childSnapshotName(child: BundleFolderChildSnapshot): string {
  return typeof child === "string" ? child : child.name;
}

function childSnapshotType(child: BundleFolderChildSnapshot): "file" | "folder" | null {
  return typeof child === "string" ? null : child.type;
}
