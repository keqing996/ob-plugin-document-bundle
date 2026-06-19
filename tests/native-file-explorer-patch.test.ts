import { vi } from "vitest";
import type { App } from "obsidian";
import {
  getFolderPathFromNativeNode,
  NativeFileExplorerPatch,
  NATIVE_BUNDLE_CHILDREN_CLASS,
  NATIVE_BUNDLE_ICON_CLASS,
  NATIVE_BUNDLE_TITLE_CLASS
} from "../src/obsidian/native-file-explorer-patch";
import type { BundleBadgeMode } from "../src/types";

vi.mock("obsidian", () => ({
  Platform: { isDesktopApp: true },
  setIcon: (parent: HTMLElement, iconId: string) => {
    parent.dataset.documentsBundleSetIcon = iconId;
  },
  TFolder: class TFolder {}
}));

describe("native file explorer folder path matching", () => {
  it("matches bundle folders only by complete native path attributes", () => {
    const bundlePaths = new Set(["Test", "asd/ascccc"]);

    expect(getFolderPathFromNativeNode(
      fakeElement({ "data-path": "Test" }),
      fakeElement({ textContent: "Test" }),
      bundlePaths
    )).toBe("Test");

    expect(getFolderPathFromNativeNode(
      fakeElement(),
      fakeElement({ textContent: "Test" }),
      bundlePaths
    )).toBeNull();
  });

  it("does not infer a nested folder path from a same-name bundle basename", () => {
    const bundlePaths = new Set(["Test"]);

    expect(getFolderPathFromNativeNode(
      fakeElement({ "data-path": "Note/Test" }),
      fakeElement({ textContent: "Test" }),
      bundlePaths
    )).toBeNull();
  });
});

describe("native file explorer bundle badge mode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  for (const mode of ["none", "icon", "bold", "text"] as const) {
    it(`marks bundle nodes with ${mode} badge mode`, () => {
      const child = new FakeNativeElement();
      const node = new FakeNativeElement(child);
      const title = new FakeNativeElement();
      const patch = fakePatch(mode);

      markBundleNode(patch, node.asElement(), title.asElement(), "Bundle");

      expect(title.dataset.documentsBundleBadge).toBe(mode);
      expect(title.dataset.documentsBundleLabel).toBe("Bundle");
      expect(title.classList.contains(NATIVE_BUNDLE_TITLE_CLASS)).toBe(true);
      expect(child.classList.contains(NATIVE_BUNDLE_CHILDREN_CLASS)).toBe(true);
      expect(getBundleIcon(title)?.dataset.documentsBundleSetIcon).toBe(mode === "icon" ? "package" : undefined);
      expect(getBundleIcon(title)?.classList.contains(NATIVE_BUNDLE_ICON_CLASS) ?? false).toBe(mode === "icon");
    });
  }

  it("removes the package icon when the badge mode changes away from icon", () => {
    const child = new FakeNativeElement();
    const node = new FakeNativeElement(child);
    const title = new FakeNativeElement();

    markBundleNode(fakePatch("icon"), node.asElement(), title.asElement(), "Bundle");
    expect(getBundleIcon(title)?.dataset.documentsBundleSetIcon).toBe("package");

    markBundleNode(fakePatch("text"), node.asElement(), title.asElement(), "Bundle");

    expect(title.dataset.documentsBundleBadge).toBe("text");
    expect(getBundleIcon(title)).toBeNull();
  });

  it("clears the badge mode when a node is unmarked", () => {
    const child = new FakeNativeElement();
    const node = new FakeNativeElement(child);
    const title = new FakeNativeElement();
    const patch = fakePatch("icon");

    markBundleNode(patch, node.asElement(), title.asElement(), "Bundle");
    unmarkBundleNode(patch, node.asElement(), title.asElement());

    expect(title.dataset.documentsBundleBadge).toBeUndefined();
    expect(title.dataset.documentsBundleLabel).toBeUndefined();
    expect(title.classList.contains(NATIVE_BUNDLE_TITLE_CLASS)).toBe(false);
    expect(child.classList.contains(NATIVE_BUNDLE_CHILDREN_CLASS)).toBe(false);
    expect(getBundleIcon(title)).toBeNull();
  });

  it("coalesces multiple scheduled refreshes into one animation frame", () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.stubGlobal("window", {
      requestAnimationFrame: (callback: FrameRequestCallback): number => {
        callbacks.push(callback);
        return callbacks.length;
      },
      cancelAnimationFrame: vi.fn()
    });
    const patch = fakePatch("icon");
    const refresh = vi.spyOn(patch, "refresh").mockImplementation(() => undefined);

    scheduleRefresh(patch);
    scheduleRefresh(patch);

    expect(callbacks).toHaveLength(1);
    callbacks[0](0);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("cancels a pending scheduled refresh when disabled", () => {
    const cancelAnimationFrame = vi.fn();
    vi.stubGlobal("window", {
      requestAnimationFrame: (): number => 42,
      cancelAnimationFrame
    });
    vi.stubGlobal("activeDocument", {
      querySelectorAll: () => []
    });
    const patch = fakePatch("icon");

    scheduleRefresh(patch);
    patch.disable();
    scheduleRefresh(patch);

    expect(cancelAnimationFrame).toHaveBeenCalledWith(42);
  });
});

