import { MarkdownView, Notice, Platform, Plugin, TAbstractFile, TFile, TFolder } from "obsidian";
import { getBundleInfoFromFolderPath, getBundleInfoFromMainFilePath, isBundleFolderSnapshot } from "./core/bundle";
import { rewriteDocumentLinks, type DocumentLinkMove } from "./core/document-links";
import { planAttachmentMigration, renderVaultAttachmentMigrationReport, summarizeVaultAttachmentMigration, validateVaultAttachmentMigration, type AttachmentMigrationPlan, type BundleAttachmentMigrationReport, type VaultAttachmentMigrationReport } from "./core/migration";
import { getAvailableFilename } from "./core/naming";
import { copyBundle, convertMarkdownToBundle, createBundleDocument, deleteBundle, moveBundle, renameBundle, repairBundleStructure } from "./core/operations";
import { basename, dirname, formatTimestamp, joinVaultPath } from "./core/path";
import { handleDrop, handlePaste } from "./obsidian/attachments";
import { openAssetsFolderWithFallback } from "./obsidian/assets-folder";
import { BundleSuggestModal } from "./obsidian/bundle-suggest-modal";
import { addBundleFolderMenuItems, addNormalFolderMenuItems, addNormalMarkdownMenuItems } from "./obsidian/file-menu";
import { ObsidianBundleFileSystem } from "./obsidian/fs";
import { PromptModal } from "./obsidian/prompt-modal";
import { DocumentsBundleSettingTab } from "./obsidian/settings-tab";
import { DEFAULT_SETTINGS } from "./settings";
import type { BundleInfo, DocumentsBundleSettings } from "./types";
import { NativeFileExplorerPatch } from "./obsidian/native-file-explorer-patch";

