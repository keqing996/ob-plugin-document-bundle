import { rewriteDocumentLinks } from "../src/core/document-links";

describe("document link rewrites", () => {
  it("rewrites markdown links to moved bundle main documents", () => {
    const result = rewriteDocumentLinks({
      notePath: "Work/Index.md",
      content: "[Plan](Plan.md) and [Other](Other.md)",
      moves: [{ oldPath: "Work/Plan.md", newPath: "Work/Plan/Plan.md" }]
    });

    expect(result).toEqual({
      updatedContent: "[Plan](./Plan/Plan.md) and [Other](Other.md)",
      replacements: 1
    });
  });

  it("rewrites markdown links from nested notes using relative paths", () => {
    const result = rewriteDocumentLinks({
      notePath: "Work/Notes/Index.md",
      content: "[Plan](../Plan.md)",
      moves: [{ oldPath: "Work/Plan.md", newPath: "Work/Plan/Plan.md" }]
    });

    expect(result.updatedContent).toBe("[Plan](../Plan/Plan.md)");
  });

  it("rewrites wiki links and preserves aliases", () => {
    const result = rewriteDocumentLinks({
      notePath: "Work/Index.md",
      content: "[[Plan|Project plan]] and [[Other]]",
      moves: [{ oldPath: "Work/Plan.md", newPath: "Work/Plan/Plan.md" }]
    });

    expect(result.updatedContent).toBe("[[Work/Plan/Plan|Project plan]] and [[Other]]");
    expect(result.replacements).toBe(1);
  });

  it("matches basename wiki links", () => {
    const result = rewriteDocumentLinks({
      notePath: "Index.md",
      content: "[[Plan]]",
      moves: [{ oldPath: "Work/Plan.md", newPath: "Work/Plan/Plan.md" }]
    });

    expect(result.updatedContent).toBe("[[Work/Plan/Plan]]");
  });

  it("skips attachments urls anchors and embeds", () => {
    const result = rewriteDocumentLinks({
      notePath: "Work/Index.md",
      content: "![Plan](Plan.md) [site](https://example.com/Plan.md) [[image.png]] [[#Heading]]",
      moves: [{ oldPath: "Work/Plan.md", newPath: "Work/Plan/Plan.md" }]
    });

    expect(result).toEqual({
      updatedContent: "![Plan](Plan.md) [site](https://example.com/Plan.md) [[image.png]] [[#Heading]]",
      replacements: 0
    });
  });
});

