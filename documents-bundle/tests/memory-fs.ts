import type { BundleFileSystem } from "../src/core/operations";
import { dirname, joinVaultPath } from "../src/core/path";

type Node = { type: "folder"; children: Map<string, Node> } | { type: "file"; content: string };

export class MemoryBundleFileSystem implements BundleFileSystem {
  private readonly root: Node = { type: "folder", children: new Map() };

  async exists(path: string): Promise<boolean> {
    return this.get(path) !== null;
  }

  async createFolder(path: string): Promise<void> {
    const normalized = joinVaultPath(path);
    if (normalized.length === 0) {
      return;
    }

    const parent = this.ensureFolder(dirname(normalized));
    const name = normalized.split("/").pop();
    if (!name) {
      return;
    }

    if (parent.children.has(name)) {
      throw new Error(`Path already exists: ${path}`);
    }

    parent.children.set(name, { type: "folder", children: new Map() });
  }

  async createTextFile(path: string, content: string): Promise<void> {
    const normalized = joinVaultPath(path);
    const parent = this.ensureFolder(dirname(normalized));
    const name = normalized.split("/").pop();
    if (!name) {
      throw new Error(`Invalid path: ${path}`);
    }

    if (parent.children.has(name)) {
      throw new Error(`Path already exists: ${path}`);
    }

    parent.children.set(name, { type: "file", content });
  }

  async readTextFile(path: string): Promise<string> {
    const node = this.get(path);
    if (!node || node.type !== "file") {
      throw new Error(`Cannot read file: ${path}`);
    }

    return node.content;
  }

  async writeTextFile(path: string, content: string): Promise<void> {
    const node = this.get(path);
    if (!node || node.type !== "file") {
      throw new Error(`Cannot write file: ${path}`);
    }

    node.content = content;
  }

  async rename(path: string, newPath: string): Promise<void> {
    const normalized = joinVaultPath(path);
    const target = joinVaultPath(newPath);
    const sourceParent = this.ensureFolder(dirname(normalized));
    const targetParent = this.ensureFolder(dirname(target));
    const sourceName = normalized.split("/").pop();
    const targetName = target.split("/").pop();
    if (!sourceName || !targetName) {
      throw new Error("Invalid rename path.");
    }

    const node = sourceParent.children.get(sourceName);
    if (!node) {
      throw new Error(`Cannot rename missing path: ${path}`);
    }
    if (targetParent.children.has(targetName)) {
      throw new Error(`Target already exists: ${newPath}`);
    }

    sourceParent.children.delete(sourceName);
    targetParent.children.set(targetName, node);
  }

  async copyFolder(sourcePath: string, targetPath: string): Promise<void> {
    const source = this.get(sourcePath);
    if (!source || source.type !== "folder") {
      throw new Error(`Cannot copy non-folder: ${sourcePath}`);
    }

    const targetParent = this.ensureFolder(dirname(targetPath));
    const targetName = joinVaultPath(targetPath).split("/").pop();
    if (!targetName) {
      throw new Error("Invalid target path.");
    }
    if (targetParent.children.has(targetName)) {
      throw new Error(`Target already exists: ${targetPath}`);
    }

    targetParent.children.set(targetName, cloneNode(source));
  }

  async delete(path: string): Promise<void> {
    const normalized = joinVaultPath(path);
    const parent = this.ensureFolder(dirname(normalized));
    const name = normalized.split("/").pop();
    if (!name || !parent.children.delete(name)) {
      throw new Error(`Cannot delete missing path: ${path}`);
    }
  }

  list(path = ""): string[] {
    const folder = this.ensureFolder(path);
    return [...folder.children.keys()].sort();
  }

  private get(path: string): Node | null {
    const normalized = joinVaultPath(path);
    if (normalized.length === 0) {
      return this.root;
    }

    let current: Node = this.root;
    for (const part of normalized.split("/")) {
      if (current.type !== "folder") {
        return null;
      }
      const child = current.children.get(part);
      if (!child) {
        return null;
      }
      current = child;
    }

    return current;
  }

  private ensureFolder(path: string): Extract<Node, { type: "folder" }> {
    const node = this.get(path);
    if (!node || node.type !== "folder") {
      throw new Error(`Missing folder: ${path || "/"}`);
    }

    return node;
  }
}

function cloneNode(node: Node): Node {
  if (node.type === "file") {
    return { type: "file", content: node.content };
  }

  return {
    type: "folder",
    children: new Map([...node.children.entries()].map(([key, value]) => [key, cloneNode(value)]))
  };
}
