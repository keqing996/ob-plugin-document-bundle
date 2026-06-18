import { createTranslator, type Translate } from "../i18n";

export interface ObsidianMenu {
  addSeparator(): unknown;
  addItem(callback: (item: ObsidianMenuItem) => unknown): unknown;
}

export interface ObsidianMenuItem {
  setTitle(title: string): ObsidianMenuItem;
  setIcon(icon: string): ObsidianMenuItem;
  onClick(callback: () => unknown): ObsidianMenuItem;
}

export interface BundleFolderMenuActions {
  openBundle(): unknown;
  openBundleAssets(): unknown;
  repairBundle(): unknown;
  previewAttachmentMigration(): unknown;
  migrateAttachments(): unknown;
  renameBundle(): unknown;
}

export interface NormalFolderMenuActions {
  createBundleHere(): unknown;
  repairFolderAsBundle(): unknown;
}

export interface NormalMarkdownMenuActions {
  convertToBundle(): unknown;
}

const englishText = createTranslator("en");

export function addBundleFolderMenuItems(menu: ObsidianMenu, actions: BundleFolderMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.openBundle")).setIcon("file-text").onClick(() => void actions.openBundle()));
  menu.addItem((item) => item.setTitle(t("menu.openBundleAssets")).setIcon("folder-open").onClick(() => void actions.openBundleAssets()));
  menu.addItem((item) => item.setTitle(t("menu.repairBundle")).setIcon("wrench").onClick(() => void actions.repairBundle()));
  menu.addItem((item) => item.setTitle(t("menu.previewAttachmentMigration")).setIcon("list-checks").onClick(() => void actions.previewAttachmentMigration()));
  menu.addItem((item) => item.setTitle(t("menu.migrateAttachments")).setIcon("folder-input").onClick(() => void actions.migrateAttachments()));
  menu.addItem((item) => item.setTitle(t("menu.renameBundle")).setIcon("pencil").onClick(() => void actions.renameBundle()));
}

export function addNormalFolderMenuItems(menu: ObsidianMenu, actions: NormalFolderMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.newBundleDocumentHere")).setIcon("package-plus").onClick(() => void actions.createBundleHere()));
  menu.addItem((item) => item.setTitle(t("menu.repairFolderAsBundle")).setIcon("wrench").onClick(() => void actions.repairFolderAsBundle()));
}

export function addNormalMarkdownMenuItems(menu: ObsidianMenu, actions: NormalMarkdownMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.convertToBundle")).setIcon("package").onClick(() => void actions.convertToBundle()));
}
