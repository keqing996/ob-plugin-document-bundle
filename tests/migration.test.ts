import { planAttachmentMigration, renderVaultAttachmentMigrationReport, summarizeVaultAttachmentMigration, validateVaultAttachmentMigration } from "../src/core/migration";
import type { BundleInfo } from "../src/types";

const bundle: BundleInfo = {
  folderPath: "Notes/Project",
  folderName: "Project",
  mainFilePath: "Notes/Project/Project.md",
  assetsFolderPath: "Notes/Project/assets"
};

describe("attachment migration", () => {
  it("plans markdown attachment moves and rewrites links to bundle assets", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shot](../Attachments/shot.png)\n[brief](brief.pdf)"
    });

    expect(plan.items).toEqual([
      {
        sourcePath: "Notes/Attachments/shot.png",
        targetPath: "Notes/Project/assets/shot.png",
        originalTarget: "../Attachments/shot.png",
        rewrittenTarget: "./assets/shot.png"
      },
      {
        sourcePath: "Notes/Project/brief.pdf",
        targetPath: "Notes/Project/assets/brief.pdf",
        originalTarget: "brief.pdf",
        rewrittenTarget: "./assets/brief.pdf"
      }
    ]);
    expect(plan.updatedContent).toBe("![shot](./assets/shot.png)\n[brief](./assets/brief.pdf)");
  });

  it("rewrites wiki attachment links to portable markdown links", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![[Images/chart.png|Chart]] and [[docs/spec.pdf]]"
    });

    expect(plan.items.map((item) => [item.sourcePath, item.targetPath])).toEqual([
      ["Images/chart.png", "Notes/Project/assets/chart.png"],
      ["docs/spec.pdf", "Notes/Project/assets/spec.pdf"]
    ]);
    expect(plan.updatedContent).toBe("![Chart](./assets/chart.png) and [spec.pdf](./assets/spec.pdf)");
  });

  it("skips remote urls anchors and already bundled assets", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![local](./assets/local.png)\n[web](https://example.com/a.pdf)\n[[#Heading]]"
    });

    expect(plan.items).toEqual([]);
    expect(plan.updatedContent).toBe("![local](./assets/local.png)\n[web](https://example.com/a.pdf)\n[[#Heading]]");
  });

  it("deduplicates repeated source files", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![a](../a.png)\n![again](../a.png)"
    });

    expect(plan.items).toHaveLength(1);
    expect(plan.updatedContent).toBe("![a](./assets/a.png)\n![again](./assets/a.png)");
  });

  it("avoids target filename collisions", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shot](../Attachments/shot.png)",
      existingTargetPaths: new Set(["Notes/Project/assets/shot.png"])
    });

    expect(plan.items[0].targetPath).toBe("Notes/Project/assets/shot-1.png");
    expect(plan.updatedContent).toBe("![shot](./assets/shot-1.png)");
  });

  it("summarizes vault migration reports", () => {
    const firstPlan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shot](../shot.png)"
    });
    const secondBundle: BundleInfo = {
      folderPath: "Notes/Done",
      folderName: "Done",
      mainFilePath: "Notes/Done/Done.md",
      assetsFolderPath: "Notes/Done/assets"
    };
    const secondPlan = planAttachmentMigration({
      bundle: secondBundle,
      notePath: "Notes/Done/Done.md",
      content: "No attachments here."
    });

    expect(summarizeVaultAttachmentMigration([
      { bundle, notePath: bundle.mainFilePath, plan: firstPlan },
      { bundle: secondBundle, notePath: secondBundle.mainFilePath, plan: secondPlan }
    ])).toMatchObject({
      bundlesScanned: 2,
      bundlesWithMigrations: 1,
      attachmentsToMove: 1
    });
  });

  it("marks duplicate source paths as shared before vault migration execution", () => {
    const firstPlan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shared](../shared.png)"
    });
    const secondBundle: BundleInfo = {
      folderPath: "Notes/Other",
      folderName: "Other",
      mainFilePath: "Notes/Other/Other.md",
      assetsFolderPath: "Notes/Other/assets"
    };
    const secondPlan = planAttachmentMigration({
      bundle: secondBundle,
      notePath: "Notes/Other/Other.md",
      content: "![shared](../shared.png)"
    });
    const summary = summarizeVaultAttachmentMigration([
      { bundle, notePath: bundle.mainFilePath, plan: firstPlan },
      { bundle: secondBundle, notePath: secondBundle.mainFilePath, plan: secondPlan }
    ]);

    expect(validateVaultAttachmentMigration(summary)).toEqual({
      errors: [],
      sharedSourcePaths: ["Notes/shared.png"],
      duplicateTargetPaths: []
    });
  });

  it("blocks duplicate target paths before vault migration execution", () => {
    const firstPlan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shared](../a/shot.png)"
    });
    const secondBundle: BundleInfo = {
      folderPath: "Notes/Other",
      folderName: "Other",
      mainFilePath: "Notes/Other/Other.md",
      assetsFolderPath: "Notes/Project/assets"
    };
    const secondPlan = planAttachmentMigration({
      bundle: secondBundle,
      notePath: "Notes/Other/Other.md",
      content: "![shared](../b/shot.png)"
    });
    const summary = summarizeVaultAttachmentMigration([
      { bundle, notePath: bundle.mainFilePath, plan: firstPlan },
      { bundle: secondBundle, notePath: secondBundle.mainFilePath, plan: secondPlan }
    ]);

    expect(validateVaultAttachmentMigration(summary)).toEqual({
      errors: ["Multiple attachments would be moved to the same target: Notes/Project/assets/shot.png"],
      sharedSourcePaths: [],
      duplicateTargetPaths: ["Notes/Project/assets/shot.png"]
    });
  });

  it("renders a markdown vault migration report", () => {
    const plan = planAttachmentMigration({
      bundle,
      notePath: "Notes/Project/Project.md",
      content: "![shot](../shot.png)"
    });
    const summary = summarizeVaultAttachmentMigration([
      { bundle, notePath: bundle.mainFilePath, plan }
    ]);

    expect(renderVaultAttachmentMigrationReport(summary)).toContain("# Documents Bundle Attachment Migration Report");
    expect(renderVaultAttachmentMigrationReport(summary)).toContain("- Bundles scanned: 1");
    expect(renderVaultAttachmentMigrationReport(summary)).toContain("| Notes/Project | Notes/shot.png | Notes/Project/assets/shot.png | ./assets/shot.png |");
  });
});
