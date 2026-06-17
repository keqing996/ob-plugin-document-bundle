import {
  addBundleFolderMenuItems,
  addNormalFolderMenuItems,
  addNormalMarkdownMenuItems,
  type ObsidianMenu,
  type ObsidianMenuItem
} from "../src/obsidian/file-menu";

interface CapturedMenuItem {
  title: string;
  icon: string;
  click: () => unknown;
}

type CapturedMenuEntry = { type: "separator" } | ({ type: "item" } & CapturedMenuItem);

class FakeMenu implements ObsidianMenu {
  readonly entries: CapturedMenuEntry[] = [];

  addSeparator(): void {
    this.entries.push({ type: "separator" });
  }

  addItem(callback: (item: ObsidianMenuItem) => unknown): void {
    const item = new FakeMenuItem();
    callback(item);
    this.entries.push({
      type: "item",
      title: item.title,
      icon: item.icon,
      click: item.click
    });
  }

  items(): CapturedMenuItem[] {
    return this.entries.filter((entry): entry is { type: "item" } & CapturedMenuItem => entry.type === "item");
  }
}

class FakeMenuItem implements ObsidianMenuItem {
  title = "";
  icon = "";
  click: () => unknown = () => {};

  setTitle(title: string): ObsidianMenuItem {
    this.title = title;
    return this;
  }

  setIcon(icon: string): ObsidianMenuItem {
    this.icon = icon;
    return this;
  }

  onClick(callback: () => unknown): ObsidianMenuItem {
    this.click = callback;
    return this;
  }
}

describe("Obsidian native file menu helpers", () => {
  it("adds whole-bundle actions for a valid bundle folder", () => {
    const calls: string[] = [];
    const menu = new FakeMenu();

    addBundleFolderMenuItems(menu, {
      openBundle: () => calls.push("open:Project"),
      openBundleAssets: () => calls.push("assets:Project/assets"),
      repairBundle: () => calls.push("repair:Project"),
      previewAttachmentMigration: () => calls.push("preview:Project"),
      migrateAttachments: () => calls.push("migrate:Project"),
      renameBundle: () => calls.push("rename:Project"),
      duplicateBundle: () => calls.push("duplicate:Project"),
      moveBundle: () => calls.push("move:Project")
    });

    expect(menu.entries[0]).toEqual({ type: "separator" });
    expect(menu.items().map((item) => ({ title: item.title, icon: item.icon }))).toEqual([
      { title: "Open bundle", icon: "file-text" },
      { title: "Open bundle assets", icon: "folder-open" },
      { title: "Repair bundle", icon: "wrench" },
      { title: "Preview attachment migration", icon: "list-checks" },
      { title: "Migrate attachments", icon: "folder-input" },
      { title: "Rename bundle", icon: "pencil" },
      { title: "Duplicate bundle", icon: "copy" },
      { title: "Move bundle", icon: "move" }
    ]);

    for (const item of menu.items()) {
      item.click();
    }

    expect(calls).toEqual([
      "open:Project",
      "assets:Project/assets",
      "repair:Project",
      "preview:Project",
      "migrate:Project",
      "rename:Project",
      "duplicate:Project",
      "move:Project"
    ]);
  });

  it("adds creation and repair actions for a normal folder", () => {
    const calls: string[] = [];
    const menu = new FakeMenu();

    addNormalFolderMenuItems(menu, {
      createBundleHere: () => calls.push("create:Research"),
      repairFolderAsBundle: () => calls.push("repair-folder:Research")
    });

    expect(menu.entries[0]).toEqual({ type: "separator" });
    expect(menu.items().map((item) => ({ title: item.title, icon: item.icon }))).toEqual([
      { title: "New bundle document here", icon: "package-plus" },
      { title: "Repair folder as bundle", icon: "wrench" }
    ]);

    for (const item of menu.items()) {
      item.click();
    }

    expect(calls).toEqual(["create:Research", "repair-folder:Research"]);
  });

  it("adds a convert action for a normal Markdown file", () => {
    const calls: string[] = [];
    const menu = new FakeMenu();

    addNormalMarkdownMenuItems(menu, {
      convertToBundle: () => calls.push("convert:Inbox.md")
    });

    expect(menu.entries[0]).toEqual({ type: "separator" });
    expect(menu.items().map((item) => ({ title: item.title, icon: item.icon }))).toEqual([
      { title: "Convert to bundle", icon: "package" }
    ]);

    menu.items()[0].click();

    expect(calls).toEqual(["convert:Inbox.md"]);
  });
});
