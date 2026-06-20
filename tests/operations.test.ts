import { getBundleInfoFromFolderPath } from "../src/core/bundle";
import { copyBundle, convertMarkdownToBundle, createBundleDocument, deleteBundle, moveBundle, planMarkdownBundleConversion, renameBundle } from "../src/core/operations";
import { MemoryBundleFileSystem } from "./memory-fs";

describe("bundle operations", () => {
  it("creates a bundle document", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Work");

    const paths = await createBundleDocument(fs, "Work", "Project Plan");

    expect(paths).toEqual({
      folderPath: "Work/Project Plan",
      mainFilePath: "Work/Project Plan/Project Plan.md",
      assetsFolderPath: "Work/Project Plan/assets"
    });
    await expect(fs.exists("Work/Project Plan/Project Plan.md")).resolves.toBe(true);
    await expect(fs.exists("Work/Project Plan/assets")).resolves.toBe(true);
    await expect(fs.readTextFile("Work/Project Plan/Project Plan.md")).resolves.toBe("");
  });

  it("creates a bundle document without changing supplied initial content", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Work");
    const content = "---\ntags:\n  - work\n---\n# Project\n";

    const paths = await createBundleDocument(fs, "Work", "Project Plan", "assets", content);

    await expect(fs.readTextFile(paths.mainFilePath)).resolves.toBe(content);
  });

  it("converts a markdown file into a bundle", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Work");
    await fs.createTextFile("Work/Plan.md", "# Plan");

    const bundle = await convertMarkdownToBundle(fs, "Work/Plan.md");

    expect(bundle.mainFilePath).toBe("Work/Plan/Plan.md");
    await expect(fs.exists("Work/Plan/Plan.md")).resolves.toBe(true);
    const content = await fs.readTextFile("Work/Plan/Plan.md");
    expect(content).toBe("# Plan");
    await expect(fs.exists("Work/Plan/assets")).resolves.toBe(true);
  });

  it("plans a stable conversion target before converting", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Work");
    await fs.createTextFile("Work/Plan.md", "# Plan");

    const planned = await planMarkdownBundleConversion(fs, "Work/Plan.md");

    expect(planned).toEqual({
      folderPath: "Work/Plan",
      folderName: "Plan",
      mainFilePath: "Work/Plan/Plan.md",
      assetsFolderPath: "Work/Plan/assets"
    });

    await fs.createFolder("Work/Plan");
    await expect(convertMarkdownToBundle(fs, "Work/Plan.md", "assets", planned))
      .rejects.toThrow("Path already exists: Work/Plan");
  });

  it("renames the folder and main markdown file together", async () => {
    const fs = new MemoryBundleFileSystem();
    await createBundleDocument(fs, "", "Old");

    const renamed = await renameBundle(fs, getBundleInfoFromFolderPath("Old"), "New");

    expect(renamed).toMatchObject({
      folderPath: "New",
      mainFilePath: "New/New.md",
      assetsFolderPath: "New/assets"
    });
    await expect(fs.exists("New/New.md")).resolves.toBe(true);
    await expect(fs.readTextFile("New/New.md")).resolves.toBe("");
    await expect(fs.exists("Old/Old.md")).resolves.toBe(false);
  });

  it("copies the whole bundle and renames the copied main file", async () => {
    const fs = new MemoryBundleFileSystem();
    await createBundleDocument(fs, "", "Project");
    await fs.createTextFile("Project/assets/brief.pdf", "binary-ish");

    const copied = await copyBundle(fs, getBundleInfoFromFolderPath("Project"), "");

    expect(copied.folderPath).toBe("Project copy");
    expect(copied.mainFilePath).toBe("Project copy/Project copy.md");
    await expect(fs.exists("Project copy/Project copy.md")).resolves.toBe(true);
    await expect(fs.exists("Project copy/assets/brief.pdf")).resolves.toBe(true);
    await expect(fs.readTextFile("Project copy/Project copy.md")).resolves.toBe("");
  });

  it("moves the whole bundle", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Archive");
    await createBundleDocument(fs, "", "Project");

    const moved = await moveBundle(fs, getBundleInfoFromFolderPath("Project"), "Archive");

    expect(moved.folderPath).toBe("Archive/Project");
    await expect(fs.exists("Archive/Project/Project.md")).resolves.toBe(true);
    await expect(fs.exists("Project/Project.md")).resolves.toBe(false);
  });

  it("deletes the whole bundle", async () => {
    const fs = new MemoryBundleFileSystem();
    await createBundleDocument(fs, "", "Project");

    await deleteBundle(fs, getBundleInfoFromFolderPath("Project"));

    await expect(fs.exists("Project")).resolves.toBe(false);
  });

});
