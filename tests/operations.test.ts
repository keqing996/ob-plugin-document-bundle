import { getBundleInfoFromFolderPath } from "../src/core/bundle";
import { copyBundle, convertMarkdownToBundle, createBundleDocument, deleteBundle, moveBundle, planBundleRepair, renameBundle, repairBundleStructure, withBundleAliasFrontmatter } from "../src/core/operations";
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
    await expect(fs.readTextFile("Work/Project Plan/Project Plan.md")).resolves.toContain('  - "Project Plan"');
  });

  it("converts a markdown file into a bundle", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Work");
    await fs.createTextFile("Work/Plan.md", "# Plan");

    const bundle = await convertMarkdownToBundle(fs, "Work/Plan.md");

    expect(bundle.mainFilePath).toBe("Work/Plan/Plan.md");
    await expect(fs.exists("Work/Plan/Plan.md")).resolves.toBe(true);
    const content = await fs.readTextFile("Work/Plan/Plan.md");
    expect(content).toContain('  - "Plan"');
    expect(content).toContain("# Plan");
    await expect(fs.exists("Work/Plan/assets")).resolves.toBe(true);
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
    await expect(fs.readTextFile("New/New.md")).resolves.toContain('  - "New"');
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
    await expect(fs.readTextFile("Project copy/Project copy.md")).resolves.toContain('  - "Project copy"');
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

  it("plans no repair actions for a valid bundle", () => {
    const plan = planBundleRepair("Project", ["Project.md", "assets"]);

    expect(plan.actions).toEqual([]);
    expect(plan.bundle.mainFilePath).toBe("Project/Project.md");
  });

  it("repairs a bundle missing assets", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Project");
    await fs.createTextFile("Project/Project.md", "# Project");

    const plan = await repairBundleStructure(fs, "Project", ["Project.md"]);

    expect(plan.actions).toEqual([{ type: "create-assets-folder", path: "Project/assets" }]);
    await expect(fs.exists("Project/assets")).resolves.toBe(true);
    await expect(fs.readTextFile("Project/Project.md")).resolves.toContain('  - "Project"');
  });

  it("repairs a mismatched main markdown filename", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Project");
    await fs.createFolder("Project/assets");
    await fs.createTextFile("Project/index.md", "# Project");

    const plan = await repairBundleStructure(fs, "Project", ["index.md", "assets"]);

    expect(plan.actions).toEqual([{ type: "rename-main-file", from: "Project/index.md", to: "Project/Project.md" }]);
    await expect(fs.exists("Project/Project.md")).resolves.toBe(true);
    const content = await fs.readTextFile("Project/Project.md");
    expect(content).toContain('  - "Project"');
    expect(content).toContain("# Project");
  });

  it("repairs an empty folder into a bundle", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Project");

    const plan = await repairBundleStructure(fs, "Project", []);

    expect(plan.actions).toEqual([
      { type: "create-main-file", path: "Project/Project.md" },
      { type: "create-assets-folder", path: "Project/assets" }
    ]);
    await expect(fs.exists("Project/Project.md")).resolves.toBe(true);
    await expect(fs.readTextFile("Project/Project.md")).resolves.toContain('  - "Project"');
    await expect(fs.exists("Project/assets")).resolves.toBe(true);
  });

  it("refuses to repair folders with multiple markdown candidates", () => {
    expect(() => planBundleRepair("Project", ["a.md", "b.md", "assets"]))
      .toThrow('Cannot repair bundle "Project": multiple Markdown files found.');
  });

  it("adds bundle aliases to existing frontmatter without duplicating them", () => {
    const content = "---\ntags:\n  - work\n---\n# Project\n";

    const withAlias = withBundleAliasFrontmatter(content, "Project");
    const unchanged = withBundleAliasFrontmatter(withAlias, "Project");

    expect(withAlias).toContain("aliases:\n  - \"Project\"");
    expect(withAlias).toContain("tags:\n  - work");
    expect(unchanged).toBe(withAlias);
  });

  it("expands inline aliases when adding the bundle alias", () => {
    const content = "---\naliases: [Old]\n---\n# Project\n";

    const withAlias = withBundleAliasFrontmatter(content, "Project");

    expect(withAlias).toContain("aliases:\n  - \"Project\"\n  - Old");
  });
});
