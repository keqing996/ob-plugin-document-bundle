import { buildBundlePaths, getBundleInfoFromMainFilePath, isBundleFolderSnapshot } from "../src/core/bundle";

describe("bundle model", () => {
  it("builds standard bundle paths", () => {
    expect(buildBundlePaths("Work", "Project Plan")).toEqual({
      folderPath: "Work/Project Plan",
      mainFilePath: "Work/Project Plan/Project Plan.md",
      assetsFolderPath: "Work/Project Plan/assets"
    });
  });

  it("recognizes xxx/xxx.md as a bundle main file", () => {
    expect(getBundleInfoFromMainFilePath("Work/Meeting/Meeting.md")).toEqual({
      folderPath: "Work/Meeting",
      folderName: "Meeting",
      mainFilePath: "Work/Meeting/Meeting.md",
      assetsFolderPath: "Work/Meeting/assets"
    });
  });

  it("rejects markdown files whose names do not match their folders", () => {
    expect(getBundleInfoFromMainFilePath("Work/Meeting/index.md")).toBeNull();
  });

  it("recognizes folders with same-name markdown and assets", () => {
    expect(isBundleFolderSnapshot("Work/Meeting", [
      { name: "Meeting.md", type: "file" },
      { name: "assets", type: "folder" }
    ])).toBe(true);
  });

  it("recognizes folders with only a same-name markdown file", () => {
    expect(isBundleFolderSnapshot("Work/Meeting", ["Meeting.md"])).toBe(true);
  });

  it("rejects folders missing the same-name markdown file", () => {
    expect(isBundleFolderSnapshot("Work/Meeting", ["assets"])).toBe(false);
  });

  it("rejects folders with extra direct children", () => {
    expect(isBundleFolderSnapshot("Note/Note/PP", [
      { name: "PP.md", type: "file" },
      { name: "assets", type: "folder" },
      { name: "不不不", type: "folder" }
    ])).toBe(false);
  });

  it("requires the attachment child to be a folder", () => {
    expect(isBundleFolderSnapshot("Work/Meeting", [
      { name: "Meeting.md", type: "file" },
      { name: "assets", type: "file" }
    ])).toBe(false);
  });
});
