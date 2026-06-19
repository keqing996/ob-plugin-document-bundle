import type { Editor, MarkdownView } from "obsidian";
import type DocumentsBundlePlugin from "../src/main";
import type { BundleInfo, DocumentsBundleSettings } from "../src/types";

vi.mock("obsidian", () => ({
  TFolder: class TFolder {}
}));

const { handleDrop, handlePaste } = await import("../src/obsidian/attachments");

type FakeFileEntry = { path: string; name: string; extension: string };
type FakeFolderEntry = { path: string; name: string; children: unknown[] };
type FakeEntry = FakeFileEntry | FakeFolderEntry;
type StoredBinary = ArrayBuffer;
type FakeChildSnapshot = { name: string; type: "file" | "folder" };

class FakeVault {
  readonly files = new Map<string, StoredBinary>();
  readonly folders = new Set<string>([""]);
  createBinaryError: Error | null = null;
  readonly adapter = {
    exists: async (path: string): Promise<boolean> => this.exists(path)
  };

  addFolder(path: string): void {
    this.folders.add(path);
  }

  addFile(path: string, content = new ArrayBuffer(0)): void {
    this.files.set(path, content);
  }

  getAbstractFileByPath(path: string): FakeEntry | null {
    if (this.files.has(path)) {
      const name = basename(path);
      return { path, name, extension: extension(name) };
    }

    if (this.folders.has(path)) {
      return { path, name: basename(path), children: [] };
    }

    return null;
  }

  async createFolder(path: string): Promise<void> {
    this.folders.add(path);
  }

  async createBinary(path: string, data: ArrayBuffer): Promise<void> {
    if (this.createBinaryError) {
      throw this.createBinaryError;
    }

    this.files.set(path, data);
  }

  directChildren(path: string): FakeChildSnapshot[] {
    const children: FakeChildSnapshot[] = [];
    for (const folderPath of this.folders) {
      if (folderPath !== path && dirname(folderPath) === path) {
        children.push({ name: basename(folderPath), type: "folder" });
      }
    }
    for (const filePath of this.files.keys()) {
      if (dirname(filePath) === path) {
        children.push({ name: basename(filePath), type: "file" });
      }
    }
    return children;
  }

  private exists(path: string): boolean {
    return this.files.has(path) || this.folders.has(path);
  }
}

