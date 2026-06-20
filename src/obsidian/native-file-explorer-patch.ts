import { Platform, setIcon, TFolder, type App } from "obsidian";
import { getBundleInfoFromFolderPath, isBundleFolderSnapshot, type BundleFolderChildSnapshot } from "../core/bundle";
import type { Translate } from "../i18n";
import type { BundleBadgeMode } from "../types";

export const NATIVE_BUNDLE_CLASS = "documents-bundle-native-bundle";
export const NATIVE_BUNDLE_TITLE_CLASS = "documents-bundle-native-bundle-title";
export const NATIVE_BUNDLE_TITLE_ACTIVE_CLASS = "documents-bundle-native-bundle-title-active";
export const NATIVE_BUNDLE_CHILDREN_CLASS = "documents-bundle-native-bundle-children";
export const NATIVE_BUNDLE_ICON_CLASS = "documents-bundle-native-bundle-icon";
const NATIVE_BUNDLE_ICON_ID = "package";

type OpenBundle = (folderPath: string) => Promise<void>;
type NativeFileExplorerPassName = "desktop" | "mobile";

interface NativeFileExplorerPass {
  name: NativeFileExplorerPassName;
  folderSelector: string;
  titleSelfSelector: string;
  titleSelector: string;
  childrenSelector: string;
  clickThroughSelector: string;
}

const DESKTOP_FILE_EXPLORER_PASS: NativeFileExplorerPass = {
  name: "desktop",
  folderSelector: ".workspace-leaf-content[data-type='file-explorer'] .nav-folder, .nav-folder",
  titleSelfSelector: ".nav-folder-title",
  titleSelector: ":scope > .nav-folder-title, .nav-folder-title",
  childrenSelector: ":scope > .nav-folder-children, :scope > .tree-item-children, .nav-folder-children, .tree-item-children",
  clickThroughSelector: ".nav-folder-collapse-indicator, .tree-item-icon, .collapse-icon"
};

const MOBILE_FILE_EXPLORER_PASS: NativeFileExplorerPass = {
  name: "mobile",
  folderSelector: ".workspace-drawer .tree-item, .workspace-drawer .nav-folder, .mobile-sidebar .tree-item, .mobile-sidebar .nav-folder, .nav-files-container .tree-item, .nav-files-container .nav-folder, .tree-item, .nav-folder",
  titleSelfSelector: ".tree-item-self, .nav-folder-title",
  titleSelector: ":scope > .tree-item-self, :scope > .nav-folder-title, .tree-item-self, .nav-folder-title",
  childrenSelector: ":scope > .tree-item-children, :scope > .nav-folder-children, .tree-item-children, .nav-folder-children",
  clickThroughSelector: ".tree-item-icon, .nav-folder-collapse-indicator, .collapse-icon"
};

const NATIVE_PATH_ATTRIBUTES = ["data-path", "data-file-path", "data-folder-path", "aria-label", "title"] as const;

interface NativeFileExplorerPatchOptions {
  app: App;
  attachmentFolderName: string;
  badgeMode: BundleBadgeMode;
  openBundle: OpenBundle;
  t: Translate;
}

export class NativeFileExplorerPatch {
  private observer: MutationObserver | null = null;
  private refreshFrame: number | null = null;
  private readonly listeners = new Map<Element, EventListener>();

  constructor(private readonly options: NativeFileExplorerPatchOptions) {}

  enable(): void {
    const doc = getActiveDocument();
    if (!doc.body) {
      return;
    }

    this.refresh();
    this.observer = new MutationObserver(() => this.scheduleRefresh());
    this.observer.observe(doc.body, {
      childList: true,
      subtree: true
    });
  }

