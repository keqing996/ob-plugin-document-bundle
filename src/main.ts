import { getLanguage, MarkdownView, Notice, Platform, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { getBundleInfoFromFolderPath, getBundleInfoFromMainFilePath, isBundleFolderSnapshot, type BundleFolderChildSnapshot } from "./core/bundle";
import { rewriteAttachmentLinksForMovedFile } from "./core/document-links";
import { executeAttachmentMigration, planAttachmentMigration, renderVaultAttachmentMigrationReport, summarizeVaultAttachmentMigration, validateVaultAttachmentMigration, type AttachmentLinkResolveInput, type AttachmentMigrationExecutionReport, type AttachmentMigrationPlan, type BundleAttachmentMigrationReport, type VaultAttachmentMigrationReport } from "./core/migration";
import { getAvailableFilename } from "./core/naming";
import { copyBundle, convertMarkdownToBundle, createBundleDocument, deleteBundle, moveBundle, planMarkdownBundleConversion } from "./core/operations";
import { basename, dirname, formatTimestamp, joinVaultPath, stripMarkdownExtension } from "./core/path";
import { getDropAttachmentTarget, getPasteAttachmentTarget, handleIncomingAttachments } from "./obsidian/attachments";
import { AttachmentMigrationModal } from "./obsidian/attachment-migration-modal";
import { openAssetsFolderWithFallback } from "./obsidian/assets-folder";
import { addBundleFolderMenuItems, addNormalFolderMenuItems, addNormalMarkdownMenuItems } from "./obsidian/file-menu";
import { ObsidianBundleFileSystem } from "./obsidian/fs";
import { promptForNativeRename } from "./obsidian/native-rename";
import { ConfirmModal } from "./obsidian/prompt-modal";
import { DocumentsBundleSettingTab } from "./obsidian/settings-tab";
import { BUNDLE_ASSETS_FOLDER_NAME, DEFAULT_SETTINGS, normalizeSettings } from "./settings";
import type { BundleInfo, DocumentsBundleSettings } from "./types";
import { NativeFileExplorerPatch } from "./obsidian/native-file-explorer-patch";
import { getCurrentLocale, translate, type TranslationKey, type TranslationVars } from "./i18n";

type ElectronShellModule = {
  shell: {
    openPath(path: string): Promise<string>;
  };
};

declare const require: (moduleName: "electron") => ElectronShellModule;

export default class DocumentsBundlePlugin extends Plugin {
  settings: DocumentsBundleSettings = DEFAULT_SETTINGS;
  private fs!: ObsidianBundleFileSystem;
  private nativeFileExplorerPatch: NativeFileExplorerPatch | null = null;

  t(key: TranslationKey, vars?: TranslationVars): string {
    const language = typeof getLanguage === "function" ? getLanguage() : "en";
    return translate(getCurrentLocale(language), key, vars);
  }

  async confirm(message: string): Promise<boolean> {
    return new ConfirmModal(
      this.app,
      message,
      this.t("button.confirm"),
      this.t("button.cancel")
    ).openAndGetConfirmation();
  }

  private errorMessage(error: unknown): string {
    if (!(error instanceof Error)) {
      return String(error);
    }

    const message = error.message;
    if (message === "Document name cannot be empty.") {
      return this.t("error.documentNameEmpty");
    }
    if (message === "Document name contains unsupported characters.") {
      return this.t("error.documentNameInvalid");
    }
    if (message === "Only Markdown files can be converted to bundles.") {
      return this.t("error.onlyMarkdownFilesCanConvert");
    }
    if (message === "The current file is not a bundle main document.") {
      return this.t("error.currentFileNotBundleMain");
    }

    const renameTarget = message.match(/^Cannot rename bundle: target folder "(.+)" already exists\.$/);
    if (renameTarget) {
      return this.t("error.cannotRenameBundleTargetExists", { name: renameTarget[1] });
    }

    const copiedMain = message.match(/^Copied bundle main file missing: (.+)$/);
    if (copiedMain) {
      return this.t("error.copiedBundleMainFileMissing", { path: copiedMain[1] });
    }

    const moveTarget = message.match(/^Cannot move bundle: target folder "(.+)" already exists\.$/);
    if (moveTarget) {
      return this.t("error.cannotMoveBundleTargetExists", { name: moveTarget[1] });
    }

    const unavailableAttachmentTarget = message.match(/^Could not find an available attachment target for "(.+)"\.$/);
    if (unavailableAttachmentTarget) {
      return this.t("error.attachmentTargetUnavailable", { name: unavailableAttachmentTarget[1] });
    }

    return message;
  }

  async onload(): Promise<void> {
    this.settings = normalizeSettings(await this.loadData());
    this.fs = new ObsidianBundleFileSystem(this.app.vault, {
      afterBundleMainCopied: async (path) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file);
        }
      },
      trashFile: async (file) => {
        await this.app.fileManager.trashFile(file);
      }
    });

    this.addSettingTab(new DocumentsBundleSettingTab(this.app, this));

    this.enableNativeFileExplorerPatch();

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      this.addFileMenuItems(menu, file);
    }));

    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      void this.handleVaultRename(file, oldPath);
    }));

    this.registerEvent(this.app.workspace.on("file-open", () => {
      this.refreshNativeFileExplorerPatch();
    }));

    this.registerEvent(this.app.workspace.on("editor-paste", (event, editor, view) => {
      if (event.defaultPrevented) {
        return;
      }
      if (view instanceof MarkdownView) {
        const target = getPasteAttachmentTarget(this, event, view);
        if (!target) {
          return;
        }
        event.preventDefault();
        void handleIncomingAttachments(this, target, editor).catch(() => {
          new Notice(this.t("error.cannotHandleIncomingAttachment"));
        });
      }
    }));

    this.registerEvent(this.app.workspace.on("editor-drop", (event, editor, view) => {
      if (event.defaultPrevented) {
        return;
      }
      if (view instanceof MarkdownView) {
        const target = getDropAttachmentTarget(this, event, view);
        if (!target) {
          return;
        }
        event.preventDefault();
        void handleIncomingAttachments(this, target, editor).catch(() => {
          new Notice(this.t("error.cannotHandleIncomingAttachment"));
        });
      }
    }));
  }

  onunload(): void {
    this.nativeFileExplorerPatch?.disable();
    this.nativeFileExplorerPatch = null;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
    this.enableNativeFileExplorerPatch();
  }

  async pathExists(path: string): Promise<boolean> {
    return this.fs.exists(path);
  }

  async ensureFolder(path: string): Promise<void> {
    await this.fs.createFolder(path);
  }

  async createBundleAndRename(parentPath: string): Promise<void> {
    try {
      const paths = await createBundleDocument(this.fs, parentPath, "Untitled", BUNDLE_ASSETS_FOLDER_NAME);
      const file = this.app.vault.getAbstractFileByPath(paths.mainFilePath);
      if (file instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(file);
      }

      this.refreshNativeFileExplorerPatch();
      const folder = this.app.vault.getAbstractFileByPath(paths.folderPath);
      if (folder instanceof TFolder) {
        await this.renameBundleInline(folder.path);
      }
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  async convertFileToBundle(file: TFile): Promise<BundleInfo | null> {
    try {
      const existingBundle = this.getBundleInfoForFile(file);
      if (existingBundle) {
        return existingBundle;
      }

      const oldPath = file.path;
      const plannedBundle = await planMarkdownBundleConversion(this.fs, file.path, BUNDLE_ASSETS_FOLDER_NAME);
      const attachmentMigrationPlan = await this.planAttachmentMigrationForConvertedFile(file, plannedBundle);
      if (attachmentMigrationPlan.items.length > 0) {
        const confirmed = await this.confirmAttachmentMigration(attachmentMigrationPlan, {
          title: this.t("modal.convertToBundleAttachments.title"),
          description: this.t("modal.convertToBundleAttachments.description", { count: attachmentMigrationPlan.items.length })
        });
        if (!confirmed) {
          return null;
        }
        await this.validateAttachmentMigrationPlan(attachmentMigrationPlan);
      }

      const bundle = await convertMarkdownToBundle(this.fs, file.path, BUNDLE_ASSETS_FOLDER_NAME, plannedBundle);
      const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
      if (mainFile instanceof TFile) {
        if (attachmentMigrationPlan.items.length > 0) {
          await this.executeAttachmentMigrationReports([{ notePath: mainFile.path, plan: attachmentMigrationPlan }]);
        } else {
          await this.rewriteMovedBundleMainAttachmentLinks(mainFile, oldPath);
        }
        await this.app.workspace.getLeaf(false).openFile(mainFile);
      }
      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.convertedToBundle", { name: bundle.folderName, count: attachmentMigrationPlan.items.length }));
      return bundle;
    } catch (error) {
      new Notice(this.errorMessage(error));
      throw error;
    }
  }

  async openBundle(folderPath: string): Promise<void> {
    const bundle = getBundleInfoFromFolderPath(folderPath, BUNDLE_ASSETS_FOLDER_NAME);
    const file = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    } else {
      new Notice(this.t("notice.bundleMainFileNotFound", { path: bundle.mainFilePath }));
    }
  }

  async renameBundleInline(folderPath: string): Promise<void> {
    const folder = this.app.vault.getAbstractFileByPath(folderPath);
    if (!(folder instanceof TFolder)) {
      new Notice(this.t("notice.bundleMainFileNotFound", { path: joinVaultPath(folderPath, `${basename(folderPath)}.md`) }));
      return;
    }

    this.refreshNativeFileExplorerPatch();
    if (!await promptForNativeRename(this.app, folder)) {
      new Notice(this.t("notice.nativeRenameUnavailable"));
    }
  }

  async duplicateBundle(folderPath: string): Promise<void> {
    try {
      const bundle = getBundleInfoFromFolderPath(folderPath, BUNDLE_ASSETS_FOLDER_NAME);
      const copied = await copyBundle(this.fs, bundle, dirname(folderPath), BUNDLE_ASSETS_FOLDER_NAME);
      await this.openBundle(copied.folderPath);
      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.duplicatedBundle", { name: copied.folderName }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  async openAssetsFolder(bundle: BundleInfo): Promise<void> {
    try {
      await openAssetsFolderWithFallback({
        ensureFolder: (path) => this.ensureFolder(path),
        adapter: this.app.vault.adapter,
        isDesktopApp: Platform.isDesktopApp,
        notify: (message) => new Notice(message),
        formatAssetsFolderMessage: (path) => this.t("notice.assetsFolder", { path }),
        openPath: async (path) => {
          // Electron access is guarded by Platform.isDesktopApp in openAssetsFolderWithFallback.
          const electron = require("electron");
          return electron.shell.openPath(path);
        }
      }, bundle);
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  getBundleInfoForFile(file: TFile): BundleInfo | null {
    if (file.extension !== "md") {
      return null;
    }

    const bundle = getBundleInfoFromMainFilePath(file.path, BUNDLE_ASSETS_FOLDER_NAME);
    if (!bundle || !(file.parent instanceof TFolder) || file.parent.path !== bundle.folderPath) {
      return null;
    }

    return isBundleFolderSnapshot(file.parent.path, getBundleFolderChildSnapshots(file.parent), BUNDLE_ASSETS_FOLDER_NAME)
      ? bundle
      : null;
  }

  async migrateCurrentBundleAttachments(file: TFile): Promise<void> {
    try {
      const plan = await this.planAttachmentMigrationForFile(file);
      if (plan.items.length === 0) {
        new Notice(this.t("notice.noAttachmentsNeedMigration"));
        return;
      }

      const confirmed = await this.confirmAttachmentMigration(plan);
      if (!confirmed) {
        return;
      }

      await this.executeAttachmentMigrationReports([{ notePath: file.path, plan }]);
      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.migratedCurrentBundleAttachments", { count: plan.items.length }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  async confirmAttachmentMigration(
    plan: AttachmentMigrationPlan,
    options: { title?: string; description?: string } = {}
  ): Promise<boolean> {
    return new AttachmentMigrationModal(this.app, {
      title: options.title ?? this.t("modal.migrateAttachments.title"),
      description: options.description ?? this.t("modal.migrateAttachments.description", { count: plan.items.length }),
      sourceLabel: this.t("modal.migrateAttachments.source"),
      targetLabel: this.t("modal.migrateAttachments.target"),
      confirmLabel: this.t("button.confirm"),
      cancelLabel: this.t("button.cancel"),
      items: plan.items
    }).openAndGetConfirmation();
  }

  async previewVaultAttachmentMigration(): Promise<void> {
    try {
      const summary = await this.buildVaultAttachmentMigrationReport();
      const reportPath = await this.writeVaultMigrationReport(summary);
      new Notice(this.t("notice.vaultMigrationDryRun", { count: summary.attachmentsToMove, path: reportPath }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  async migrateVaultAttachments(): Promise<void> {
    try {
      const summary = await this.buildVaultAttachmentMigrationReport();
      if (summary.attachmentsToMove === 0) {
        new Notice(this.t("notice.noVaultAttachmentsNeedMigration"));
        return;
      }

      const validation = validateVaultAttachmentMigration(summary);
      if (validation.errors.length > 0) {
        new Notice(this.t("notice.vaultMigrationBlocked", { count: validation.errors.length }));
        return;
      }

      const sharedSourcePaths = new Set(validation.sharedSourcePaths);
      const confirmed = await this.confirm(this.t("confirm.migrateVaultAttachments", {
        attachments: summary.attachmentsToMove,
        bundles: summary.bundlesWithMigrations
      }));
      if (!confirmed) {
        return;
      }

      await this.executeAttachmentMigrationReports(summary.reports, sharedSourcePaths);

      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.migratedVaultAttachments", {
        attachments: summary.attachmentsToMove,
        bundles: summary.bundlesWithMigrations
      }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  private async copyAttachmentFile(sourcePath: string, targetPath: string): Promise<void> {
    const source = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(source instanceof TFile)) {
      throw new Error(this.t("error.cannotCopyMissingAttachment", { path: sourcePath }));
    }

    await this.app.vault.createBinary(targetPath, await this.app.vault.readBinary(source));
  }

  private async executeAttachmentMigrationReports(
    reports: AttachmentMigrationExecutionReport[],
    sharedSourcePaths = new Set<string>()
  ): Promise<void> {
    await executeAttachmentMigration({
      reports,
      sharedSourcePaths,
      exists: (path) => this.fs.exists(path),
      copyAttachment: (sourcePath, targetPath) => this.copyAttachmentFile(sourcePath, targetPath),
      writeNote: (notePath, content) => this.writeBundleMainFile(notePath, content),
      deleteAttachment: (path) => this.fs.delete(path),
      missingSourceMessage: (path) => this.t("error.cannotMigrateMissingAttachment", { path }),
      targetExistsMessage: (path) => this.t("error.cannotMigrateAttachmentTargetExists", { path })
    });
  }

  private async writeBundleMainFile(notePath: string, content: string): Promise<void> {
    const mainFile = this.app.vault.getAbstractFileByPath(notePath);
    if (!(mainFile instanceof TFile)) {
      throw new Error(this.t("error.cannotUpdateMissingBundleMainFile", { path: notePath }));
    }

    await this.app.vault.modify(mainFile, content);
  }

  async moveBundleToParent(folderPath: string, targetParentPath: string): Promise<void> {
    try {
      const normalizedTargetParentPath = targetParentPath === "/" ? "" : targetParentPath;
      if (normalizedTargetParentPath === folderPath || normalizedTargetParentPath.startsWith(`${folderPath}/`)) {
        throw new Error(this.t("error.cannotMoveBundleIntoItself"));
      }

      const bundle = getBundleInfoFromFolderPath(folderPath, BUNDLE_ASSETS_FOLDER_NAME);
      const moved = await moveBundle(this.fs, bundle, normalizedTargetParentPath, BUNDLE_ASSETS_FOLDER_NAME);
      await this.openBundle(moved.folderPath);
      void this.fs.deleteEmptyFolderTree(folderPath).then((deleted) => {
        if (deleted) {
          this.refreshNativeFileExplorerPatch();
        }
      });
      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.movedBundle", { name: moved.folderName }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  async deleteBundleWithConfirm(folderPath: string): Promise<void> {
    try {
      const bundle = getBundleInfoFromFolderPath(folderPath, BUNDLE_ASSETS_FOLDER_NAME);
      const confirmed = await this.confirm(this.t("confirm.deleteBundle", { name: bundle.folderName }));
      if (!confirmed) {
        return;
      }

      await deleteBundle(this.fs, bundle);
      this.refreshNativeFileExplorerPatch();
      new Notice(this.t("notice.deletedBundle", { name: bundle.folderName }));
    } catch (error) {
      new Notice(this.errorMessage(error));
    }
  }

  private addFileMenuItems(menu: import("obsidian").Menu, file: TAbstractFile): void {
    if (file instanceof TFolder) {
      const isBundle = isBundleFolderSnapshot(file.path, getBundleFolderChildSnapshots(file), BUNDLE_ASSETS_FOLDER_NAME);

      if (isBundle) {
        addBundleFolderMenuItems(menu, {
          openBundleAssets: () => this.openAssetsFolder(getBundleInfoFromFolderPath(file.path, BUNDLE_ASSETS_FOLDER_NAME)),
          migrateAttachments: () => this.migrateBundleFolderAttachments(file.path),
          renameBundle: () => this.renameBundleInline(file.path)
        }, this.t.bind(this));
      } else {
        addNormalFolderMenuItems(menu, {
          createBundleHere: () => this.createBundleAndRename(file.path)
        }, this.t.bind(this));
      }
    }

    if (file instanceof TFile && file.extension === "md" && !this.getBundleInfoForFile(file)) {
      addNormalMarkdownMenuItems(menu, {
        convertToBundle: () => this.convertFileToBundle(file)
      }, this.t.bind(this));
    }
  }

  private async migrateBundleFolderAttachments(folderPath: string): Promise<void> {
    const bundle = getBundleInfoFromFolderPath(folderPath, BUNDLE_ASSETS_FOLDER_NAME);
    const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
    if (mainFile instanceof TFile) {
      await this.migrateCurrentBundleAttachments(mainFile);
    } else {
      new Notice(this.t("notice.bundleMainFileNotFound", { path: bundle.mainFilePath }));
    }
  }

  private async handleVaultRename(file: TAbstractFile, oldPath: string): Promise<void> {
    try {
      if (file instanceof TFolder) {
        await this.syncRenamedBundleFolder(file, oldPath);
      } else if (file instanceof TFile) {
        await this.syncRenamedBundleMainFile(file, oldPath);
      }
    } catch (error) {
      new Notice(this.errorMessage(error));
    } finally {
      this.refreshNativeFileExplorerPatch();
    }
  }

  private async syncRenamedBundleFolder(folder: TFolder, oldPath: string): Promise<void> {
    const oldFolderName = basename(oldPath);
    const newFolderName = basename(folder.path);
    if (oldFolderName === newFolderName) {
      return;
    }

    const targetMainFilePath = joinVaultPath(folder.path, `${newFolderName}.md`);
    const currentMainFile = await this.findRenamedBundleMainFile(folder, oldFolderName, BUNDLE_ASSETS_FOLDER_NAME);
    if (!currentMainFile) {
      return;
    }

    const existingTarget = this.app.vault.getAbstractFileByPath(targetMainFilePath);
    if (existingTarget && existingTarget !== currentMainFile) {
      throw new Error(`Cannot rename bundle: target folder "${newFolderName}" already exists.`);
    }

    await this.app.fileManager.renameFile(currentMainFile, targetMainFilePath);
  }

  private async syncRenamedBundleMainFile(file: TFile, oldPath: string): Promise<void> {
    if (file.extension !== "md") {
      return;
    }

    const oldBundle = getBundleInfoFromMainFilePath(oldPath, BUNDLE_ASSETS_FOLDER_NAME);
    if (!oldBundle || dirname(file.path) !== oldBundle.folderPath) {
      return;
    }

    const folder = this.app.vault.getAbstractFileByPath(oldBundle.folderPath);
    if (!(folder instanceof TFolder)) {
      return;
    }

    const newFolderName = stripMarkdownExtension(basename(file.path));
    if (newFolderName === oldBundle.folderName) {
      return;
    }

    if (!hasBundleChildrenWithMainFile(folder, basename(file.path), BUNDLE_ASSETS_FOLDER_NAME)) {
      return;
    }

    const targetFolderPath = joinVaultPath(dirname(oldBundle.folderPath), newFolderName);
    const existingTarget = this.app.vault.getAbstractFileByPath(targetFolderPath);
    if (existingTarget && existingTarget !== folder) {
      throw new Error(`Cannot rename bundle: target folder "${newFolderName}" already exists.`);
    }

    await this.app.fileManager.renameFile(folder, targetFolderPath);
  }

  private async findRenamedBundleMainFile(
    folder: TFolder,
    oldFolderName: string,
    attachmentFolderName: string,
    attempts = 8,
    delayMs = 100
  ): Promise<TFile | null> {
    const currentMainFilePath = joinVaultPath(folder.path, `${oldFolderName}.md`);

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const child = getPendingRenamedBundleMainFile(folder, oldFolderName, attachmentFolderName);
      if (child instanceof TFile) {
        return child;
      }

      const file = this.app.vault.getAbstractFileByPath(currentMainFilePath);
      if (file instanceof TFile && hasPendingRenamedBundleChildren(folder, oldFolderName, attachmentFolderName)) {
        return file;
      }

      if (attempt < attempts - 1) {
        await sleep(delayMs);
      }
    }

    return null;
  }

  private async planAttachmentMigrationForFile(file: TFile): Promise<AttachmentMigrationPlan> {
    const bundle = this.getBundleInfoForFile(file);
    if (!bundle) {
      throw new Error(this.t("error.currentFileNotBundleMain"));
    }

    await this.ensureFolder(bundle.assetsFolderPath);
    const content = await this.app.vault.read(file);

    return planAttachmentMigration({
      bundle,
      notePath: file.path,
      content,
      existingTargetPaths: this.collectExistingAssetPaths(bundle.assetsFolderPath),
      resolveLinkTarget: (link) => this.resolveObsidianAttachmentTarget(link)
    });
  }

  private async planAttachmentMigrationForConvertedFile(file: TFile, bundle: BundleInfo): Promise<AttachmentMigrationPlan> {
    const content = await this.app.vault.read(file);
    const migrationPlan = planAttachmentMigration({
      bundle,
      notePath: file.path,
      content,
      resolveLinkTarget: (link) => this.resolveObsidianAttachmentTarget(link)
    });
    const migratedTargets = new Set(migrationPlan.items.map((item) => item.rewrittenTarget));
    const movedLinkRewrite = rewriteAttachmentLinksForMovedFile({
      oldNotePath: file.path,
      newNotePath: bundle.mainFilePath,
      content: migrationPlan.updatedContent,
      ignoredTargets: migratedTargets
    });

    return {
      items: migrationPlan.items,
      updatedContent: movedLinkRewrite.updatedContent
    };
  }

  private async validateAttachmentMigrationPlan(plan: AttachmentMigrationPlan): Promise<void> {
    for (const item of plan.items) {
      if (!await this.fs.exists(item.sourcePath)) {
        throw new Error(this.t("error.cannotMigrateMissingAttachment", { path: item.sourcePath }));
      }
      if (await this.fs.exists(item.targetPath)) {
        throw new Error(this.t("error.cannotMigrateAttachmentTargetExists", { path: item.targetPath }));
      }
    }
  }

  private collectExistingAssetPaths(assetsFolderPath: string): Set<string> {
    const folder = this.app.vault.getAbstractFileByPath(assetsFolderPath);
    const paths = new Set<string>();
    if (!(folder instanceof TFolder)) {
      return paths;
    }

    const walk = (current: TFolder): void => {
      for (const child of current.children) {
        if (child instanceof TFolder) {
          walk(child);
        } else if (child instanceof TFile) {
          paths.add(child.path);
        }
      }
    };

    walk(folder);
    return paths;
  }

  getAllBundleInfos(): BundleInfo[] {
    const bundles: BundleInfo[] = [];

    const walk = (folder: TFolder): void => {
      for (const child of folder.children) {
        if (!(child instanceof TFolder)) {
          continue;
        }

        if (isBundleFolderSnapshot(child.path, getBundleFolderChildSnapshots(child), BUNDLE_ASSETS_FOLDER_NAME)) {
          bundles.push(getBundleInfoFromFolderPath(child.path, BUNDLE_ASSETS_FOLDER_NAME));
        } else {
          walk(child);
        }
      }
    };

    walk(this.app.vault.getRoot());
    return bundles.sort((a, b) => a.folderPath.localeCompare(b.folderPath));
  }

  private async buildVaultAttachmentMigrationReport(): Promise<VaultAttachmentMigrationReport> {
    const reports: BundleAttachmentMigrationReport[] = [];
    for (const bundle of this.getAllBundleInfos()) {
      const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
      if (!(mainFile instanceof TFile)) {
        continue;
      }

      const content = await this.app.vault.read(mainFile);
      const plan = planAttachmentMigration({
        bundle,
        notePath: mainFile.path,
        content,
        existingTargetPaths: this.collectExistingAssetPaths(bundle.assetsFolderPath),
        resolveLinkTarget: (link) => this.resolveObsidianAttachmentTarget(link)
      });

      reports.push({
        bundle,
        notePath: mainFile.path,
        plan
      });
    }

    return summarizeVaultAttachmentMigration(reports);
  }

  private async writeVaultMigrationReport(summary: VaultAttachmentMigrationReport): Promise<string> {
    const reportFolderPath = "Documents Bundle Reports";
    await this.fs.createFolder(reportFolderPath);
    const reportFilename = await getAvailableFilename(this.fs, reportFolderPath, `attachment-migration-${formatTimestamp(new Date())}.md`);
    const reportPath = joinVaultPath(reportFolderPath, reportFilename);
    await this.fs.createTextFile(reportPath, renderVaultAttachmentMigrationReport(summary, { t: this.t.bind(this) }));

    const reportFile = this.app.vault.getAbstractFileByPath(reportPath);
    if (reportFile instanceof TFile) {
      await this.app.workspace.getLeaf("tab").openFile(reportFile);
    }

    return reportPath;
  }

  private async rewriteMovedBundleMainAttachmentLinks(file: TFile, oldPath: string): Promise<number> {
    const content = await this.app.vault.read(file);
    const result = rewriteAttachmentLinksForMovedFile({
      oldNotePath: oldPath,
      newNotePath: file.path,
      content
    });

    if (result.replacements > 0) {
      await this.app.vault.modify(file, result.updatedContent);
    }

    return result.replacements;
  }

  scanBundles(): { bundles: number; markdownFiles: number; incompleteCandidates: number } {
    let bundles = 0;
    let markdownFiles = 0;
    let incompleteCandidates = 0;

    const walk = (folder: TFolder): void => {
      const childNames = folder.children.map((child) => child.name);
      if (folder.path && isBundleFolderSnapshot(folder.path, getBundleFolderChildSnapshots(folder), BUNDLE_ASSETS_FOLDER_NAME)) {
        bundles += 1;
        return;
      }

      const expectedMain = folder.path ? `${folder.name}.md` : "";
      const hasMatchingMain = expectedMain.length > 0 && childNames.includes(expectedMain);
      const hasAssets = childNames.includes(BUNDLE_ASSETS_FOLDER_NAME);
      if (folder.path && hasMatchingMain !== hasAssets) {
        incompleteCandidates += 1;
      }

      for (const child of folder.children) {
        if (child instanceof TFolder) {
          walk(child);
        } else if (child instanceof TFile && child.extension === "md") {
          markdownFiles += 1;
        }
      }
    };

    walk(this.app.vault.getRoot());
    return { bundles, markdownFiles, incompleteCandidates };
  }

  private enableNativeFileExplorerPatch(): void {
    this.nativeFileExplorerPatch?.disable();
    this.nativeFileExplorerPatch = null;

    if (!this.settings.enhanceNativeFileExplorer) {
      return;
    }

    this.nativeFileExplorerPatch = new NativeFileExplorerPatch({
      app: this.app,
      attachmentFolderName: BUNDLE_ASSETS_FOLDER_NAME,
      badgeMode: this.settings.bundleBadgeMode,
      openBundle: (folderPath) => this.openBundle(folderPath),
      t: this.t.bind(this)
    });
    this.nativeFileExplorerPatch.enable();
  }

  refreshNativeFileExplorerPatch(): void {
    this.nativeFileExplorerPatch?.refresh();
  }

  private resolveObsidianAttachmentTarget(input: AttachmentLinkResolveInput): string | null {
    if (input.kind !== "wiki") {
      return null;
    }

    // Obsidian wiki links can resolve through aliases and shortest paths, so use its index
    // when available instead of guessing from the vault root.
    const linkpath = decodeObsidianLinkTarget(stripObsidianLinkReference(input.target));
    if (linkpath.length === 0) {
      return null;
    }

    return this.app.metadataCache.getFirstLinkpathDest(linkpath, input.notePath)?.path ?? null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getBundleFolderChildSnapshots(folder: TFolder): BundleFolderChildSnapshot[] {
  return folder.children.map((child) => ({
    name: child.name,
    type: child instanceof TFolder ? "folder" : "file"
  }));
}

function getPendingRenamedBundleMainFile(folder: TFolder, oldFolderName: string, attachmentFolderName: string): TFile | null {
  if (!hasPendingRenamedBundleChildren(folder, oldFolderName, attachmentFolderName)) {
    return null;
  }

  const mainFileName = `${oldFolderName}.md`;
  const child = folder.children.find((entry) => entry instanceof TFile && entry.name === mainFileName);
  return child instanceof TFile ? child : null;
}

function hasPendingRenamedBundleChildren(folder: TFolder, oldFolderName: string, attachmentFolderName: string): boolean {
  return hasBundleChildrenWithMainFile(folder, `${oldFolderName}.md`, attachmentFolderName);
}

function hasBundleChildrenWithMainFile(folder: TFolder, mainFileName: string, attachmentFolderName: string): boolean {
  let mainFileCount = 0;
  let assetsFolderCount = 0;

  for (const entry of folder.children) {
    if (entry instanceof TFile && entry.name === mainFileName) {
      mainFileCount += 1;
      continue;
    }

    if (entry instanceof TFolder && entry.name === attachmentFolderName) {
      assetsFolderCount += 1;
      continue;
    }

    return false;
  }

  return mainFileCount === 1 && assetsFolderCount <= 1;
}

function stripObsidianLinkReference(target: string): string {
  return target.split("#")[0].split("^")[0];
}

function decodeObsidianLinkTarget(target: string): string {
  try {
    return decodeURI(target);
  } catch {
    return target;
  }
}