describe("Obsidian attachment handlers", () => {
  it("stores pasted images inside the active bundle assets folder", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(true);
    expect(vault.files.has("Project/assets/shot.png")).toBe(true);
    expect(editor.inserted).toBe("![](./assets/shot.png)");
  });

  it("does not intercept pasted files when another handler already prevented default behavior", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);
    event.preventDefault();

    await handlePaste(
      fakePlugin(vault),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(vault.files.has("Project/assets/shot.png")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("does not intercept pasted files when bundle attachment handling is disabled", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault, { handleBundleAttachments: false }),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Project/assets/shot.png")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("stores dropped documents inside the active bundle assets folder", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakeDropEvent([new File(["brief"], "brief.pdf", { type: "application/pdf" })]);

    await handleDrop(
      fakePlugin(vault),
      event as unknown as DragEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(true);
    expect(vault.files.has("Project/assets/brief.pdf")).toBe(true);
    expect(editor.inserted).toBe("[brief.pdf](./assets/brief.pdf)");
  });

  it("does not intercept dropped files when another handler already prevented default behavior", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakeDropEvent([new File(["brief"], "brief.pdf", { type: "application/pdf" })]);
    event.preventDefault();

    await handleDrop(
      fakePlugin(vault),
      event as unknown as DragEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(vault.files.has("Project/assets/brief.pdf")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("does not intercept dropped files when bundle attachment handling is disabled", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakeDropEvent([new File(["brief"], "brief.pdf", { type: "application/pdf" })]);

    await handleDrop(
      fakePlugin(vault, { handleBundleAttachments: false }),
      event as unknown as DragEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Project/assets/brief.pdf")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("treats matching-name markdown inside a non-strict folder as a normal note", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFolder("Project/Extra");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Project/assets/shot.png")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("does not intercept normal-note paste", async () => {
    const vault = new FakeVault();
    vault.addFile("Inbox.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "diagram.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Inbox.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Inbox/assets/diagram.png")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("does not intercept normal-note drop", async () => {
    const vault = new FakeVault();
    vault.addFile("Inbox.md");
    const editor = new FakeEditor();
    const event = fakeDropEvent([new File(["brief"], "brief.pdf", { type: "application/pdf" })]);

    await handleDrop(
      fakePlugin(vault),
      event as unknown as DragEvent,
      editor as unknown as Editor,
      fakeView("Inbox.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Inbox/assets/brief.pdf")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("does not insert a link when a pasted attachment cannot be written", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    vault.createBinaryError = new Error("disk full");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);

    await expect(handlePaste(
      fakePlugin(vault),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    )).rejects.toThrow("disk full");

    expect(event.prevented).toBe(true);
    expect(vault.files.has("Project/assets/shot.png")).toBe(false);
    expect(editor.inserted).toBe("");
  });
});

class FakeEditor {
  inserted = "";

  replaceSelection(text: string): void {
    this.inserted += text;
  }
}

function fakePlugin(
  vault: FakeVault,
  overrides: {
    handleBundleAttachments?: boolean;
    convertFileToBundle?: (file: FakeFileEntry) => Promise<BundleInfo>;
    confirm?: () => Promise<boolean>;
  } = {}
): DocumentsBundlePlugin {
  const settings: DocumentsBundleSettings = {
    handleBundleAttachments: overrides.handleBundleAttachments ?? true,
    enhanceNativeFileExplorer: true,
    bundleBadgeMode: "icon"
  };

  return {
    app: { vault },
    settings,
    ensureFolder: async (path: string) => {
      await vault.createFolder(path);
    },
    getBundleInfoForFile: (file: FakeFileEntry) => {
      const folderPath = dirname(file.path);
      const folderName = basename(folderPath);
      const mainFileName = `${folderName}.md`;
      const children = vault.directChildren(folderPath);
      const isBundle = file.extension === "md"
        && folderPath.length > 0
        && file.name === mainFileName
        && children.length === 2
        && children.some((child) => child.name === mainFileName && child.type === "file")
        && children.some((child) => child.name === "assets" && child.type === "folder");

      if (!isBundle) {
        return null;
      }

      return {
        folderPath,
        folderName,
        mainFilePath: file.path,
        assetsFolderPath: `${folderPath}/assets`
      };
    },
    convertFileToBundle: overrides.convertFileToBundle ?? (async () => {
      throw new Error("Unexpected conversion.");
    }),
    confirm: overrides.confirm ?? (async () => {
      throw new Error("Unexpected confirmation.");
    }),
    t: (key: string) => key
  } as unknown as DocumentsBundlePlugin;
}

function fakeView(path: string): { file: FakeFileEntry } {
  const name = basename(path);
  return {
    file: { path, name, extension: extension(name) }
  };
}

function fakePasteEvent(files: File[]): { clipboardData: { files: File[] }; defaultPrevented: boolean; prevented: boolean; preventDefault(): void } {
  return {
    clipboardData: { files },
    defaultPrevented: false,
    prevented: false,
    preventDefault() {
      this.defaultPrevented = true;
      this.prevented = true;
    }
  };
}

function fakeDropEvent(files: File[]): { dataTransfer: { files: File[] }; defaultPrevented: boolean; prevented: boolean; preventDefault(): void } {
  return {
    dataTransfer: { files },
    defaultPrevented: false,
    prevented: false,
    preventDefault() {
      this.defaultPrevented = true;
      this.prevented = true;
    }
  };
}

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1);
}
