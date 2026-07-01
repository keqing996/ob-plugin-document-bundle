import { Notice, TFile, TFolder, type TAbstractFile } from "obsidian";
import type DocumentsBundlePluginType from "../src/main";

vi.mock("obsidian", () => {
  class TAbstractFile {
    path = "";
    name = "";
    parent: TFolder | null = null;
  }

  class TFile extends TAbstractFile {
    extension = "";
  }

  class TFolder extends TAbstractFile {
    children: TAbstractFile[] = [];
  }

  class Plugin {}
  class MarkdownView {}
  class Modal {
    contentEl = fakeElement();

    constructor(readonly app: unknown) {}

    open(): void {}
    close(): void {}
  }
  class PluginSettingTab {
    containerEl = fakeElement();

    constructor(readonly app: unknown, readonly plugin: unknown) {}
  }
  class Setting {
    constructor(readonly containerEl: unknown) {}

    setName(): this { return this; }
    setDesc(): this { return this; }
    setHeading(): this { return this; }
    addButton(callback: (button: FakeButton) => unknown): this {
      callback(new FakeButton());
      return this;
    }
    addToggle(callback: (toggle: FakeToggle) => unknown): this {
      callback(new FakeToggle());
      return this;
    }
    addDropdown(callback: (dropdown: FakeDropdown) => unknown): this {
      callback(new FakeDropdown());
      return this;
    }
  }

  class FakeButton {
    setButtonText(): this { return this; }
    setCta(): this { return this; }
    onClick(): this { return this; }
  }

  class FakeToggle {
    setValue(): this { return this; }
    onChange(): this { return this; }
  }

  class FakeDropdown {
    addOption(): this { return this; }
    setValue(): this { return this; }
    onChange(): this { return this; }
  }

  class Notice {
    static messages: string[] = [];

    constructor(message: string) {
      Notice.messages.push(message);
    }
  }

  function fakeElement(): Record<string, unknown> {
    return {
      empty: () => undefined,
      addClass: () => undefined,
      createEl: () => fakeElement(),
      createDiv: () => fakeElement()
    };
  }

  return {
    getLanguage: () => "en",
    MarkdownView,
    Modal,
    Notice,
    Platform: { isDesktopApp: true },
    Plugin,
    PluginSettingTab,
    Setting,
    setIcon: () => undefined,
    TAbstractFile,
    TFile,
    TFolder
  };
});

const { default: DocumentsBundlePlugin } = await import("../src/main");

