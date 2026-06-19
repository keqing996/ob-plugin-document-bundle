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

  it("encodes attachment paths that would break markdown destinations", () => {
    expect(createAttachmentMarkdownLink({ attachmentFolderName: "assets", filename: "my file (final%).pdf" }))
      .toBe("[my file (final%).pdf](./assets/my%20file%20%28final%25%29.pdf)");
  });
});
