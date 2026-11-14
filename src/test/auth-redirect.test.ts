import { describe, expect, it } from "vitest";
import { safeAccountPath } from "@/lib/auth-redirect";

describe("account destinations after public root launch", () => {
  it.each([
    undefined,
    "/",
    "https://evil.example/recipes",
    "//evil.example",
    "/auth",
    "/auth?redirect=/recipes",
    "/reset-password?mode=invite",
  ])("sends %s to the private workbench", (input) => {
    expect(safeAccountPath(input, "https://brew.lowcasebrewing.com")).toBe("/workbench");
  });
  it("preserves an intended private page and its search", () => {
    expect(safeAccountPath("/recipes/abc?tab=notes", "https://brew.lowcasebrewing.com")).toBe(
      "/recipes/abc?tab=notes",
    );
  });
});