export default class DocumentsBundlePlugin extends Plugin {
  settings: DocumentsBundleSettings = DEFAULT_SETTINGS;
  private fs!: ObsidianBundleFileSystem;
  private nativeFileExplorerPatch: NativeFileExplorerPatch | null = null;

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...await this.loadData() };
    this.fs = new ObsidianBundleFileSystem(this.app.vault, {
      afterBundleMainCopied: async (path) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file);
        }
      }
    });

    this.addSettingTab(new DocumentsBundleSettingTab(this.app, this));

    this.enableNativeFileExplorerPatch();

    this.addCommand({
      id: "new-bundle-document",
      name: "New bundle document",
      callback: () => {
        const parentPath = this.getDefaultParentPath();
        void this.createBundleFromPrompt(parentPath);
      }
    });

    this.addCommand({
      id: "open-bundle-document",
      name: "Open bundle document",
      callback: () => {
        this.openBundleSuggestModal();
      }
    });

    this.addCommand({
      id: "convert-current-note-to-bundle",
      name: "Convert current note to bundle",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        if (!file || file.extension !== "md") {
          return false;
        }

        if (!checking) {
          void this.convertFileToBundle(file);
        }

        return true;
      }
    });

    this.addCommand({
      id: "open-current-bundle-assets-folder",
      name: "Open current bundle assets folder",
      checkCallback: (checking) => {
        const file = this.app.workspace.getActiveFile();
        const bundle = file ? getBundleInfoFromMainFilePath(file.path, this.settings.attachmentFolderName) : null;
        if (!bundle) {
          return false;
        }

        if (!checking) {
          void this.openAssetsFolder(bundle);
        }

        return true;
      }
    });

    this.addCommand({
      id: "repair-current-bundle-structure",
      name: "Repair current bundle structure",
      checkCallback: (checking) => {
        const folder = this.getCurrentRepairFolder();
        if (!folder) {
          return false;
        }

        if (!checking) {
          void this.repairBundleFolder(folder);
        }

        return true;
      }
    });

    this.addCommand({
      id: "preview-current-bundle-attachment-migration",
      name: "Preview current bundle attachment migration",
      checkCallback: (checking) => {
        const file = this.getActiveBundleMainFile();
        if (!file) {
          return false;
        }

        if (!checking) {
          void this.previewAttachmentMigration(file);
        }

        return true;
      }
    });

    this.addCommand({
      id: "migrate-current-bundle-attachments",
      name: "Migrate current bundle attachments",
      checkCallback: (checking) => {
        const file = this.getActiveBundleMainFile();
        if (!file) {
          return false;
        }

        if (!checking) {
          void this.migrateCurrentBundleAttachments(file);
        }

        return true;
      }
    });

    this.addCommand({
      id: "preview-vault-attachment-migration",
      name: "Preview vault attachment migration",
      callback: () => {
        void this.previewVaultAttachmentMigration();
      }
    });

    this.addCommand({
      id: "migrate-vault-attachments",
      name: "Migrate vault attachments",
      callback: () => {
        void this.migrateVaultAttachments();
      }
    });

    this.addCommand({
      id: "scan-bundles",
      name: "Scan bundles",
      callback: () => {
        const result = this.scanBundles();
        new Notice(`Bundles: ${result.bundles}, normal Markdown files: ${result.markdownFiles}, incomplete candidates: ${result.incompleteCandidates}`);
      }
    });

    this.registerEvent(this.app.workspace.on("file-menu", (menu, file) => {
      this.addFileMenuItems(menu, file);
    }));

    this.registerEvent(this.app.workspace.on("editor-paste", (event, editor, view) => {
      if (view instanceof MarkdownView) {
        void handlePaste(this, event, editor, view);
      }
    }));

    this.registerEvent(this.app.workspace.on("editor-drop", (event, editor, view) => {
      if (view instanceof MarkdownView) {
        void handleDrop(this, event, editor, view);
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

  async createBundleFromPrompt(parentPath: string): Promise<void> {
    new PromptModal(this.app, "New bundle document", "Document name", "Create", async (name) => {
      try {
        const paths = await createBundleDocument(this.fs, parentPath, name, this.settings.attachmentFolderName);
        const file = this.app.vault.getAbstractFileByPath(paths.mainFilePath);
        if (file instanceof TFile) {
          await this.app.workspace.getLeaf(false).openFile(file);
        }
        this.refreshNativeFileExplorerPatch();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      }
    }).open();
  }

  async convertFileToBundle(file: TFile): Promise<BundleInfo> {
    try {
      const oldPath = file.path;
      const bundle = await convertMarkdownToBundle(this.fs, file.path, this.settings.attachmentFolderName);
      const rewrittenFiles = await this.rewriteVaultDocumentLinks([{ oldPath, newPath: bundle.mainFilePath }], new Set([bundle.mainFilePath]));
      const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
      if (mainFile instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(mainFile);
      }
      this.refreshNativeFileExplorerPatch();
      new Notice(`Converted to bundle: ${bundle.folderName}. Rewrote ${rewrittenFiles} linked document(s).`);
      return bundle;
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  async openBundle(folderPath: string): Promise<void> {
    const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
    const file = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
    if (file instanceof TFile) {
      await this.app.workspace.getLeaf(false).openFile(file);
    } else {
      new Notice(`Bundle main file not found: ${bundle.mainFilePath}`);
    }
  }

  openBundleSuggestModal(): void {
    new BundleSuggestModal(this).open();
  }

  async renameBundleFromPrompt(folderPath: string): Promise<void> {
    const currentName = basename(folderPath);
    new PromptModal(this.app, "Rename bundle", currentName, "Rename", async (name) => {
      try {
        const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
        const renamed = await renameBundle(this.fs, bundle, name, this.settings.attachmentFolderName);
        await this.openBundle(renamed.folderPath);
        this.refreshNativeFileExplorerPatch();
      } catch (error) {
        new Notice(error instanceof Error ? error.message : String(error));
      }
    }).open();
  }

  async duplicateBundle(folderPath: string): Promise<void> {
    try {
      const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
      const copied = await copyBundle(this.fs, bundle, dirname(folderPath), this.settings.attachmentFolderName);
      await this.openBundle(copied.folderPath);
      this.refreshNativeFileExplorerPatch();
      new Notice(`Duplicated bundle: ${copied.folderName}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async openAssetsFolder(bundle: BundleInfo): Promise<void> {
    try {
      await openAssetsFolderWithFallback({
        ensureFolder: (path) => this.ensureFolder(path),
        adapter: this.app.vault.adapter,
        isDesktopApp: Platform.isDesktopApp,
        notify: (message) => new Notice(message),
        openPath: async (path) => {
          const electron = require("electron") as { shell: { openPath(path: string): Promise<string> } };
          return electron.shell.openPath(path);
        }
      }, bundle);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async repairBundleFolder(folder: TFolder): Promise<void> {
    try {
      const childNames = folder.children.map((child) => child.name);
      const plan = await repairBundleStructure(this.fs, folder.path, childNames, this.settings.attachmentFolderName);
      this.refreshNativeFileExplorerPatch();

      const mainFile = this.app.vault.getAbstractFileByPath(plan.bundle.mainFilePath);
      if (mainFile instanceof TFile) {
        await this.app.workspace.getLeaf(false).openFile(mainFile);
      }

      if (plan.actions.length === 0) {
        new Notice(`Bundle is already valid: ${plan.bundle.folderName}`);
      } else {
        new Notice(`Repaired bundle: ${plan.bundle.folderName}`);
      }
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async previewAttachmentMigration(file: TFile): Promise<void> {
    try {
      const plan = await this.planAttachmentMigrationForFile(file);
      console.info("Documents Bundle attachment migration dry-run", plan);
      new Notice(`Attachment migration dry-run: ${plan.items.length} file(s). Details are in the developer console.`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async migrateCurrentBundleAttachments(file: TFile): Promise<void> {
    try {
      const plan = await this.planAttachmentMigrationForFile(file);
      if (plan.items.length === 0) {
        new Notice("No attachments need migration.");
        return;
      }

      const confirmed = window.confirm(`Move ${plan.items.length} attachment(s) into this bundle's assets folder and rewrite links?`);
      if (!confirmed) {
        return;
      }

      for (const item of plan.items) {
        if (!await this.fs.exists(item.sourcePath)) {
          throw new Error(`Cannot migrate missing attachment: ${item.sourcePath}`);
        }
        if (await this.fs.exists(item.targetPath)) {
          throw new Error(`Cannot migrate attachment: target already exists: ${item.targetPath}`);
        }
      }

      for (const item of plan.items) {
        await this.fs.rename(item.sourcePath, item.targetPath);
      }

      await this.app.vault.modify(file, plan.updatedContent);
      this.refreshNativeFileExplorerPatch();
      new Notice(`Migrated ${plan.items.length} attachment(s) into bundle assets.`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async previewVaultAttachmentMigration(): Promise<void> {
    try {
      const summary = await this.buildVaultAttachmentMigrationReport();
      const validation = validateVaultAttachmentMigration(summary);
      const reportPath = await this.writeVaultMigrationReport(summary);
      console.info("Documents Bundle vault attachment migration dry-run", summary);
      if (validation.errors.length > 0) {
        console.warn("Documents Bundle vault attachment migration issues", validation);
      }
      console.table(summary.reports.flatMap((report) => report.plan.items.map((item) => ({
        bundle: report.bundle.folderPath,
        source: item.sourcePath,
        target: item.targetPath,
        rewritten: item.rewrittenTarget
      }))));
      new Notice(`Vault migration dry-run: ${summary.attachmentsToMove} attachment(s). Report: ${reportPath}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async migrateVaultAttachments(): Promise<void> {
    try {
      const summary = await this.buildVaultAttachmentMigrationReport();
      if (summary.attachmentsToMove === 0) {
        new Notice("No vault attachments need migration.");
        return;
      }

      const validation = validateVaultAttachmentMigration(summary);
      if (validation.errors.length > 0) {
        console.warn("Documents Bundle vault attachment migration blocked", validation);
        new Notice(`Vault migration blocked: ${validation.errors.length} issue(s). Details are in the developer console.`);
        return;
      }

      const sharedSourcePaths = new Set(validation.sharedSourcePaths);
      const confirmed = window.confirm(`Migrate ${summary.attachmentsToMove} attachment reference(s) across ${summary.bundlesWithMigrations} bundle(s) and rewrite their main documents? Shared source files will be copied.`);
      if (!confirmed) {
        return;
      }

      for (const report of summary.reports) {
        for (const item of report.plan.items) {
          if (!await this.fs.exists(item.sourcePath)) {
            throw new Error(`Cannot migrate missing attachment: ${item.sourcePath}`);
          }
          if (await this.fs.exists(item.targetPath)) {
            throw new Error(`Cannot migrate attachment: target already exists: ${item.targetPath}`);
          }
        }
      }

      for (const report of summary.reports) {
        for (const item of report.plan.items) {
          if (sharedSourcePaths.has(item.sourcePath)) {
            await this.copyAttachmentFile(item.sourcePath, item.targetPath);
          } else {
            await this.fs.rename(item.sourcePath, item.targetPath);
          }
        }
      }

      for (const report of summary.reports) {
        if (report.plan.items.length === 0) {
          continue;
        }
        const mainFile = this.app.vault.getAbstractFileByPath(report.notePath);
        if (!(mainFile instanceof TFile)) {
          throw new Error(`Cannot update missing bundle main file: ${report.notePath}`);
        }
        await this.app.vault.modify(mainFile, report.plan.updatedContent);
      }

      this.refreshNativeFileExplorerPatch();
      new Notice(`Migrated ${summary.attachmentsToMove} attachment reference(s) across ${summary.bundlesWithMigrations} bundle(s).`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private async copyAttachmentFile(sourcePath: string, targetPath: string): Promise<void> {
    const source = this.app.vault.getAbstractFileByPath(sourcePath);
    if (!(source instanceof TFile)) {
      throw new Error(`Cannot copy missing attachment: ${sourcePath}`);
    }

    await this.app.vault.createBinary(targetPath, await this.app.vault.readBinary(source));
  }

  async moveBundleFromPrompt(folderPath: string): Promise<void> {
    const currentParentPath = dirname(folderPath);
    new PromptModal(this.app, "Move bundle", currentParentPath || "/", "Move", async (targetParentPath) => {
      await this.moveBundleToParent(folderPath, targetParentPath);
    }).open();
  }

  async moveBundleToParent(folderPath: string, targetParentPath: string): Promise<void> {
    try {
      const normalizedTargetParentPath = targetParentPath === "/" ? "" : targetParentPath;
      if (normalizedTargetParentPath === folderPath || normalizedTargetParentPath.startsWith(`${folderPath}/`)) {
        throw new Error("Cannot move a bundle into itself.");
      }

      const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
      const moved = await moveBundle(this.fs, bundle, normalizedTargetParentPath, this.settings.attachmentFolderName);
      await this.openBundle(moved.folderPath);
      void this.fs.deleteEmptyFolderTree(folderPath).then((deleted) => {
        if (deleted) {
          this.refreshNativeFileExplorerPatch();
        }
      });
      this.refreshNativeFileExplorerPatch();
      new Notice(`Moved bundle: ${moved.folderName}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  async deleteBundleWithConfirm(folderPath: string): Promise<void> {
    try {
      const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
      const confirmed = window.confirm(`Delete "${bundle.folderName}" and all bundled assets?`);
      if (!confirmed) {
        return;
      }

      await deleteBundle(this.fs, bundle);
      this.refreshNativeFileExplorerPatch();
      new Notice(`Deleted bundle: ${bundle.folderName}`);
    } catch (error) {
      new Notice(error instanceof Error ? error.message : String(error));
    }
  }

  private getDefaultParentPath(): string {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return "";
    }

    const activeBundle = getBundleInfoFromMainFilePath(activeFile.path, this.settings.attachmentFolderName);
    if (activeBundle) {
      return dirname(activeBundle.folderPath);
    }

    const parent = activeFile.parent;
    return parent instanceof TFolder ? parent.path : "";
  }

  private addFileMenuItems(menu: import("obsidian").Menu, file: TAbstractFile): void {
    if (file instanceof TFolder) {
      const childNames = file.children.map((child) => child.name);
      const isBundle = isBundleFolderSnapshot(file.path, childNames, this.settings.attachmentFolderName);

      if (isBundle) {
        addBundleFolderMenuItems(menu, {
          openBundle: () => this.openBundle(file.path),
          openBundleAssets: () => this.openAssetsFolder(getBundleInfoFromFolderPath(file.path, this.settings.attachmentFolderName)),
          repairBundle: () => this.repairBundleFolder(file),
          previewAttachmentMigration: () => this.previewBundleFolderAttachmentMigration(file.path),
          migrateAttachments: () => this.migrateBundleFolderAttachments(file.path),
          renameBundle: () => this.renameBundleFromPrompt(file.path),
          duplicateBundle: () => this.duplicateBundle(file.path),
          moveBundle: () => this.moveBundleFromPrompt(file.path)
        });
      } else {
        addNormalFolderMenuItems(menu, {
          createBundleHere: () => this.createBundleFromPrompt(file.path),
          repairFolderAsBundle: () => this.repairBundleFolder(file)
        });
      }
    }

    if (file instanceof TFile && file.extension === "md" && !getBundleInfoFromMainFilePath(file.path, this.settings.attachmentFolderName)) {
      addNormalMarkdownMenuItems(menu, {
        convertToBundle: () => this.convertFileToBundle(file)
      });
    }
  }

  private getActiveBundleMainFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return null;
    }

    const bundle = getBundleInfoFromMainFilePath(file.path, this.settings.attachmentFolderName);
    return bundle ? file : null;
  }

  private getCurrentRepairFolder(): TFolder | null {
    const file = this.app.workspace.getActiveFile();
    if (!file || file.extension !== "md") {
      return null;
    }

    const parent = file.parent;
    if (!(parent instanceof TFolder) || parent.path.length === 0) {
      return null;
    }

    return parent;
  }

  private async previewBundleFolderAttachmentMigration(folderPath: string): Promise<void> {
    const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
    const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
    if (mainFile instanceof TFile) {
      await this.previewAttachmentMigration(mainFile);
    } else {
      new Notice(`Bundle main file not found: ${bundle.mainFilePath}`);
    }
  }

  private async migrateBundleFolderAttachments(folderPath: string): Promise<void> {
    const bundle = getBundleInfoFromFolderPath(folderPath, this.settings.attachmentFolderName);
    const mainFile = this.app.vault.getAbstractFileByPath(bundle.mainFilePath);
    if (mainFile instanceof TFile) {
      await this.migrateCurrentBundleAttachments(mainFile);
    } else {
      new Notice(`Bundle main file not found: ${bundle.mainFilePath}`);
    }
  }

  private async planAttachmentMigrationForFile(file: TFile): Promise<AttachmentMigrationPlan> {
    const bundle = getBundleInfoFromMainFilePath(file.path, this.settings.attachmentFolderName);
    if (!bundle) {
      throw new Error("The current file is not a bundle main document.");
    }

    await this.ensureFolder(bundle.assetsFolderPath);
    const content = await this.app.vault.read(file);

    return planAttachmentMigration({
      bundle,
      notePath: file.path,
      content,
      existingTargetPaths: this.collectExistingAssetPaths(bundle.assetsFolderPath)
    });
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

        const childNames = child.children.map((entry) => entry.name);
        if (isBundleFolderSnapshot(child.path, childNames, this.settings.attachmentFolderName)) {
          bundles.push(getBundleInfoFromFolderPath(child.path, this.settings.attachmentFolderName));
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
        existingTargetPaths: this.collectExistingAssetPaths(bundle.assetsFolderPath)
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
    await this.fs.createTextFile(reportPath, renderVaultAttachmentMigrationReport(summary));

    const reportFile = this.app.vault.getAbstractFileByPath(reportPath);
    if (reportFile instanceof TFile) {
      await this.app.workspace.getLeaf("tab").openFile(reportFile);
    }

    return reportPath;
  }

  private async rewriteVaultDocumentLinks(moves: DocumentLinkMove[], excludedPaths = new Set<string>()): Promise<number> {
    let rewrittenFiles = 0;
    for (const file of this.app.vault.getMarkdownFiles()) {
      if (excludedPaths.has(file.path)) {
        continue;
      }

      const content = await this.app.vault.read(file);
      const result = rewriteDocumentLinks({
        notePath: file.path,
        content,
        moves
      });

      if (result.replacements > 0) {
        await this.app.vault.modify(file, result.updatedContent);
        rewrittenFiles += 1;
      }
    }

    return rewrittenFiles;
  }

  private scanBundles(): { bundles: number; markdownFiles: number; incompleteCandidates: number } {
    let bundles = 0;
    let markdownFiles = 0;
    let incompleteCandidates = 0;

    const walk = (folder: TFolder): void => {
      const childNames = folder.children.map((child) => child.name);
      if (folder.path && isBundleFolderSnapshot(folder.path, childNames, this.settings.attachmentFolderName)) {
        bundles += 1;
        return;
      }

      const expectedMain = folder.path ? `${folder.name}.md` : "";
      const hasMatchingMain = expectedMain.length > 0 && childNames.includes(expectedMain);
      const hasAssets = childNames.includes(this.settings.attachmentFolderName);
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
      attachmentFolderName: this.settings.attachmentFolderName,
      openBundle: (folderPath) => this.openBundle(folderPath)
    });
    this.nativeFileExplorerPatch.enable();
  }

  refreshNativeFileExplorerPatch(): void {
    this.nativeFileExplorerPatch?.refresh();
  }
}
