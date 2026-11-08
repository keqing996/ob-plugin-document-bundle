import { TFile, TFolder, type App, type FileManager, type TAbstractFile, type Vault } from "obsidian";
import { basename, dirname, joinVaultPath, stripMarkdownExtension } from "../core/path";
import type { Translate } from "../i18n";
import { BUNDLE_ASSETS_FOLDER_NAME } from "../settings";

// Obsidian's native rename queue snapshots resolved references before moving files
// and applies the link updates afterwards. These methods are not in the public types.
interface RenameManager extends FileManager {
  renameFile: FileManager["renameFile"];
  runAsyncLinkUpdate(move: () => Promise<void>): Promise<void>;
  updateAllLinks(references: unknown): Promise<void>;
  inProgressUpdates: unknown;
}

export class BundleRename {
  private readonly moving = new WeakSet<TAbstractFile>();

  constructor(
    private readonly app: App,
    private readonly isBundleMain: (file: TFile) => boolean,
    private readonly t: Translate
  ) {}

  isMoving(file: TAbstractFile): boolean {
    return this.moving.has(file);
  }

  install(): () => void {
    const manager = this.app.fileManager as RenameManager;
    const original = manager.renameFile;
    let enabled = true;
    const rename: FileManager["renameFile"] = (file, target) => {
      if (!enabled || file.path === target || dirname(file.path) !== dirname(target)
        || (file instanceof TFile && !target.endsWith(".md"))) {
        return original.call(manager, file, target);
      }
      const main = file instanceof TFolder
        ? this.app.vault.getFileByPath(joinVaultPath(file.path, `${file.name}.md`))
        : file;
      if (main instanceof TFile && main.parent && this.isBundleMain(main)) {
        const name = file instanceof TFolder ? basename(target) : stripMarkdownExtension(basename(target));
        return this.renameBundle(manager, main.parent, main, name);
      }
      return original.call(manager, file, target);
    };
    manager.renameFile = rename;
    return () => {
      enabled = false;
      if (manager.renameFile === rename) {
        manager.renameFile = original;
      }
    };
  }

  private async renameBundle(manager: RenameManager, folder: TFolder, main: TFile, name: string): Promise<void> {
    if (typeof manager.runAsyncLinkUpdate !== "function" || typeof manager.updateAllLinks !== "function") {
      throw new Error(this.t("error.bundleRenameLinksUnavailable"));
    }
    const { vault } = this.app;
    const folderTarget = joinVaultPath(dirname(folder.path), name);
    const transaction = this.linkTransaction(manager, folder, main);
    await transaction.runAsyncLinkUpdate(async () => {
      if (main.parent !== folder || dirname(folder.path) !== dirname(folderTarget) || !this.isBundleMain(main)) {
        throw new Error(this.t("error.bundleChangedDuringRename"));
      }
      if (folder.path === folderTarget) return;
      const existing = vault.getAbstractFileByPath(folderTarget);
      if (existing && existing !== folder) {
        throw new Error(this.t("error.cannotRenameBundleTargetExists", { name }));
      }
      const sourceMain = main.path;
      this.moving.add(main);
      this.moving.add(folder);
      try {
        await vault.rename(main, joinVaultPath(folder.path, `${name}.md`));
        try {
          await vault.rename(folder, folderTarget);
        } catch (error) {
          await vault.rename(main, sourceMain);
          throw error;
        }
      } finally {
        this.moving.delete(main);
        this.moving.delete(folder);
      }
    });
  }

  private linkTransaction(manager: RenameManager, folder: TFolder, main: TFile): RenameManager {
    const { vault, metadataCache } = this.app;
    // Only the final link-writing pass sees these overrides. Other renames share
    // Obsidian's queue, but keep their own prompt and link-format preferences.
    const cache = Object.create(metadataCache) as typeof metadataCache;
    cache.fileToLinktext = (file, sourcePath, omitExtension) => {
      if (sourcePath === main.path && file.path.startsWith(`${folder.path}/${BUNDLE_ASSETS_FOLDER_NAME}/`)) {
        return `./${file.path.slice(folder.path.length + 1)}`;
      }
      return metadataCache.fileToLinktext(file, sourcePath, omitExtension);
    };
    const config = vault as Vault & { getConfig(key: string): unknown };
    const linkManager = Object.assign(Object.create(manager) as RenameManager, {
      app: Object.assign(Object.create(this.app) as App, { metadataCache: cache }),
      vault: Object.assign(Object.create(vault) as Vault, {
        getConfig: (key: string) => key === "alwaysUpdateLinks" || config.getConfig(key)
      })
    });
    const transaction = Object.create(manager) as RenameManager;
    transaction.inProgressUpdates = null;
    transaction.updateAllLinks = (references) => manager.updateAllLinks.call(linkManager, references);

    return transaction;
  }
}
