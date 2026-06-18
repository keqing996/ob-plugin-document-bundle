import type { TAbstractFile, TFile, Vault } from "obsidian";
import { TFolder } from "obsidian";
import type { BundleFileSystem } from "../core/operations";
import { basename, joinVaultPath } from "../core/path";

export class ObsidianBundleFileSystem implements BundleFileSystem {
  constructor(
    private readonly vault: Vault,
    private readonly options: { afterBundleMainCopied?(path: string): Promise<void> } = {}
  ) {}

  async exists(path: string): Promise<boolean> {
    return this.vault.getAbstractFileByPath(path) !== null || await this.vault.adapter.exists(path);
  }

  async createFolder(path: string): Promise<void> {
    if (!await this.exists(path)) {
      await this.vault.createFolder(path);
    }
  }

  async createTextFile(path: string, content: string): Promise<void> {
    await this.vault.create(path, content);
  }

  async readTextFile(path: string): Promise<string> {
    const file = this.vault.getAbstractFileByPath(path);
    if (!isTFile(file)) {
      throw new Error(`Cannot read text file: ${path}`);
    }

    return this.vault.read(file);
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(path);
    if (!isTFile(file)) {
      throw new Error(`Cannot write text file: ${path}`);
    }

    await this.vault.modify(file, content);
  }

  async rename(path: string, newPath: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(path);
    if (!file) {
      throw new Error(`Cannot rename missing path: ${path}`);
    }

    await this.vault.rename(file, newPath);
  }

  async copyFolder(sourcePath: string, targetPath: string): Promise<void> {
    const source = this.vault.getAbstractFileByPath(sourcePath);
    if (!(source instanceof TFolder)) {
      throw new Error(`Cannot copy non-folder path: ${sourcePath}`);
    }

    await copyFolderRecursive(this.vault, source, targetPath, {
      afterBundleMainCopied: this.options.afterBundleMainCopied
        ? async (path) => {
          await this.options.afterBundleMainCopied?.(path);
        }
        : undefined,
      renameBundleMainToTarget: true
    });
  }

  async delete(path: string): Promise<void> {
    const file = this.vault.getAbstractFileByPath(path);
    if (!file) {
      throw new Error(`Cannot delete missing path: ${path}`);
    }

    // This adapter intentionally depends only on Vault so core bundle operations stay easy to test.
    // eslint-disable-next-line obsidianmd/prefer-file-manager-trash-file
    await this.vault.trash(file, true);
  }

  async deleteEmptyFolderTree(path: string, attempts = 6, delayMs = 150): Promise<boolean> {
    let deleted = false;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      if (await this.vault.adapter.exists(path)) {
        if (await adapterFolderTreeHasFiles(this.vault, path)) {
          return false;
        }

        await this.vault.adapter.rmdir(path, true);
        deleted = true;
      }

      if (attempt < attempts - 1) {
        await sleep(delayMs);
      }
    }

    return deleted && !await this.vault.adapter.exists(path);
  }
}

export function isTFile(file: TAbstractFile | null): file is TFile {
  return Boolean(file && "extension" in file);
}

export function isFolderTreeEmpty(folder: TFolder): boolean {
  return folder.children.every((child) => child instanceof TFolder && isFolderTreeEmpty(child));
}

export interface CopyFolderRecursiveOptions {
  afterBundleMainCopied?(path: string): Promise<void>;
  renameBundleMainToTarget?: boolean;
}

export async function copyFolderRecursive(
  vault: Vault,
  source: TFolder,
  targetPath: string,
  options: CopyFolderRecursiveOptions = {}
): Promise<void> {
  await vault.createFolder(targetPath);
  const bundleMain = options.renameBundleMainToTarget ? findBundleMainFile(source) : null;
  const targetBundleMainPath = bundleMain ? joinVaultPath(targetPath, `${basename(targetPath)}.md`) : null;

  if (bundleMain && targetBundleMainPath) {
    await copyFile(vault, bundleMain, targetBundleMainPath);
    await options.afterBundleMainCopied?.(targetBundleMainPath);
  }

  for (const child of source.children) {
    if (child === bundleMain) {
      continue;
    }

    const childTargetPath = `${targetPath}/${child.name}`;

    if (child instanceof TFolder) {
      await copyFolderRecursive(vault, child, childTargetPath);
    } else if (isTFile(child)) {
      await copyFile(vault, child, childTargetPath);
    }
  }
}

function findBundleMainFile(source: TFolder): TFile | null {
  const expectedMainName = `${source.name}.md`;
  const file = source.children.find((child) => isTFile(child) && child.name === expectedMainName);
  return file && isTFile(file) ? file : null;
}

async function copyFile(vault: Vault, file: TFile, targetPath: string): Promise<void> {
  if (file.extension.toLowerCase() === "md") {
    const content = await vault.read(file);
    await vault.create(targetPath, content);
  } else {
    const data = await vault.readBinary(file);
    await vault.adapter.writeBinary(targetPath, data);
  }
}

async function adapterFolderTreeHasFiles(vault: Vault, path: string): Promise<boolean> {
  const listed = await vault.adapter.list(path);
  if (listed.files.length > 0) {
    return true;
  }

  for (const folderPath of listed.folders) {
    if (await adapterFolderTreeHasFiles(vault, folderPath)) {
      return true;
    }
  }

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
