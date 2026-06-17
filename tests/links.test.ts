import { createAttachmentMarkdownLink } from "../src/core/links";

describe("attachment links", () => {
  it("creates image embeds for image files", () => {
    expect(createAttachmentMarkdownLink({ attachmentFolderName: "assets", filename: "file.png" }))
      .toBe("![](./assets/file.png)");
  });

  it("creates regular markdown links for non-image files", () => {
    expect(createAttachmentMarkdownLink({ attachmentFolderName: "assets", filename: "brief.pdf" }))
      .toBe("[brief.pdf](./assets/brief.pdf)");
  });

  it("keeps readable paths with spaces", () => {
    expect(createAttachmentMarkdownLink({ attachmentFolderName: "assets", filename: "my file.pdf" }))
      .toBe("[my file.pdf](./assets/my file.pdf)");
  });
});

