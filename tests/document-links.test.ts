import { rewriteAttachmentLinksForMovedFile } from "../src/core/document-links";

describe("moved note attachment link rewrites", () => {
  it("rewrites only local attachment markdown links inside a moved note", () => {
    const result = rewriteAttachmentLinksForMovedFile({
      oldNotePath: "Work/Plan.md",
      newNotePath: "Work/Plan/Plan.md",
      content: "[Index](Index.md#Top) ![Cover](cover.png) [Manual](files/manual.pdf#page=2) [Spec](../Spec.md) [site](https://example.com)"
    });

    expect(result.updatedContent).toBe("[Index](Index.md#Top) ![Cover](../cover.png) [Manual](../files/manual.pdf#page=2) [Spec](../Spec.md) [site](https://example.com)");
    expect(result.replacements).toBe(2);
  });

  it("leaves wiki links and extensionless markdown links untouched", () => {
    const result = rewriteAttachmentLinksForMovedFile({
      oldNotePath: "Work/Plan.md",
      newNotePath: "Work/Plan/Plan.md",
      content: "[[Index]] [Route](local-route) ![[cover.png]]"
    });

    expect(result.updatedContent).toBe("[[Index]] [Route](local-route) ![[cover.png]]");
    expect(result.replacements).toBe(0);
  });

  it("does not rewrite migrated bundle asset targets a second time", () => {
    const result = rewriteAttachmentLinksForMovedFile({
      oldNotePath: "Work/Plan.md",
      newNotePath: "Work/Plan/Plan.md",
      content: "![Cover](./assets/cover.png) ![Loose](loose.tiff)",
      ignoredTargets: new Set(["./assets/cover.png"])
    });

    expect(result.updatedContent).toBe("![Cover](./assets/cover.png) ![Loose](../loose.tiff)");
    expect(result.replacements).toBe(1);
  });
});
