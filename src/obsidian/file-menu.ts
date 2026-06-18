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
  openBundleAssets(): unknown;
  migrateAttachments(): unknown;
  renameBundle(): unknown;
}

export interface NormalFolderMenuActions {
  createBundleHere(): unknown;
}

export interface NormalMarkdownMenuActions {
  convertToBundle(): unknown;
}

const englishText = createTranslator("en");

export function addBundleFolderMenuItems(menu: ObsidianMenu, actions: BundleFolderMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.openBundleAssets")).setIcon("folder-open").onClick(() => void actions.openBundleAssets()));
  menu.addItem((item) => item.setTitle(t("menu.migrateAttachments")).setIcon("folder-input").onClick(() => void actions.migrateAttachments()));
  menu.addItem((item) => item.setTitle(t("menu.renameBundle")).setIcon("pencil").onClick(() => void actions.renameBundle()));
}

export function addNormalFolderMenuItems(menu: ObsidianMenu, actions: NormalFolderMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.newBundleDocumentHere")).setIcon("package-plus").onClick(() => void actions.createBundleHere()));
}

export function addNormalMarkdownMenuItems(menu: ObsidianMenu, actions: NormalMarkdownMenuActions, t: Translate = englishText): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle(t("menu.convertToBundle")).setIcon("package").onClick(() => void actions.convertToBundle()));
}
