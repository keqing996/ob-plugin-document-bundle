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
  duplicateBundle(): unknown;
  moveBundle(): unknown;
}

export interface NormalFolderMenuActions {
  createBundleHere(): unknown;
  repairFolderAsBundle(): unknown;
}

export interface NormalMarkdownMenuActions {
  convertToBundle(): unknown;
}

export function addBundleFolderMenuItems(menu: ObsidianMenu, actions: BundleFolderMenuActions): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle("Open bundle").setIcon("file-text").onClick(() => void actions.openBundle()));
  menu.addItem((item) => item.setTitle("Open bundle assets").setIcon("folder-open").onClick(() => void actions.openBundleAssets()));
  menu.addItem((item) => item.setTitle("Repair bundle").setIcon("wrench").onClick(() => void actions.repairBundle()));
  menu.addItem((item) => item.setTitle("Preview attachment migration").setIcon("list-checks").onClick(() => void actions.previewAttachmentMigration()));
  menu.addItem((item) => item.setTitle("Migrate attachments").setIcon("folder-input").onClick(() => void actions.migrateAttachments()));
  menu.addItem((item) => item.setTitle("Rename bundle").setIcon("pencil").onClick(() => void actions.renameBundle()));
  menu.addItem((item) => item.setTitle("Duplicate bundle").setIcon("copy").onClick(() => void actions.duplicateBundle()));
  menu.addItem((item) => item.setTitle("Move bundle").setIcon("move").onClick(() => void actions.moveBundle()));
}

export function addNormalFolderMenuItems(menu: ObsidianMenu, actions: NormalFolderMenuActions): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle("New bundle document here").setIcon("package-plus").onClick(() => void actions.createBundleHere()));
  menu.addItem((item) => item.setTitle("Repair folder as bundle").setIcon("wrench").onClick(() => void actions.repairFolderAsBundle()));
}

export function addNormalMarkdownMenuItems(menu: ObsidianMenu, actions: NormalMarkdownMenuActions): void {
  menu.addSeparator();
  menu.addItem((item) => item.setTitle("Convert to bundle").setIcon("package").onClick(() => void actions.convertToBundle()));
}
