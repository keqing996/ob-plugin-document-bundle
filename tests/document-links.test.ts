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
});
