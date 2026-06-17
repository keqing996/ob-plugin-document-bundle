import { getAvailableFilename } from "../src/core/naming";
import { MemoryBundleFileSystem } from "./memory-fs";

describe("naming", () => {
  it("keeps available filenames", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Doc");
    await fs.createFolder("Doc/assets");

    await expect(getAvailableFilename(fs, "Doc/assets", "brief.pdf")).resolves.toBe("brief.pdf");
  });

  it("increments duplicate filenames before the extension", async () => {
    const fs = new MemoryBundleFileSystem();
    await fs.createFolder("Doc");
    await fs.createFolder("Doc/assets");
    await fs.createTextFile("Doc/assets/brief.pdf", "x");

    await expect(getAvailableFilename(fs, "Doc/assets", "brief.pdf")).resolves.toBe("brief-1.pdf");
  });
});

