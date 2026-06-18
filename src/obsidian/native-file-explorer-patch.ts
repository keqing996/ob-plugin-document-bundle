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

interface NativeFileExplorerPatchOptions {
  app: App;
  attachmentFolderName: string;
  badgeMode: BundleBadgeMode;
  openBundle: OpenBundle;
  t: Translate;
}

export class NativeFileExplorerPatch {
  private observer: MutationObserver | null = null;
  private readonly listeners = new Map<Element, EventListener>();

  constructor(private readonly options: NativeFileExplorerPatchOptions) {}

  enable(): void {
    const doc = getActiveDocument();
    if (!Platform.isDesktopApp || !doc.body) {
      return;
    }

    this.refresh();
    this.observer = new MutationObserver(() => this.refresh());
    this.observer.observe(doc.body, {
      childList: true,
      subtree: true
    });
  }

  disable(): void {
    this.observer?.disconnect();
    this.observer = null;

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
    if (!Platform.isDesktopApp || !doc.body) {
      return;
    }

    const bundlePaths = this.collectBundleFolderPaths();
    const folderNodes = doc.querySelectorAll(".workspace-leaf-content[data-type='file-explorer'] .nav-folder, .nav-folder");
    const seenTitles = new Set<Element>();

    for (const node of Array.from(folderNodes)) {
      const title = getFolderTitleElement(node);
      if (!title || seenTitles.has(title)) {
        continue;
      }
      seenTitles.add(title);

      const folderPath = getFolderPathFromNativeNode(node, title, bundlePaths);
      if (folderPath && bundlePaths.has(folderPath)) {
        this.markBundleNode(node, title, folderPath);
      } else {
        this.unmarkBundleNode(node, title);
      }
    }
  }

  private markBundleNode(node: Element, title: Element, folderPath: string): void {
    const previousPath = (title as HTMLElement).dataset.documentsBundlePath;
    if (previousPath && previousPath !== folderPath) {
      this.unmarkBundleNode(node, title);
    }

    node.classList.add(NATIVE_BUNDLE_CLASS);
    title.classList.add(NATIVE_BUNDLE_TITLE_CLASS);
    getFolderChildrenElement(node)?.classList.add(NATIVE_BUNDLE_CHILDREN_CLASS);
    (node as HTMLElement).dataset.documentsBundlePath = folderPath;
    (title as HTMLElement).dataset.documentsBundlePath = folderPath;
    this.updateBundleBadge(title);
    this.updateBundleActiveState(title, folderPath);

    if (this.listeners.has(title)) {
      return;
    }

    const listener = ((event: MouseEvent) => {
      if (shouldLetNativeFolderClickContinue(event)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      void this.options.openBundle(folderPath);
    }) as EventListener;

    title.addEventListener("click", listener, true);
    this.listeners.set(title, listener);
  }

  private unmarkBundleNode(node: Element, title: Element): void {
    node.classList.remove(NATIVE_BUNDLE_CLASS);
    title.classList.remove(NATIVE_BUNDLE_TITLE_CLASS, NATIVE_BUNDLE_TITLE_ACTIVE_CLASS);
    getFolderChildrenElement(node)?.classList.remove(NATIVE_BUNDLE_CHILDREN_CLASS);
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

export function getFolderPathFromNativeNode(node: Element, title: Element, bundlePaths: Set<string>): string | null {
  for (const element of [title, node]) {
    for (const attribute of ["data-path", "aria-label", "title"]) {
      const value = element.getAttribute(attribute)?.trim();
      if (value && bundlePaths.has(value)) {
        return value;
      }
    }
  }
  return null;
}

function getFolderTitleElement(node: Element): Element | null {
  if (node.matches(".nav-folder-title")) {
    return node;
  }
  return node.querySelector(".nav-folder-title");
}

function getFolderChildrenElement(node: Element): Element | null {
  return node.querySelector(":scope > .nav-folder-children, :scope > .tree-item-children")
    || node.querySelector(".nav-folder-children, .tree-item-children");
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

function shouldLetNativeFolderClickContinue(event: MouseEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return true;
  }

  const target = event.target instanceof Element ? event.target : null;
  return Boolean(target?.closest(".nav-folder-collapse-indicator, .tree-item-icon, .collapse-icon"));
}

function getBundleFolderChildSnapshots(folder: TFolder): BundleFolderChildSnapshot[] {
  return folder.children.map((child) => ({
    name: child.name,
    type: child instanceof TFolder ? "folder" : "file"
  }));
}
