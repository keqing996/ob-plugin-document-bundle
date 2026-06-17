import { incrementFilename, incrementName, joinVaultPath } from "./path";

export interface PathExistence {
  exists(path: string): Promise<boolean>;
}

export async function getAvailableDocumentName(fs: PathExistence, parentPath: string, preferredName: string): Promise<string> {
  for (let index = 0; index < 1000; index += 1) {
    const candidate = incrementName(preferredName, index);
    const candidatePath = joinVaultPath(parentPath, candidate);
    if (!(await fs.exists(candidatePath))) {
      return candidate;
    }
  }

  throw new Error(`Could not find an available document name for "${preferredName}".`);
}

export async function getAvailableFilename(fs: PathExistence, folderPath: string, preferredFilename: string): Promise<string> {
  for (let index = 0; index < 1000; index += 1) {
    const candidate = incrementFilename(preferredFilename, index);
    const candidatePath = joinVaultPath(folderPath, candidate);
    if (!(await fs.exists(candidatePath))) {
      return candidate;
    }
  }

  throw new Error(`Could not find an available filename for "${preferredFilename}".`);
}

