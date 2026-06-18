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
  return children.length === 2
    && children.some((child) => childSnapshotName(child) === expectedMainName && childSnapshotType(child) !== "folder")
    && children.some((child) => childSnapshotName(child) === attachmentFolderName && childSnapshotType(child) !== "file");
}

function childSnapshotName(child: BundleFolderChildSnapshot): string {
  return typeof child === "string" ? child : child.name;
}

function childSnapshotType(child: BundleFolderChildSnapshot): "file" | "folder" | null {
  return typeof child === "string" ? null : child.type;
}
