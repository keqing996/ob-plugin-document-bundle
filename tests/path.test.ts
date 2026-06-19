import { assertValidDocumentName, encodeMarkdownPath, sanitizeDocumentName } from "../src/core/path";

describe("vault path helpers", () => {
  it("keeps normal document names and sanitizes path separators", () => {
    expect(() => assertValidDocumentName("项目 Plan")).not.toThrow();
    expect(sanitizeDocumentName("Project:Plan/Brief")).toBe("Project-Plan-Brief");
  });

  it("rejects cross-platform unsafe document names", () => {
    for (const name of [".", "..", "CON", "aux.md", "Project.", "Project ", "Bad<Name", "Bad|Name", "Bad\u0000Name"]) {
      expect(() => assertValidDocumentName(name)).toThrow("Document name contains unsupported characters.");
    }
  });

  it("encodes markdown path segments without treating slashes as filename text", () => {
    expect(encodeMarkdownPath("assets/my file (100%).pdf")).toBe("assets/my%20file%20%28100%25%29.pdf");
  });
});