  disable(): void {
    this.observer?.disconnect();
    this.observer = null;
    if (this.refreshFrame !== null) {
      window.cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
    }

    for (const [element, listener] of this.listeners) {
      element.removeEventListener("click", listener, true);
    }
    this.listeners.clear();

    const doc = getActiveDocument();
    for (const icon of Array.from(doc.querySelectorAll(`.${NATIVE_BUNDLE_ICON_CLASS}`))) {
      icon.remove();
    }
    for (const element of Array.from(doc.querySelectorAll(`.${NATIVE_BUNDLE_CLASS}, .${NATIVE_BUNDLE_TITLE_CLASS}, .${NATIVE_BUNDLE_TITLE_ACTIVE_CLASS}, .${NATIVE_BUNDLE_CHILDREN_CLASS}`))) {
      element.classList.remove(NATIVE_BUNDLE_CLASS, NATIVE_BUNDLE_TITLE_CLASS, NATIVE_BUNDLE_TITLE_ACTIVE_CLASS, NATIVE_BUNDLE_CHILDREN_CLASS);
      delete (element as HTMLElement).dataset.documentsBundlePath;
      delete (element as HTMLElement).dataset.documentsBundleLabel;
      delete (element as HTMLElement).dataset.documentsBundleBadge;
    }
  }

  refresh(): void {
    const doc = getActiveDocument();
    if (!doc.body) {
      return;
    }

    const pass = getNativeFileExplorerPass();
    const bundlePaths = this.collectBundleFolderPaths();
    const folderNodes = doc.querySelectorAll(pass.folderSelector);
    const seenTitles = new Set<Element>();

    for (const node of Array.from(folderNodes)) {
      const title = getFolderTitleElement(node, pass);
      if (!title || seenTitles.has(title)) {
        continue;
      }
      seenTitles.add(title);

      const folderPath = getFolderPathFromNativeNode(node, title, bundlePaths);
      if (folderPath && bundlePaths.has(folderPath)) {
        this.markBundleNode(node, title, folderPath, pass);
      } else {
        this.unmarkBundleNode(node, title, pass);
      }
    }
  }

  scheduleRefresh(): void {
    if (this.refreshFrame !== null) {
      return;
    }

    // Obsidian updates the file explorer in DOM batches; coalesce those mutations into
    // one vault/DOM scan so large vaults do not refresh once per changed node.
    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refresh();
    });
  }

  private markBundleNode(
    node: Element,
    title: Element,
    folderPath: string,
    pass: NativeFileExplorerPass = DESKTOP_FILE_EXPLORER_PASS
  ): void {
    const previousPath = (title as HTMLElement).dataset.documentsBundlePath;
    if (previousPath && previousPath !== folderPath) {
      this.unmarkBundleNode(node, title, pass);
    }

    node.classList.add(NATIVE_BUNDLE_CLASS);
    title.classList.add(NATIVE_BUNDLE_TITLE_CLASS);
    getFolderChildrenElement(node, pass)?.classList.add(NATIVE_BUNDLE_CHILDREN_CLASS);
    (node as HTMLElement).dataset.documentsBundlePath = folderPath;
    (title as HTMLElement).dataset.documentsBundlePath = folderPath;
    this.updateBundleBadge(title);
    this.updateBundleActiveState(title, folderPath);

    if (this.listeners.has(title)) {
      return;
    }

    const listener = ((event: MouseEvent) => {
      if (shouldLetNativeFolderClickContinue(event, pass)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void this.options.openBundle(folderPath);
    }) as EventListener;

    title.addEventListener("click", listener, true);
    this.listeners.set(title, listener);
  }

  private unmarkBundleNode(
    node: Element,
    title: Element,
    pass: NativeFileExplorerPass = DESKTOP_FILE_EXPLORER_PASS
  ): void {
    node.classList.remove(NATIVE_BUNDLE_CLASS);
    title.classList.remove(NATIVE_BUNDLE_TITLE_CLASS, NATIVE_BUNDLE_TITLE_ACTIVE_CLASS);
    getFolderChildrenElement(node, pass)?.classList.remove(NATIVE_BUNDLE_CHILDREN_CLASS);
    delete (node as HTMLElement).dataset.documentsBundlePath;
    delete (title as HTMLElement).dataset.documentsBundlePath;
    delete (title as HTMLElement).dataset.documentsBundleLabel;
    delete (title as HTMLElement).dataset.documentsBundleBadge;
    removeBundleIconElement(title);

    const listener = this.listeners.get(title);
    if (listener) {
      title.removeEventListener("click", listener, true);
      this.listeners.delete(title);
    }
  }

  private updateBundleBadge(title: Element): void {
    const titleEl = title as HTMLElement;
    titleEl.dataset.documentsBundleLabel = this.options.t("badge.bundle");
    titleEl.dataset.documentsBundleBadge = this.options.badgeMode;

    if (this.options.badgeMode !== "icon") {
      removeBundleIconElement(title);
      return;
    }

    const icon = ensureBundleIconElement(title);
    if (icon.dataset.documentsBundleIcon !== NATIVE_BUNDLE_ICON_ID) {
      icon.dataset.documentsBundleIcon = NATIVE_BUNDLE_ICON_ID;
      setIcon(icon, NATIVE_BUNDLE_ICON_ID);
    }
  }

  private updateBundleActiveState(title: Element, folderPath: string): void {
    const activePath = this.options.app.workspace.getActiveFile()?.path;
    const bundle = getBundleInfoFromFolderPath(folderPath, this.options.attachmentFolderName);
    title.classList.toggle(NATIVE_BUNDLE_TITLE_ACTIVE_CLASS, activePath === bundle.mainFilePath);
  }

  private collectBundleFolderPaths(): Set<string> {
    const bundlePaths = new Set<string>();

    const walk = (folder: TFolder): void => {
      for (const child of folder.children) {
        if (!(child instanceof TFolder)) {
          continue;
        }

        if (isBundleFolderSnapshot(child.path, getBundleFolderChildSnapshots(child), this.options.attachmentFolderName)) {
          bundlePaths.add(child.path);
        } else {
          walk(child);
        }
      }
    };

    walk(this.options.app.vault.getRoot());
    return bundlePaths;
  }
}

