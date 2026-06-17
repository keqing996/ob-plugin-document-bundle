import { openAssetsFolderWithFallback } from "../src/obsidian/assets-folder";
import type { BundleInfo } from "../src/types";

describe("open assets folder fallback", () => {
  const bundle: BundleInfo = {
    folderPath: "Project",
    folderName: "Project",
    mainFilePath: "Project/Project.md",
    assetsFolderPath: "Project/assets"
  };

  it("uses a Notice fallback on mobile or other non-desktop Obsidian shells", async () => {
    const openedPaths: string[] = [];
    const notices: string[] = [];
    const ensuredPaths: string[] = [];

    const result = await openAssetsFolderWithFallback({
      ensureFolder: async (path) => {
        ensuredPaths.push(path);
      },
      adapter: { getFullPath: (path: string) => `/vault/${path}` },
      isDesktopApp: false,
      notify: (message) => notices.push(message),
      openPath: async (path) => {
        openedPaths.push(path);
        return "";
      }
    }, bundle);

    expect(result).toEqual({ status: "fallback", path: "Project/assets", reason: "not-desktop" });
    expect(ensuredPaths).toEqual(["Project/assets"]);
    expect(openedPaths).toEqual([]);
    expect(notices).toEqual(["Assets folder: Project/assets"]);
  });

  it("uses a Notice fallback when the vault adapter cannot resolve a full filesystem path", async () => {
    const notices: string[] = [];

    const result = await openAssetsFolderWithFallback({
      ensureFolder: async () => {},
      adapter: {},
      isDesktopApp: true,
      notify: (message) => notices.push(message),
      openPath: async () => {
        throw new Error("openPath should not be called");
      }
    }, bundle);

    expect(result).toEqual({ status: "fallback", path: "Project/assets", reason: "missing-full-path" });
    expect(notices).toEqual(["Assets folder: Project/assets"]);
  });

  it("opens the resolved assets folder on desktop when shell access is available", async () => {
    const openedPaths: string[] = [];
    const notices: string[] = [];

    const result = await openAssetsFolderWithFallback({
      ensureFolder: async () => {},
      adapter: { getFullPath: (path: string) => `/Users/example/Vault/${path}` },
      isDesktopApp: true,
      notify: (message) => notices.push(message),
      openPath: async (path) => {
        openedPaths.push(path);
        return "";
      }
    }, bundle);

    expect(result).toEqual({ status: "opened", fullPath: "/Users/example/Vault/Project/assets" });
    expect(openedPaths).toEqual(["/Users/example/Vault/Project/assets"]);
    expect(notices).toEqual([]);
  });

  it("reports desktop shell errors without falling back to a misleading path Notice", async () => {
    const notices: string[] = [];

    const result = await openAssetsFolderWithFallback({
      ensureFolder: async () => {},
      adapter: { getFullPath: (path: string) => `/Users/example/Vault/${path}` },
      isDesktopApp: true,
      notify: (message) => notices.push(message),
      openPath: async () => "No application can open this folder"
    }, bundle);

    expect(result).toEqual({
      status: "open-error",
      fullPath: "/Users/example/Vault/Project/assets",
      message: "No application can open this folder"
    });
    expect(notices).toEqual(["No application can open this folder"]);
  });
});