describe("bundle rename sync", () => {
  beforeEach(() => {
    noticeMessages().length = 0;
  });

  it("renames the bundle folder when the main markdown file is renamed in place", async () => {
    const main = fakeFile("Notes/Project/New Project.md");
    const assets = fakeFolder("Notes/Project/assets");
    const bundleFolder = fakeFolder("Notes/Project", [main, assets]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, main, "Notes/Project/Project.md");

    expect(vault.renameCalls).toEqual([{
      source: "Notes/Project",
      target: "Notes/New Project"
    }]);
    expect(bundleFolder.path).toBe("Notes/New Project");
    expect(main.path).toBe("Notes/New Project/New Project.md");
    expect(assets.path).toBe("Notes/New Project/assets");
    expect(noticeMessages()).toEqual([]);
  });

  it("renames a minimal bundle folder when its main markdown file is renamed in place", async () => {
    const main = fakeFile("Notes/Project/New Project.md");
    const bundleFolder = fakeFolder("Notes/Project", [main]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, main, "Notes/Project/Project.md");

    expect(vault.renameCalls).toEqual([{
      source: "Notes/Project",
      target: "Notes/New Project"
    }]);
    expect(bundleFolder.path).toBe("Notes/New Project");
    expect(main.path).toBe("Notes/New Project/New Project.md");
    expect(noticeMessages()).toEqual([]);
  });

  it("does not rename folders for ordinary markdown file renames", async () => {
    const note = fakeFile("Notes/New.md");
    const folder = fakeFolder("Notes", [note]);
    const vault = new FakeVault([folder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, note, "Notes/Old.md");

    expect(vault.renameCalls).toEqual([]);
    expect(noticeMessages()).toEqual([]);
  });

  it("does not rename folders when the old bundle folder is no longer strict", async () => {
    const main = fakeFile("Notes/Project/New Project.md");
    const assets = fakeFolder("Notes/Project/assets");
    const extra = fakeFolder("Notes/Project/Extra");
    const bundleFolder = fakeFolder("Notes/Project", [main, assets, extra]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, main, "Notes/Project/Project.md");

    expect(vault.renameCalls).toEqual([]);
    expect(bundleFolder.path).toBe("Notes/Project");
    expect(noticeMessages()).toEqual([]);
  });

  it("reports a conflict when the renamed main file would collide with an existing folder", async () => {
    const main = fakeFile("Notes/Project/New Project.md");
    const assets = fakeFolder("Notes/Project/assets");
    const bundleFolder = fakeFolder("Notes/Project", [main, assets]);
    const existingFolder = fakeFolder("Notes/New Project");
    const vault = new FakeVault([bundleFolder, existingFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, main, "Notes/Project/Project.md");

    expect(vault.renameCalls).toEqual([]);
    expect(bundleFolder.path).toBe("Notes/Project");
    expect(noticeMessages()).toEqual(["error.cannotRenameBundleTargetExists:New Project"]);
  });

  it("keeps renaming the main markdown file when a bundle folder is renamed", async () => {
    const main = fakeFile("Notes/New Project/Project.md");
    const assets = fakeFolder("Notes/New Project/assets");
    const bundleFolder = fakeFolder("Notes/New Project", [main, assets]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, bundleFolder, "Notes/Project");

    expect(vault.renameCalls).toEqual([{
      source: "Notes/New Project/Project.md",
      target: "Notes/New Project/New Project.md"
    }]);
    expect(main.path).toBe("Notes/New Project/New Project.md");
    expect(bundleFolder.path).toBe("Notes/New Project");
    expect(noticeMessages()).toEqual([]);
  });

  it("keeps renaming the main markdown file when a minimal bundle folder is renamed", async () => {
    const main = fakeFile("Notes/New Project/Project.md");
    const bundleFolder = fakeFolder("Notes/New Project", [main]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    await handleVaultRename(plugin, bundleFolder, "Notes/Project");

    expect(vault.renameCalls).toEqual([{
      source: "Notes/New Project/Project.md",
      target: "Notes/New Project/New Project.md"
    }]);
    expect(main.path).toBe("Notes/New Project/New Project.md");
    expect(bundleFolder.path).toBe("Notes/New Project");
    expect(noticeMessages()).toEqual([]);
  });
});

describe("plugin bundle recognition", () => {
  it("recognizes a folder with only a same-name markdown file as a bundle", () => {
    const main = fakeFile("Notes/Project/Project.md");
    const bundleFolder = fakeFolder("Notes/Project", [main]);
    const vault = new FakeVault([bundleFolder]);
    const plugin = fakePlugin(vault);

    expect(plugin.getBundleInfoForFile(main)).toEqual({
      folderPath: "Notes/Project",
      folderName: "Project",
      mainFilePath: "Notes/Project/Project.md",
      assetsFolderPath: "Notes/Project/assets"
    });
  });
});

async function handleVaultRename(plugin: DocumentsBundlePluginType, file: TAbstractFile, oldPath: string): Promise<void> {
  await (plugin as unknown as {
    handleVaultRename(file: TAbstractFile, oldPath: string): Promise<void>;
  }).handleVaultRename(file, oldPath);
}

function fakePlugin(vault: FakeVault): DocumentsBundlePluginType {
  const plugin = Object.create(DocumentsBundlePlugin.prototype) as {
    app?: unknown;
    refreshNativeFileExplorerPatch?: () => void;
    t?: (key: string, vars?: Record<string, unknown>) => string;
  };

  plugin.app = {
    vault,
    fileManager: {
      renameFile: async (file: TAbstractFile, targetPath: string) => {
        vault.renameFile(file, targetPath);
      }
    }
  };
  plugin.refreshNativeFileExplorerPatch = () => {
    vault.refreshes += 1;
  };
  plugin.t = (key, vars) => `${key}${vars?.name ? `:${String(vars.name)}` : ""}`;

  return plugin as DocumentsBundlePluginType;
}

function noticeMessages(): string[] {
  return (Notice as unknown as { messages: string[] }).messages;
}

class FakeVault {
  readonly entries = new Map<string, TAbstractFile>();
  readonly renameCalls: Array<{ source: string; target: string }> = [];
  refreshes = 0;

  constructor(entries: TAbstractFile[]) {
    for (const entry of entries) {
      this.addTree(entry);
    }
  }

  getAbstractFileByPath(path: string): TAbstractFile | null {
    return this.entries.get(path) ?? null;
  }

  renameFile(file: TAbstractFile, targetPath: string): void {
    const sourcePath = file.path;
    this.renameCalls.push({ source: sourcePath, target: targetPath });
    this.moveTree(file, targetPath);
  }

  private addTree(entry: TAbstractFile): void {
    this.entries.set(entry.path, entry);
    if (entry instanceof TFolder) {
      for (const child of entry.children) {
        child.parent = entry;
        this.addTree(child);
      }
    }
  }

  private moveTree(entry: TAbstractFile, targetPath: string): void {
    const oldPath = entry.path;
    this.entries.delete(oldPath);
    entry.path = targetPath;
    entry.name = basename(targetPath);
    if (entry instanceof TFile) {
      entry.extension = extension(entry.name);
    }
    this.entries.set(targetPath, entry);

    if (!(entry instanceof TFolder)) {
      return;
    }

    for (const child of entry.children) {
      this.moveTree(child, `${targetPath}${child.path.slice(oldPath.length)}`);
    }
  }
}

function fakeFile(path: string): TFile {
  const file = new TFile();
  file.path = path;
  file.name = basename(path);
  file.extension = extension(file.name);
  return file;
}

function fakeFolder(path: string, children: TAbstractFile[] = []): TFolder {
  const folder = new TFolder();
  folder.path = path;
  folder.name = basename(path);
  folder.children = children;
  for (const child of children) {
    child.parent = folder;
  }
  return folder;
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1);
}