function fakeElement(options: { textContent?: string } & Record<string, string | undefined> = {}): Element {
  const attributes = new Map(Object.entries(options).filter(([key, value]) => key !== "textContent" && value !== undefined) as Array<[string, string]>);

  return {
    getAttribute: (name: string) => attributes.get(name) ?? null,
    querySelector: () => null,
    textContent: options.textContent ?? ""
  } as unknown as Element;
}

function fakePatch(badgeMode: BundleBadgeMode): NativeFileExplorerPatch {
  return new NativeFileExplorerPatch({
    app: {
      workspace: {
        getActiveFile: () => ({ path: "Bundle/Bundle.md" })
      },
      vault: {
        getRoot: () => ({ children: [] })
      }
    } as unknown as App,
    attachmentFolderName: "assets",
    badgeMode,
    openBundle: async () => undefined,
    t: () => "Bundle"
  });
}

function markBundleNode(patch: NativeFileExplorerPatch, node: Element, title: Element, folderPath: string): void {
  (patch as unknown as {
    markBundleNode(node: Element, title: Element, folderPath: string): void;
  }).markBundleNode(node, title, folderPath);
}

function unmarkBundleNode(patch: NativeFileExplorerPatch, node: Element, title: Element): void {
  (patch as unknown as {
    unmarkBundleNode(node: Element, title: Element): void;
  }).unmarkBundleNode(node, title);
}

function scheduleRefresh(patch: NativeFileExplorerPatch): void {
  (patch as unknown as {
    scheduleRefresh(): void;
  }).scheduleRefresh();
}

class FakeNativeElement {
  readonly classList = new FakeClassList();
  readonly dataset: Record<string, string | undefined> = {};
  readonly ownerDocument = {
    createElement: () => new FakeNativeElement().asElement()
  };
  readonly children: FakeNativeElement[] = [];
  private readonly attributes = new Map<string, string>();
  private readonly listeners = new Map<string, EventListener>();
  private parent: FakeNativeElement | null = null;

  constructor(private readonly child: FakeNativeElement | null = null, attributes: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(attributes)) {
      this.attributes.set(key, value);
    }
    if (child) {
      child.parent = this;
      this.children.push(child);
    }
  }

  asElement(): Element {
    return this as unknown as Element;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  querySelector(selector: string): Element | null {
    if (selector.includes(NATIVE_BUNDLE_ICON_CLASS)) {
      return getBundleIcon(this)?.asElement() ?? null;
    }
    return this.child?.asElement() ?? null;
  }

  matches(): boolean {
    return false;
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string, listener: EventListener): void {
    if (this.listeners.get(type) === listener) {
      this.listeners.delete(type);
    }
  }

  appendChild(child: Element): Element {
    const fakeChild = child as unknown as FakeNativeElement;
    fakeChild.parent = this;
    this.children.push(fakeChild);
    return child;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  remove(): void {
    if (!this.parent) {
      return;
    }
    const index = this.parent.children.indexOf(this);
    if (index !== -1) {
      this.parent.children.splice(index, 1);
    }
    this.parent = null;
  }
}

function getBundleIcon(element: FakeNativeElement): FakeNativeElement | null {
  if (element.classList.contains(NATIVE_BUNDLE_ICON_CLASS)) {
    return element;
  }

  for (const child of element.children) {
    const match = getBundleIcon(child);
    if (match) {
      return match;
    }
  }
  return null;
}

class FakeClassList {
  private readonly tokens = new Set<string>();

  add(...tokens: string[]): void {
    for (const token of tokens) {
      this.tokens.add(token);
    }
  }

  remove(...tokens: string[]): void {
    for (const token of tokens) {
      this.tokens.delete(token);
    }
  }

  toggle(token: string, force?: boolean): boolean {
    if (force === undefined) {
      if (this.tokens.has(token)) {
        this.tokens.delete(token);
        return false;
      }
      this.tokens.add(token);
      return true;
    }

    if (force) {
      this.tokens.add(token);
    } else {
      this.tokens.delete(token);
    }
    return force;
  }

  contains(token: string): boolean {
    return this.tokens.has(token);
  }
}
