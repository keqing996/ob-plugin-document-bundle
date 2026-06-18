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
      openBundleAssets: () => calls.push("assets:Project/assets"),
      migrateAttachments: () => calls.push("migrate:Project"),
      renameBundle: () => calls.push("rename:Project")
    });

    expect(menu.entries[0]).toEqual({ type: "separator" });
    expect(menu.items().map((item) => ({ title: item.title, icon: item.icon }))).toEqual([
      { title: "Open bundle assets", icon: "folder-open" },
      { title: "Migrate attachments to bundle", icon: "folder-input" },
      { title: "Rename bundle", icon: "pencil" }
    ]);

    for (const item of menu.items()) {
      item.click();
    }

    expect(calls).toEqual([
      "assets:Project/assets",
      "migrate:Project",
      "rename:Project"
    ]);
  });

  it("adds a creation action for a normal folder", () => {
    const calls: string[] = [];
    const menu = new FakeMenu();

    addNormalFolderMenuItems(menu, {
      createBundleHere: () => calls.push("create:Research")
    });

    expect(menu.entries[0]).toEqual({ type: "separator" });
    expect(menu.items().map((item) => ({ title: item.title, icon: item.icon }))).toEqual([
      { title: "New bundle document here", icon: "package-plus" }
    ]);

    for (const item of menu.items()) {
      item.click();
    }

    expect(calls).toEqual(["create:Research"]);
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
