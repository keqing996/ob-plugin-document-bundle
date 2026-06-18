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

class FakeVault {
  readonly files = new Map<string, StoredBinary>();
  readonly folders = new Set<string>([""]);
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
    this.files.set(path, data);
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

  it("does not intercept pasted files when pasted attachment handling is disabled", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "shot.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault, { handlePastedAttachments: false }),
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

  it("does not intercept dropped files when dropped attachment handling is disabled", async () => {
    const vault = new FakeVault();
    vault.addFolder("Project");
    vault.addFolder("Project/assets");
    vault.addFile("Project/Project.md");
    const editor = new FakeEditor();
    const event = fakeDropEvent([new File(["brief"], "brief.pdf", { type: "application/pdf" })]);

    await handleDrop(
      fakePlugin(vault, { handleDroppedAttachments: false }),
      event as unknown as DragEvent,
      editor as unknown as Editor,
      fakeView("Project/Project.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Project/assets/brief.pdf")).toBe(false);
    expect(editor.inserted).toBe("");
  });

  it("auto-converts normal notes before storing incoming attachments when configured", async () => {
    const vault = new FakeVault();
    vault.addFile("Inbox.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "diagram.png", { type: "image/png" })]);
    const convertedBundle: BundleInfo = {
      folderPath: "Inbox",
      folderName: "Inbox",
      mainFilePath: "Inbox/Inbox.md",
      assetsFolderPath: "Inbox/assets"
    };
    let convertedPath = "";

    const plugin = fakePlugin(vault, {
      pasteIntoNormalNoteBehavior: "auto-convert",
      convertFileToBundle: async (file) => {
        convertedPath = file.path;
        vault.addFolder("Inbox");
        vault.addFolder("Inbox/assets");
        vault.addFile("Inbox/Inbox.md");
        return convertedBundle;
      }
    });

    await handlePaste(
      plugin,
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Inbox.md") as unknown as MarkdownView
    );

    expect(convertedPath).toBe("Inbox.md");
    expect(event.prevented).toBe(true);
    expect(vault.files.has("Inbox/assets/diagram.png")).toBe(true);
    expect(editor.inserted).toBe("![](./assets/diagram.png)");
  });

  it("does not intercept normal-note paste when configured to use Obsidian default behavior", async () => {
    const vault = new FakeVault();
    vault.addFile("Inbox.md");
    const editor = new FakeEditor();
    const event = fakePasteEvent([new File(["image"], "diagram.png", { type: "image/png" })]);

    await handlePaste(
      fakePlugin(vault, { pasteIntoNormalNoteBehavior: "default" }),
      event as unknown as ClipboardEvent,
      editor as unknown as Editor,
      fakeView("Inbox.md") as unknown as MarkdownView
    );

    expect(event.prevented).toBe(false);
    expect(vault.files.has("Inbox/assets/diagram.png")).toBe(false);
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
    handlePastedAttachments?: boolean;
    handleDroppedAttachments?: boolean;
    pasteIntoNormalNoteBehavior?: DocumentsBundleSettings["pasteIntoNormalNoteBehavior"];
    convertFileToBundle?: (file: FakeFileEntry) => Promise<BundleInfo>;
    confirm?: () => Promise<boolean>;
  } = {}
): DocumentsBundlePlugin {
  const settings: DocumentsBundleSettings = {
    attachmentFolderName: "assets",
    handlePastedAttachments: overrides.handlePastedAttachments ?? true,
    handleDroppedAttachments: overrides.handleDroppedAttachments ?? true,
    pasteIntoNormalNoteBehavior: overrides.pasteIntoNormalNoteBehavior ?? "ask",
    enhanceNativeFileExplorer: true,
    imageFilenamePattern: "image-YYYYMMDD-HHmmss",
    useRelativeMarkdownLinks: true
  };

  return {
    app: { vault },
    settings,
    ensureFolder: async (path: string) => {
      await vault.createFolder(path);
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

function extension(name: string): string {
  const index = name.lastIndexOf(".");
  return index === -1 ? "" : name.slice(index + 1);
}
