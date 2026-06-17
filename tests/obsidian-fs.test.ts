import { TFolder } from "obsidian";

vi.mock("obsidian", () => ({
  TFolder: class TFolder {}
}));

const { copyFolderRecursive, isFolderTreeEmpty } = await import("../src/obsidian/fs");

describe("Obsidian bundle filesystem", () => {
  it("copies non-Markdown bundle files through the adapter to avoid attachment plugin relocation hooks", async () => {
    const source = fakeFolder("Project", [
      fakeFile("Project.md", "md", "# Project\n"),
      fakeFolder("assets", [
        fakeFile("brief.pdf", "pdf", new Uint8Array([1, 2, 3]).buffer)
      ])
    ]);
    const vault = new FakeVault(source);
    const copiedBundleMains: string[] = [];

    await copyFolderRecursive(vault as never, source as never, "Project copy", {
      afterBundleMainCopied: async (path) => {
        copiedBundleMains.push(path);
      },
      renameBundleMainToTarget: true
    });

    expect(vault.createdFolders).toEqual(["Project copy", "Project copy/assets"]);
    expect(vault.createdTextFiles).toEqual([["Project copy/Project copy.md", "# Project\n"]]);
    expect(copiedBundleMains).toEqual(["Project copy/Project copy.md"]);
    expect(vault.adapterBinaryWrites).toEqual([["Project copy/assets/brief.pdf", new Uint8Array([1, 2, 3]).buffer]]);
    expect(vault.relocatedBinaryWrites).toEqual([]);
  });

  it("detects only folder trees without files as empty", () => {
    expect(isFolderTreeEmpty(fakeFolder("empty", [fakeFolder("nested", [])]) as never)).toBe(true);
    expect(isFolderTreeEmpty(fakeFolder("with file", [fakeFolder("nested", [fakeFile("brief.pdf", "pdf", new ArrayBuffer(0))])]) as never)).toBe(false);
  });
});

type FakeFile = {
  name: string;
  extension: string;
  text?: string;
  binary?: ArrayBuffer;
};

type FakeFolder = TFolder & {
  name: string;
  children: Array<FakeFolder | FakeFile>;
};

class FakeVault {
  readonly createdFolders: string[] = [];
  readonly createdTextFiles: Array<[string, string]> = [];
  readonly relocatedBinaryWrites: Array<[string, ArrayBuffer]> = [];
  readonly adapterBinaryWrites: Array<[string, ArrayBuffer]> = [];
  readonly adapter = {
    writeBinary: async (path: string, data: ArrayBuffer): Promise<void> => {
      this.adapterBinaryWrites.push([path, data]);
    }
  };

  constructor(readonly root: FakeFolder) {}

  async createFolder(path: string): Promise<void> {
    this.createdFolders.push(path);
  }

  async create(path: string, content: string): Promise<void> {
    this.createdTextFiles.push([path, content]);
  }

  async createBinary(path: string, data: ArrayBuffer): Promise<void> {
    this.relocatedBinaryWrites.push([`Project/assets/${path}`, data]);
  }

  async read(file: FakeFile): Promise<string> {
    return file.text ?? "";
  }

  async readBinary(file: FakeFile): Promise<ArrayBuffer> {
    return file.binary ?? new ArrayBuffer(0);
  }
}

function fakeFolder(name: string, children: Array<FakeFolder | FakeFile>): FakeFolder {
  const folder = { name, children };
  Object.setPrototypeOf(folder, TFolder.prototype);
  return folder as FakeFolder;
}

function fakeFile(name: string, extension: string, content: string | ArrayBuffer): FakeFile {
  return typeof content === "string"
    ? { name, extension, text: content }
    : { name, extension, binary: content };
}