function getActiveDocument(): Document {
  return activeDocument;
}

function getNativeFileExplorerPass(): NativeFileExplorerPass {
  return Platform.isDesktopApp
    ? DESKTOP_FILE_EXPLORER_PASS
    : MOBILE_FILE_EXPLORER_PASS;
}

export function getFolderPathFromNativeNode(node: Element, title: Element, bundlePaths: Set<string>): string | null {
  for (const element of getPathCandidateElements(node, title)) {
    for (const attribute of NATIVE_PATH_ATTRIBUTES) {
      const value = element.getAttribute(attribute)?.trim();
      if (value && bundlePaths.has(value)) {
        return value;
      }
    }
  }
  return null;
}

function getPathCandidateElements(node: Element, title: Element): Element[] {
  const elements = [title, node];
  for (const attribute of NATIVE_PATH_ATTRIBUTES) {
    for (const candidate of [title.querySelector(`[${attribute}]`), node.querySelector(`[${attribute}]`)]) {
      if (candidate && !elements.includes(candidate)) {
        elements.push(candidate);
      }
    }
  }
  return elements;
}

function getFolderTitleElement(node: Element, pass: NativeFileExplorerPass): Element | null {
  if (node.matches(pass.titleSelfSelector)) {
    return node;
  }
  return node.querySelector(pass.titleSelector);
}

function getFolderChildrenElement(node: Element, pass: NativeFileExplorerPass): Element | null {
  return node.querySelector(pass.childrenSelector);
}

function ensureBundleIconElement(title: Element): HTMLElement {
  const existingIcon = getBundleIconElement(title);
  if (existingIcon) {
    return existingIcon;
  }

  const icon = (title.ownerDocument ?? getActiveDocument()).createElement("span");
  icon.classList.add(NATIVE_BUNDLE_ICON_CLASS);
  icon.setAttribute("aria-hidden", "true");
  title.appendChild(icon);
  return icon;
}

function removeBundleIconElement(title: Element): void {
  getBundleIconElement(title)?.remove();
}

function getBundleIconElement(title: Element): HTMLElement | null {
  return title.querySelector(`.${NATIVE_BUNDLE_ICON_CLASS}`);
}

function shouldLetNativeFolderClickContinue(event: MouseEvent, pass: NativeFileExplorerPass): boolean {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return true;
  }

  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target?.closest(pass.clickThroughSelector));
}

function getBundleFolderChildSnapshots(folder: TFolder): BundleFolderChildSnapshot[] {
  return folder.children.map((child) => ({
    name: child.name,
    type: child instanceof TFolder ? "folder" : "file"
  }));
}
